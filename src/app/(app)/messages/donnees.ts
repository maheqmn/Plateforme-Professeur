import { prisma } from "@/lib/db";
import type { MessageAffiche } from "./conversation";

// F4.4 : fenêtre de suppression de son propre message (5 minutes).
export const DELAI_SUPPRESSION_MS = 5 * 60 * 1000;

// Charge une conversation et la prépare pour l'affichage : côté expéditeur à
// droite, suppression permise selon F4.4 (5 minutes) et F4.6 (modération).
export async function chargerConversation(
  eleveId: string,
  utilisateurId: string,
  estProfesseur: boolean
): Promise<MessageAffiche[]> {
  const messages = await prisma.message.findMany({
    where: { eleveId },
    orderBy: { creeLe: "asc" },
    include: { fichiers: true },
  });
  const maintenant = Date.now();
  return messages.map((message) => {
    const deMoi = message.auteurId === utilisateurId;
    const parSonAuteurDansLeDelai =
      deMoi && maintenant - message.creeLe.getTime() <= DELAI_SUPPRESSION_MS;
    return {
      id: message.id,
      texte: message.texte,
      deMoi,
      suppressible: parSonAuteurDansLeDelai || (estProfesseur && !deMoi),
      fichiers: message.fichiers.map((f) => ({ id: f.id, nom: f.nom })),
    };
  });
}

// F4.5 : marque comme lus les messages reçus dans cette conversation.
export async function marquerLus(eleveId: string, utilisateurId: string): Promise<void> {
  await prisma.message.updateMany({
    where: { eleveId, luLe: null, NOT: { auteurId: utilisateurId } },
    data: { luLe: new Date() },
  });
}
