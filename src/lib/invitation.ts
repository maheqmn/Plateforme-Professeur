import crypto from "node:crypto";
import type { Invitation } from "@prisma/client";
import { prisma } from "./db";

// Alphabet sans caractères ambigus (pas de I, O, 0, 1) : F1.4, saisie facilitée.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genererCodeInvitation(): string {
  const octets = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[octets[i] % ALPHABET.length];
  }
  return code;
}

export type VerificationInvitation =
  | { ok: true; invitation: Invitation }
  | { ok: false; erreur: string };

export async function verifierInvitation(codeBrut: string): Promise<VerificationInvitation> {
  const code = codeBrut.trim().toUpperCase();
  if (!code) {
    return { ok: false, erreur: "Veuillez saisir votre code d'invitation." };
  }
  const invitation = await prisma.invitation.findUnique({ where: { code } });
  if (!invitation) {
    return { ok: false, erreur: "L'invitation saisie n'est pas valide. Vérifiez les caractères." };
  }
  if (invitation.revoquee) {
    return { ok: false, erreur: "Cette invitation a été révoquée. Contactez votre professeur." };
  }
  if (invitation.utilisee) {
    return { ok: false, erreur: "Cette invitation a déjà été utilisée. Contactez votre professeur." };
  }
  if (invitation.expireLe.getTime() < Date.now()) {
    return { ok: false, erreur: "Cette invitation a expiré. Contactez votre professeur." };
  }
  return { ok: true, invitation };
}

export type StatutInvitation = "attente" | "utilisee" | "expiree" | "revoquee";

export function statutInvitation(invitation: Invitation): StatutInvitation {
  if (invitation.revoquee) return "revoquee";
  if (invitation.utilisee) return "utilisee";
  if (invitation.expireLe.getTime() < Date.now()) return "expiree";
  return "attente";
}

// F1.3 / F6.3 : durée de validité des invitations, paramétrable par le professeur.
export async function dureeValiditeInvitation(): Promise<number> {
  const parametre = await prisma.setting.findUnique({ where: { key: "invitationDureeJours" } });
  const jours = parametre ? parseInt(parametre.value, 10) : 2;
  return Number.isFinite(jours) && jours >= 1 ? jours : 2;
}
