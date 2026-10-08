"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { envoyerEmail } from "@/lib/email";
import { enregistrerFichier, supprimerDuDisque, TAILLE_MAX_FICHIER } from "@/lib/fichiers";

async function origine(): Promise<string> {
  const entetes = await headers();
  const proto = entetes.get("x-forwarded-proto") ?? "http";
  const hote = entetes.get("host") ?? "localhost:3000";
  return proto + "://" + hote;
}

// F4.4 : suppression de son propre message possible dans les 5 minutes.
const DELAI_SUPPRESSION_MS = 5 * 60 * 1000;

export type EtatMessage = { erreur?: string; message?: string };

// F4.4 : envoi de texte et pièces jointes (images, PDF, 10 Mo maximum par
// fichier, plusieurs fichiers d'un coup). F4.1 : un élève écrit uniquement
// dans sa conversation ; le professeur dans celle de l'élève visé.
export async function envoyerMessageAction(
  _etat: EtatMessage,
  formData: FormData
): Promise<EtatMessage> {
  const utilisateur = await getSessionUser();
  if (!utilisateur) return { erreur: "Action non autorisée." };
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const eleveId = String(formData.get("eleveId") ?? "");
  if (estProfesseur) {
    const eleve = await prisma.user.findFirst({
      where: { id: eleveId, role: "ELEVE" },
    });
    if (!eleve) return { erreur: "Conversation introuvable." };
  } else {
    // F4.1 : aucune communication entre élèves, l'élève n'écrit que pour lui.
    if (eleveId !== utilisateur.id) return { erreur: "Action non autorisée." };
  }

  const texte = String(formData.get("texte") ?? "").trim();
  const televerses = formData
    .getAll("fichier")
    .filter((element): element is File => element instanceof File && element.size > 0);
  if (!texte && televerses.length === 0) {
    return { erreur: "Écrivez un message ou joignez un fichier avant d'envoyer." };
  }

  const problemes: string[] = [];
  for (const fichier of televerses) {
    if (fichier.size > TAILLE_MAX_FICHIER) {
      problemes.push("« " + fichier.name + " » dépasse la taille maximale de 10 Mo.");
    }
  }
  if (problemes.length > 0) {
    return { erreur: "Non envoyés : " + problemes.join(" ") };
  }

  const message = await prisma.message.create({
    data: { texte, auteurId: utilisateur.id, eleveId },
  });
  for (const fichier of televerses) {
    const donnees = new Uint8Array(await fichier.arrayBuffer());
    const nomStocke = await enregistrerFichier(fichier.name, donnees);
    await prisma.fichier.create({
      data: { nom: fichier.name, nomStocke, taille: fichier.size, messageId: message.id },
    });
  }

  revalidatePath("/messages");
  if (estProfesseur) revalidatePath("/messages/" + eleveId);

  // F4.5 : email au destinataire avec un lien direct vers la conversation.
  const destinataire = estProfesseur
    ? await prisma.user.findUnique({ where: { id: eleveId } })
    : await prisma.user.findFirst({ where: { role: "PROFESSEUR" } });
  if (destinataire) {
    const lien = (await origine()) + (estProfesseur ? "/messages" : "/messages/" + utilisateur.id);
    await envoyerEmail({
      to: destinataire.email,
      subject: "Nouveau message sur la plateforme",
      text:
        "Bonjour,\n\nVous avez reçu un nouveau message :\n\n" +
        (texte || "(fichiers joints)") +
        "\n\nOuvrez votre conversation : " + lien + "\n\nÀ très bientôt !",
    });
  }

  return { message: "Message envoyé." };
}

// F4.4 / F4.6 : suppression avec confirmation côté client. Un message se
// supprime par son auteur dans les 5 minutes ; le professeur peut supprimer
// n'importe quel message d'un élève (modération).
export async function supprimerMessageAction(formData: FormData): Promise<void> {
  const utilisateur = await getSessionUser();
  if (!utilisateur) return;
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const id = String(formData.get("id") ?? "");
  const message = await prisma.message.findUnique({ where: { id }, include: { fichiers: true } });
  if (!message) return;

  const parSonAuteur = message.auteurId === utilisateur.id;
  const dansLeDelai = Date.now() - message.creeLe.getTime() <= DELAI_SUPPRESSION_MS;
  const moderable = estProfesseur && !parSonAuteur;

  if (!((parSonAuteur && dansLeDelai) || moderable)) return;

  await prisma.message.delete({ where: { id } });
  for (const fichier of message.fichiers) {
    await supprimerDuDisque(fichier.nomStocke);
  }
  revalidatePath("/messages");
  if (estProfesseur) revalidatePath("/messages/" + message.eleveId);
}
