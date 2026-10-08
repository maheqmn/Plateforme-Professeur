import { prisma } from "@/lib/db";
import { envoyerEmail } from "@/lib/email";
import type { Cours } from "@prisma/client";

// Phase 5 (F5) : logique de calendrier. Toutes les dates sont manipulées en
// heure locale du serveur (Europe/Paris en production visée).

// ---------- Manipulation de dates locales ----------

// Clé de jour "YYYY-MM-DD", indépendante du fuseau horaire.
export function cleDate(date: Date): string {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return a + "-" + m + "-" + j;
}

// Reconstruit une date locale à partir d'une clé "YYYY-MM-DD" et de minutes.
export function depuisCle(cle: string, minutes = 0): Date {
  const [a, m, j] = cle.split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, j ?? 1, Math.floor(minutes / 60), minutes % 60);
}

// Jour de la semaine 1 (lundi) à 7 (dimanche).
export function jourSemaine(date: Date): number {
  const js = date.getDay(); // 0 = dimanche
  return js === 0 ? 7 : js;
}

export function formaterHeure(minutes: number): string {
  return (
    Math.floor(minutes / 60) +
    "h" +
    String(minutes % 60).padStart(2, "0")
  );
}

export function formaterDateHeure(date: Date): string {
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const mois = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return (
    jours[date.getDay()] +
    " " +
    date.getDate() +
    " " +
    mois[date.getMonth()] +
    (date.getFullYear() !== new Date().getFullYear() ? " " + date.getFullYear() : "") +
    " à " +
    formaterHeure(date.getHours() * 60 + date.getMinutes())
  );
}

export function formaterDuree(dureeMin: number): string {
  return dureeMin >= 60 ? dureeMin / 60 + " heure" + (dureeMin > 60 ? "s" : "") : dureeMin + " minutes";
}

// ---------- Paramètres du professeur (F5.8, F6.3) ----------

// F5.7 : l'élève peut annuler son rendez-vous jusqu'à 24 heures avant.
export const DELAI_ANNULATION_MS = 24 * 60 * 60 * 1000;

// Durée des créneaux de rendez-vous : 30 ou 60 minutes.
export async function dureeCreneau(): Promise<number> {
  const parametre = await prisma.setting.findUnique({ where: { key: "rdvDureeCreneau" } });
  const valeur = parametre ? parseInt(parametre.value, 10) : 30;
  return valeur === 60 ? 60 : 30;
}

// Nombre de rendez-vous à venir autorisés par élève (F5.8). Par défaut 1.
export async function maxRdvParEleve(): Promise<number> {
  const parametre = await prisma.setting.findUnique({ where: { key: "rdvMaxEleve" } });
  const valeur = parametre ? parseInt(parametre.value, 10) : 1;
  return Number.isFinite(valeur) && valeur >= 1 ? valeur : 1;
}

// ---------- Génération des créneaux (F5.2, F5.3) ----------

export type Creneau = {
  debut: Date;
  dureeMin: number;
  libre: boolean;
};

