import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { envoyerEmail } from "../src/lib/email";

// F5.5 : rappel envoyé aux deux parties 24 heures avant le rendez-vous.
// À exécuter périodiquement (cron horaire en production) :
//   npm run rappels
// Le champ rappelEnvoyeLe garantit l'unicité de l'envoi.
// L'envoi passe par src/lib/email.ts (Brevo en production, console sinon).

const prisma = new PrismaClient();

function formater(date: Date): string {
  return date.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

async function main() {
  const maintenant = Date.now();
  const dans25h = maintenant + 25 * 60 * 60 * 1000;
  const dans23h = maintenant + 23 * 60 * 60 * 1000;

  // Rendez-vous dans environ 24 heures, rappel pas encore envoyé.
  const rdvs = await prisma.rendezVous.findMany({
    where: {
      rappelEnvoyeLe: null,
      debut: { gte: new Date(dans23h), lte: new Date(dans25h) },
    },
    include: { eleve: true },
  });

  const professeur = await prisma.user.findFirst({ where: { role: "PROFESSEUR", actif: true } });
  let envoyes = 0;

  for (const rdv of rdvs) {
    const quand = formater(rdv.debut);
    const texte =
      "Bonjour,\n\nRappel : votre rendez-vous a lieu " + quand +
      (rdv.motif ? " (" + rdv.motif + ")" : "") + ".\n" +
      (rdv.lienTeams ? "\nLien Microsoft Teams : " + rdv.lienTeams + "\n" : "") +
      "\nÀ très bientôt !";

    await envoyerEmail({ to: rdv.eleve.email, subject: "Rappel : votre rendez-vous " + quand, text: texte });
    if (professeur) {
      await envoyerEmail({
        to: professeur.email,
        subject: "Rappel : rendez-vous avec " + rdv.eleve.prenom + " " + rdv.eleve.nom + " " + quand,
        text: "Rendez-vous avec " + rdv.eleve.prenom + " " + rdv.eleve.nom + ".\n\n" + texte,
      });
    }
    await prisma.rendezVous.update({
      where: { id: rdv.id },
      data: { rappelEnvoyeLe: new Date() },
    });
    envoyes++;
  }

  console.log("Rappels envoyés : " + envoyes);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
