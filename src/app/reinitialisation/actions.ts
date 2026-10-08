"use server";

import { prisma } from "@/lib/db";
import { hasherMotDePasse, validerMotDePasse } from "@/lib/password";
import { redirect } from "next/navigation";

export type EtatReinitialisation = { erreur?: string };

export async function reinitialiserAction(
  _etat: EtatReinitialisation,
  formData: FormData
): Promise<EtatReinitialisation> {
  const token = String(formData.get("token") ?? "");
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const demande = await prisma.passwordReset.findFirst({
    where: { token, utiliseLe: null, expireLe: { gt: new Date() } },
  });
  if (!demande) {
    return { erreur: "Ce lien n'est plus valable. Demandez un nouveau lien sur la page « Mot de passe oublié »." };
  }

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe saisis ne sont pas identiques." };
  }

  const erreurMotDePasse = validerMotDePasse(motDePasse);
  if (erreurMotDePasse) {
    return { erreur: erreurMotDePasse };
  }

  await prisma.user.update({
    where: { id: demande.userId },
    data: { passwordHash: await hasherMotDePasse(motDePasse) },
  });
  await prisma.passwordReset.update({ where: { id: demande.id }, data: { utiliseLe: new Date() } });
  // Toutes les sessions existantes sont coupées après un changement de mot de passe.
  await prisma.session.deleteMany({ where: { userId: demande.userId } });

  redirect("/connexion?reinitialise=1");
}
