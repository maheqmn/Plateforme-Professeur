"use server";

import { redirect } from "next/navigation";
import { detruireSession, getSessionUser } from "@/lib/session";

export async function deconnexionAction(): Promise<void> {
  await detruireSession();
  redirect("/connexion");
}

// F1.7 : prolonge la session côté serveur (expiration glissante) quand
// l'utilisateur clique sur « Rester connecté » dans le bandeau d'avertissement.
export async function prolongerSessionAction(): Promise<void> {
  await getSessionUser();
}
