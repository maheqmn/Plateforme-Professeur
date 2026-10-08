import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./db";

const NOM_COOKIE = "session";
const DUREE_INACTIVITE_MS = 30 * 60 * 1000; // F1.7 : déconnexion après 30 min d'inactivité
const DUREE_RESTER_CONNECTE_MS = 30 * 24 * 60 * 60 * 1000; // F1.7 : 30 jours

function empreinteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function creerSession(userId: string, resterConnecte: boolean): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const duree = resterConnecte ? DUREE_RESTER_CONNECTE_MS : DUREE_INACTIVITE_MS;
  await prisma.session.create({
    data: {
      tokenHash: empreinteToken(token),
      userId,
      rememberMe: resterConnecte,
      expireLe: new Date(Date.now() + duree),
    },
  });
  const store = await cookies();
  store.set(NOM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(resterConnecte ? { maxAge: DUREE_RESTER_CONNECTE_MS / 1000 } : {}),
  });
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(NOM_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: empreinteToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expireLe.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (!session.user.actif) {
    // F1.8 : compte révoqué -> toutes les sessions sont coupées immédiatement.
    await prisma.session.deleteMany({ where: { userId: session.userId } });
    return null;
  }

  // F1.7 : expiration glissante, la session se prolonge à chaque activité.
  const duree = session.rememberMe ? DUREE_RESTER_CONNECTE_MS : DUREE_INACTIVITE_MS;
  await prisma.session.update({
    where: { id: session.id },
    data: { expireLe: new Date(Date.now() + duree) },
  });

  return session.user;
}

// F1.7 : le bandeau d'avertissement ne concerne que les sessions sans
// "Rester connecté" (30 minutes d'inactivité).
export async function detailsSession(): Promise<{ rememberMe: boolean } | null> {
  const store = await cookies();
  const token = store.get(NOM_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: empreinteToken(token) },
    select: { rememberMe: true },
  });
  return session;
}

export async function detruireSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(NOM_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: empreinteToken(token) } });
  }
  store.delete(NOM_COOKIE);
}

// Connexion réussie : remise à zéro des échecs, traçabilité (F1.9), création de session.
export async function marquerConnexionReussie(userId: string, resterConnecte: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tentativesEchouees: 0, verrouilleJusqua: null, derniereConnexion: new Date() },
  });
  await prisma.loginEvent.create({ data: { userId } });
  await creerSession(userId, resterConnecte);
}
