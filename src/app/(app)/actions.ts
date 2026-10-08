"use server";

import { redirect } from "next/navigation";
import { detruireSession } from "@/lib/session";

export async function deconnexionAction(): Promise<void> {
  await detruireSession();
  redirect("/connexion");
}
