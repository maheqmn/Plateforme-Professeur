"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { envoyerEmail } from "@/lib/email";
import { dureeValiditeInvitation, genererCodeInvitation } from "@/lib/invitation";

async function exigerProfesseur() {
  const utilisateur = await getSessionUser();
  if (!utilisateur || utilisateur.role !== "PROFESSEUR") return null;
  return utilisateur;
}

async function origine(): Promise<string> {
  const entetes = await headers();
  const proto = entetes.get("x-forwarded-proto") ?? "http";
  const hote = entetes.get("host") ?? "localhost:3000";
  return proto + "://" + hote;
}

export type EtatCreation = { erreur?: string; code?: string; lien?: string; expireLe?: string };

export async function creerInvitationAction(
  _etat: EtatCreation,
  formData: FormData
): Promise<EtatCreation> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const emailInvite = String(formData.get("emailInvite") ?? "").trim().toLowerCase() || null;
  const jours = await dureeValiditeInvitation();
  const code = genererCodeInvitation();
  const expireLe = new Date(Date.now() + jours * 24 * 60 * 60 * 1000);

  await prisma.invitation.create({
    data: { code, expireLe, createdById: professeur.id, emailInvite },
  });

  const lien = (await origine()) + "/invitation?code=" + code;

  if (emailInvite) {
    await envoyerEmail({
      to: emailInvite,
      subject: "Votre invitation à rejoindre la plateforme",
      text:
        "Bonjour,\n\nVotre professeur vous invite à rejoindre sa plateforme de cours.\n\n" +
        "Étape 1 : ouvrez ce lien (ou saisissez ce code sur la page d'invitation) :\n" +
        "Lien : " + lien + "\n" +
        "Code : " + code + "\n\n" +
        "Étape 2 : créez votre compte avec votre prénom, votre nom, votre email et un mot de passe.\n\n" +
        "Cette invitation est valable " + jours + " jour(s), jusqu'au " +
        expireLe.toLocaleString("fr-FR") + ".\n\nÀ très bientôt !",
    });
  }

  revalidatePath("/admin");
  return { code, lien, expireLe: expireLe.toLocaleString("fr-FR") };
}

export async function revoquerInvitationAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  // Une invitation déjà utilisée ne peut pas être révoquée.
  await prisma.invitation.updateMany({ where: { id, utilisee: false }, data: { revoquee: true } });
  revalidatePath("/admin");
}

export async function basculerEleveAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const eleve = await prisma.user.findUnique({ where: { id } });
  if (!eleve || eleve.role !== "ELEVE") return;

  const actif = !eleve.actif;
  await prisma.user.update({ where: { id }, data: { actif } });
  if (!actif) {
    // F1.8 : la désactivation coupe immédiatement toutes les sessions de l'élève.
    await prisma.session.deleteMany({ where: { userId: id } });
  }
  revalidatePath("/admin");
}

export type EtatParametres = { erreur?: string; message?: string };

export async function parametresAction(_etat: EtatParametres, formData: FormData): Promise<EtatParametres> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const jours = parseInt(String(formData.get("invitationDureeJours") ?? ""), 10);
  if (!Number.isFinite(jours) || jours < 1 || jours > 30) {
    return { erreur: "La durée de validité doit être un nombre de jours entre 1 et 30." };
  }

  await prisma.setting.upsert({
    where: { key: "invitationDureeJours" },
    update: { value: String(jours) },
    create: { key: "invitationDureeJours", value: String(jours) },
  });
  revalidatePath("/admin");
  return { message: "Paramètres enregistrés." };
}