// Calcule tous les créneaux d'une période à partir des disponibilités
// récurrentes, en excluant les dates bloquées (F5.2) et les créneaux déjà
// pris par un rendez-vous (F5.4). Les créneaux passés sont exclus.
export async function creneauxPeriode(debutPeriode: Date, finPeriode: Date): Promise<Creneau[]> {
  const duree = await dureeCreneau();
  const [disponibilites, bloquees, rdvs] = await Promise.all([
    prisma.disponibilite.findMany({ orderBy: [{ jour: "asc" }, { debutMin: "asc" }] }),
    prisma.dateBloquee.findMany(),
    prisma.rendezVous.findMany({
      where: { debut: { lt: finPeriode } },
    }),
  ]);
  const joursBloques = new Set(bloquees.map((b) => b.date));
  const maintenant = Date.now();

  const resultat: Creneau[] = [];
  const curseur = new Date(debutPeriode);
  while (curseur < finPeriode) {
    const cle = cleDate(curseur);
    const jour = jourSemaine(curseur);
    for (const dispo of disponibilites.filter((d) => d.jour === jour)) {
      for (let m = dispo.debutMin; m + duree <= dispo.finMin; m += duree) {
        const debut = new Date(curseur.getFullYear(), curseur.getMonth(), curseur.getDate(), Math.floor(m / 60), m % 60);
        if (debut.getTime() <= maintenant || joursBloques.has(cle)) continue;
        const fin = new Date(debut.getTime() + duree * 60 * 1000);
        const pris = rdvs.some(
          (rdv) =>
            rdv.debut.getTime() < fin.getTime() &&
            rdv.debut.getTime() + rdv.dureeMin * 60 * 1000 > debut.getTime()
        );
        resultat.push({ debut, dureeMin: duree, libre: !pris });
      }
    }
    curseur.setDate(curseur.getDate() + 1);
  }
  return resultat.sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

// Vérifie qu'un créneau précis est valide et libre (utilisée à la réservation
// pour ne pas dépendre de la page affichée, qui peut être périmée) : date
// future, non bloquée, couverte par une disponibilité et alignée sur la
// grille, sans chevauchement avec un rendez-vous existant (F5.4).
export async function creneauValide(debut: Date, dureeMin: number): Promise<boolean> {
  if (debut.getTime() <= Date.now()) return false;
  const cle = cleDate(debut);
  const bloquee = await prisma.dateBloquee.findUnique({ where: { date: cle } });
  if (bloquee) return false;

  const minutes = debut.getHours() * 60 + debut.getMinutes();
  const dispo = await prisma.disponibilite.findFirst({
    where: {
      jour: jourSemaine(debut),
      debutMin: { lte: minutes },
      finMin: { gte: minutes + dureeMin },
    },
  });
  if (!dispo) return false;
  if ((minutes - dispo.debutMin) % dureeMin !== 0) return false;

  const fin = debut.getTime() + dureeMin * 60 * 1000;
  const rdvs = await prisma.rendezVous.findMany({ where: { debut: { lt: new Date(fin) } } });
  return !rdvs.some((rdv) => rdv.debut.getTime() + rdv.dureeMin * 60 * 1000 > debut.getTime());
}

// Un rendez-vous ne peut pas en chevaucher un autre (le professeur ne peut
// pas être à deux endroits à la fois). exclureId : le rendez-vous déplacé.
export async function conflitRdv(exclureId: string | null, debut: Date, dureeMin: number): Promise<boolean> {
  const fin = debut.getTime() + dureeMin * 60 * 1000;
  const rdvs = await prisma.rendezVous.findMany({
    where: { debut: { lt: new Date(fin) } },
  });
  return rdvs.some(
    (rdv) =>
      rdv.id !== exclureId &&
      rdv.debut.getTime() + rdv.dureeMin * 60 * 1000 > debut.getTime()
  );
}

// F5.6 : change la date de séance d'un cours ; si la date change et que le
// cours est publié, tous les élèves actifs reçoivent un email. Partagé entre
// la modification de cours et la planification depuis le calendrier.
export async function changerDateSeanceCours(
  coursId: string,
  nouvelleDate: Date | null,
  lien: string
): Promise<boolean> {
  const cours: Cours | null = await prisma.cours.findUnique({ where: { id: coursId } });
  if (!cours) return false;

  const avant = cours.dateSeance?.getTime() ?? null;
  const apres = nouvelleDate?.getTime() ?? null;
  if (avant === apres) return true;

  await prisma.cours.update({ where: { id: coursId }, data: { dateSeance: nouvelleDate } });
  if (cours.publie) {
    const eleves = await prisma.user.findMany({ where: { role: "ELEVE", actif: true } });
    for (const eleve of eleves) {
      await envoyerEmail({
        to: eleve.email,
        subject: "Nouvelle date de séance : " + cours.titre,
        text:
          "Bonjour,\n\nLa séance du cours « " + cours.titre + " » " +
          (nouvelleDate ? "aura lieu le " + nouvelleDate.toLocaleString("fr-FR") : "n'a plus de date programmée.") +
          "\n\nOuvrez le calendrier pour voir toutes les dates : " +
          lien + "/calendrier\n\nÀ très bientôt !",
      });
    }
  }
  return true;
}
