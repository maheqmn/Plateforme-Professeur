"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { envoyerEmail } from "@/lib/email";

export type EtatDemande = { erreur?: string; message?: string };

export async function demanderReinitialisationAction(
  _etat: EtatDemande,
  formData: FormData
): Promise<EtatDemande> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { erreur: "Veuillez saisir votre adresse email." };
  }

  const utilisateur = await prisma.user.findUnique({ where: { email } });
  if (utilisateur) {
    // F1.6 : lien de réinitialisation valable 1 heure.
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: { token, userId: utilisateur.id, expireLe: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const entetes = await headers();
    const origine = (entetes.get("x-forwarded-proto") ?? "http") + "://" + (entetes.get("host") ?? "localhost:3000");
    const lien = origine + "/reinitialisation?token=" + token;
    await envoyerEmail({
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      text:
        "Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n" +
        lien +
        "\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    });
  }

  // Message identique que le compte existe ou non : pas d'indication à un visiteur.
  return { message: "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé. Le lien est valable 1 heure." };
}
