"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifierMotDePasse } from "@/lib/password";
import { marquerConnexionReussie } from "@/lib/session";
import { envoyerEmail } from "@/lib/email";

export type EtatConnexion = { erreur?: string };

// Exigence 8.2 : verrouillage temporaire après 5 échecs.
const MAX_ECHECS = 5;
const DUREE_VERROU_MS = 15 * 60 * 1000;

export async function connexionAction(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const resterConnecte = formData.get("resterConnecte") === "on";
  const espaceProfesseur = formData.get("espace") === "professeur";

  if (!email || !motDePasse) {
    return { erreur: "Veuillez saisir votre adresse email et votre mot de passe." };
  }

  const utilisateur = await prisma.user.findUnique({ where: { email } });
  if (!utilisateur) {
    return { erreur: "Adresse email ou mot de passe incorrect." };
  }

  if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua.getTime() > Date.now()) {
    return { erreur: "Trop de tentatives. Votre compte est temporairement verrouillé, réessayez dans quelques minutes." };
  }

  const motDePasseValide = await verifierMotDePasse(motDePasse, utilisateur.passwordHash);
  if (!motDePasseValide) {
    const echecs = utilisateur.tentativesEchouees + 1;
    await prisma.user.update({
      where: { id: utilisateur.id },
      data: {
        tentativesEchouees: echecs,
        verrouilleJusqua: echecs >= MAX_ECHECS ? new Date(Date.now() + DUREE_VERROU_MS) : utilisateur.verrouilleJusqua,
      },
    });
    await prisma.loginEvent.create({ data: { userId: utilisateur.id, succes: false } });
    return { erreur: "Adresse email ou mot de passe incorrect." };
  }

  if (!utilisateur.actif) {
    return { erreur: "Votre accès a été retiré. Contactez votre professeur." }; // F1.8
  }

  if (espaceProfesseur && utilisateur.role !== "PROFESSEUR") {
    return { erreur: "Ce compte n'est pas un compte professeur. Utilisez la connexion habituelle." };
  }

  if (utilisateur.role === "PROFESSEUR") {
    // F1.5 : double authentification par email (code à 6 chiffres, valable 10 minutes).
    const code = String(crypto.randomInt(100000, 1000000));
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.twoFactorCode.create({
      data: {
        token,
        codeHash: await bcrypt.hash(code, 10),
        userId: utilisateur.id,
        expireLe: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await envoyerEmail({
      to: utilisateur.email,
      subject: "Votre code de connexion",
      text:
        "Bonjour,\n\nVotre code de connexion à 6 chiffres est : " +
        code +
        "\n\nIl est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    });
    const store = await cookies();
    store.set("verification2fa", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    redirect("/connexion/verification");
  }

  await marquerConnexionReussie(utilisateur.id, resterConnecte);
  redirect("/");
}
