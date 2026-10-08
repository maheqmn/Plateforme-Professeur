"use server";

import { prisma } from "@/lib/db";
import { hasherMotDePasse, validerMotDePasse } from "@/lib/password";
import { verifierInvitation } from "@/lib/invitation";
import { marquerConnexionReussie } from "@/lib/session";
import { redirect } from "next/navigation";

export type EtatInscription = { erreur?: string };

export async function inscriptionAction(_etat: EtatInscription, formData: FormData): Promise<EtatInscription> {
  const code = String(formData.get("invitation") ?? "");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const verification = await verifierInvitation(code);
  if (!verification.ok) {
    return { erreur: verification.erreur };
  }

  if (!prenom || !nom || !email) {
    return { erreur: "Veuillez remplir tous les champs." };
  }

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe saisis ne sont pas identiques." };
  }

  const erreurMotDePasse = validerMotDePasse(motDePasse);
  if (erreurMotDePasse) {
    return { erreur: erreurMotDePasse };
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return { erreur: "Un compte existe déjà avec cette adresse email. Essayez de vous connecter." };
  }

  const utilisateur = await prisma.user.create({
    data: {
      prenom,
      nom,
      email,
      passwordHash: await hasherMotDePasse(motDePasse),
      role: "ELEVE",
    },
  });

  // F1.2 : invitation à usage unique.
  await prisma.invitation.update({
    where: { code: verification.invitation.code },
    data: { utilisee: true, usedById: utilisateur.id },
  });

  await marquerConnexionReussie(utilisateur.id, false);
  redirect("/");
}
