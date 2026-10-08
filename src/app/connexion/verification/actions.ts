"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { marquerConnexionReussie } from "@/lib/session";

export type EtatVerification = { erreur?: string };

export async function verificationAction(_etat: EtatVerification, formData: FormData): Promise<EtatVerification> {
  const code = String(formData.get("code") ?? "").trim();
  const store = await cookies();
  const token = store.get("verification2fa")?.value;
  if (!token) redirect("/connexion");

  const enregistrement = await prisma.twoFactorCode.findFirst({
    where: { token, consommeLe: null, expireLe: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!enregistrement) {
    return { erreur: "Ce code n'est plus valable. Reconnectez-vous pour recevoir un nouveau code." };
  }

  if (!/^\d{6}$/.test(code)) {
    return { erreur: "Veuillez saisir le code à 6 chiffres reçu par email." };
  }

  const codeValide = await bcrypt.compare(code, enregistrement.codeHash);
  if (!codeValide) {
    return { erreur: "Le code saisi est incorrect. Vérifiez les chiffres." };
  }

  await prisma.twoFactorCode.update({ where: { id: enregistrement.id }, data: { consommeLe: new Date() } });
  store.delete("verification2fa");
  await marquerConnexionReussie(enregistrement.userId, false);
  redirect("/");
}
