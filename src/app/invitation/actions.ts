"use server";

import { redirect } from "next/navigation";
import { verifierInvitation } from "@/lib/invitation";

export type EtatInvitation = { erreur?: string };

export async function validerInvitationAction(_etat: EtatInvitation, formData: FormData): Promise<EtatInvitation> {
  const code = String(formData.get("code") ?? "");
  const verification = await verifierInvitation(code);
  if (!verification.ok) {
    return { erreur: verification.erreur };
  }
  redirect(`/inscription?invitation=${encodeURIComponent(verification.invitation.code)}`);
}
