"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { envoyerEmail } from "@/lib/email";
import { creneauValide, changerDateSeanceCours, conflitRdv, DELAI_ANNULATION_MS, formaterDateHeure, formaterDuree, maxRdvParEleve } from "@/lib/calendrier";

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

export type EtatRdv = { erreur?: string; message?: string };

async function professeurCourant() {
  return prisma.user.findFirst({ where: { role: "PROFESSEUR", actif: true } });
}

// Déplacement d'un rendez-vous + email automatique à l'élève (F5.6).
// Partagé par le formulaire de détail et le glisser-déposer du calendrier.
async function deplacerRdvEtPrevenir(rdvId: string, nouveauDebut: Date, lien: string): Promise<string | null> {
  const rdv = await prisma.rendezVous.findUnique({ where: { id: rdvId }, include: { eleve: true } });
  if (!rdv) return "Rendez-vous introuvable.";
  // Le professeur ne peut pas se retrouver avec deux rendez-vous qui se
  // chevauchent.
  if (await conflitRdv(rdvId, nouveauDebut, rdv.dureeMin)) {
    return "Ce créneau chevauche un autre rendez-vous. Choisissez un autre moment.";
  }
  await prisma.rendezVous.update({
    where: { id: rdvId },
    data: { debut: nouveauDebut, rappelEnvoyeLe: null },
  });
  await envoyerEmail({
    to: rdv.eleve.email,
    subject: "Votre rendez-vous a été déplacé",
    text:
      "Bonjour,\n\nVotre rendez-vous a été déplacé au " + formaterDateHeure(nouveauDebut) +
      " (" + formaterDuree(rdv.dureeMin) + ")." +
      (rdv.lienTeams ? "\n\nLien Teams : " + rdv.lienTeams : "") +
      "\n\nOuvrez le calendrier : " + lien + "/calendrier",
  });
  return null;
}

// ---------- Prise de rendez-vous (F5.3, F5.4, F5.8) ----------

export async function reserverAction(
  _etat: EtatRdv,
  formData: FormData
): Promise<EtatRdv> {
  const utilisateur = await getSessionUser();
  if (!utilisateur || utilisateur.role !== "ELEVE") {
    return { erreur: "Action non autorisée." };
  }

  const debut = new Date(String(formData.get("debut") ?? ""));
  const dureeMin = parseInt(String(formData.get("duree") ?? ""), 10);
  const motif = String(formData.get("motif") ?? "").trim() || null;
  if (isNaN(debut.getTime()) || (dureeMin !== 30 && dureeMin !== 60)) {
    return { erreur: "Créneau invalide." };
  }

  // F5.4 : le créneau doit encore être valide (la page affichée peut dater).
  if (!(await creneauValide(debut, dureeMin))) {
    return { erreur: "Ce créneau n'est plus disponible. Choisissez-en un autre dans le calendrier." };
  }

  // F5.8 : nombre de rendez-vous à venir limité (paramétrable).
  const max = await maxRdvParEleve();
  const aVenir = await prisma.rendezVous.count({
    where: { eleveId: utilisateur.id, debut: { gt: new Date() } },
  });
  if (aVenir >= max) {
    return {
      erreur:
        "Vous avez déjà " + aVenir +
        " rendez-vous à venir. Attendez qu'il ait eu lieu (ou annulez-le) avant d'en prendre un autre.",
    };
  }

  await prisma.rendezVous.create({
    data: { eleveId: utilisateur.id, debut, dureeMin, motif },
  });
  revalidatePath("/calendrier");

  // F5.4 : le créneau disparaît de la vue des autres élèves ; email aux
  // deux parties pour la confirmation (F5.3).
  const texte =
    "Bonjour,\n\nNouveau rendez-vous " + (motif ? "pour : " + motif : "") +
    "\nQuand : " + formaterDateHeure(debut) + " (" + formaterDuree(dureeMin) + ")\n" +
    (motif ? "Motif : " + motif + "\n" : "") +
    "\nOuvrez le calendrier : " + (await origine()) + "/calendrier\n\nÀ très bientôt !";
  const professeur = await professeurCourant();
  if (professeur) {
    await envoyerEmail({
      to: professeur.email,
      subject: "Nouveau rendez-vous avec " + utilisateur.prenom + " " + utilisateur.nom,
      text: "Rendez-vous avec " + utilisateur.prenom + " " + utilisateur.nom + ".\n\n" + texte,
    });
  }
  await envoyerEmail({
    to: utilisateur.email,
    subject: "Votre rendez-vous est confirmé",
    text: texte,
  });

  redirect("/calendrier?reserve=1");
}

// ---------- Annulation (F5.6 professeur, F5.7 élève) ----------

export async function annulerRdvAction(formData: FormData): Promise<void> {
  const utilisateur = await getSessionUser();
  if (!utilisateur) return;
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const id = String(formData.get("id") ?? "");
  const rdv = await prisma.rendezVous.findUnique({ where: { id }, include: { eleve: true } });
  if (!rdv) return;
  if (!estProfesseur && rdv.eleveId !== utilisateur.id) return;

  // F5.7 : l'élève ne peut annuler que jusqu'à 24 heures avant ; le
  // professeur peut annuler à tout moment (F5.6).
  if (!estProfesseur && rdv.debut.getTime() - Date.now() <= DELAI_ANNULATION_MS) return;

  await prisma.rendezVous.delete({ where: { id } });
  revalidatePath("/calendrier");

  // F5.6 / F5.7 : email automatique aux deux parties.
  const professeur = await professeurCourant();
  const texte =
    "Bonjour,\n\nLe rendez-vous du " + formaterDateHeure(rdv.debut) +
    (rdv.motif ? " (" + rdv.motif + ")" : "") + " a été annulé" +
    (estProfesseur ? " par le professeur." : " par l'élève.") +
    "\n\nLe créneau redevient disponible dans le calendrier : " +
    (await origine()) + "/calendrier";
  const destinataires = estProfesseur
    ? [rdv.eleve.email, professeur?.email].filter(Boolean)
    : [professeur?.email].filter(Boolean);
  for (const to of destinataires as string[]) {
    await envoyerEmail({ to, subject: "Rendez-vous annulé", text: texte });
  }
}

// ---------- Gestion professeur (F5.5, F5.6) ----------

// F5.5 : le professeur colle le lien Teams de la réunion planifiée par ailleurs.
export async function definirLienTeamsAction(
  _etat: EtatRdv,
  formData: FormData
): Promise<EtatRdv> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };
  const id = String(formData.get("id") ?? "");
  const rdv = await prisma.rendezVous.findUnique({ where: { id }, include: { eleve: true } });
  if (!rdv) return { erreur: "Rendez-vous introuvable." };

  const lien = String(formData.get("lienTeams") ?? "").trim();
  if (lien && !/^https?:\/\//.test(lien)) {
    return { erreur: "Le lien Teams doit commencer par http:// ou https://." };
  }

  await prisma.rendezVous.update({ where: { id }, data: { lienTeams: lien || null } });
  revalidatePath("/calendrier");
  revalidatePath("/calendrier/rdv/" + id);

  // F5.5 : l'email de confirmation contient le lien Teams.
  if (lien) {
    const texte =
      "Bonjour,\n\nLe lien Microsoft Teams de votre rendez-vous du " +
      formaterDateHeure(rdv.debut) + " est disponible :\n\n" + lien +
      "\n\nOuvrez-le quelques minutes avant l'heure du rendez-vous.";
    await envoyerEmail({ to: rdv.eleve.email, subject: "Lien Teams de votre rendez-vous", text: texte });
  }
  return { message: lien ? "Lien Teams enregistré et envoyé à l'élève." : "Lien Teams supprimé." };
}

// F5.6 : le professeur peut déplacer tout rendez-vous.
export async function deplacerRdvAction(
  _etat: EtatRdv,
  formData: FormData
): Promise<EtatRdv> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };
  const id = String(formData.get("id") ?? "");
  const rdv = await prisma.rendezVous.findUnique({ where: { id } });
  if (!rdv) return { erreur: "Rendez-vous introuvable." };

  const nouveauDebut = new Date(String(formData.get("debut") ?? ""));
  if (isNaN(nouveauDebut.getTime()) || nouveauDebut.getTime() <= Date.now()) {
    return { erreur: "Choisissez une date future." };
  }

  const erreur = await deplacerRdvEtPrevenir(id, nouveauDebut, await origine());
  if (erreur) return { erreur };
  revalidatePath("/calendrier");
  revalidatePath("/calendrier/rdv/" + id);
  return { message: "Rendez-vous déplacé. L'élève a été prévenu par email." };
}

// ---------- Création par le professeur (style Teams) ----------

// Le professeur crée directement un rendez-vous avec un élève : il choisit
// la date et l'heure librement (pas de contrainte de disponibilité).
export async function creerRdvAction(_etat: EtatRdv, formData: FormData): Promise<EtatRdv> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const eleveId = String(formData.get("eleveId") ?? "");
  const eleve = await prisma.user.findFirst({ where: { id: eleveId, role: "ELEVE", actif: true } });
  if (!eleve) return { erreur: "Choisissez un élève." };

  const debut = new Date(String(formData.get("debut") ?? ""));
  const dureeMin = parseInt(String(formData.get("duree") ?? ""), 10);
  if (isNaN(debut.getTime()) || debut.getTime() <= Date.now()) {
    return { erreur: "Choisissez une date future." };
  }
  if (dureeMin !== 30 && dureeMin !== 60) {
    return { erreur: "La durée doit être de 30 ou 60 minutes." };
  }

  const motif = String(formData.get("motif") ?? "").trim() || null;
  const lienTeams = String(formData.get("lienTeams") ?? "").trim() || null;
  if (lienTeams && !/^https?:\/\//.test(lienTeams)) {
    return { erreur: "Le lien Teams doit commencer par http:// ou https://." };
  }
  if (await conflitRdv(null, debut, dureeMin)) {
    return { erreur: "Vous avez déjà un rendez-vous à ce moment-là. Choisissez un autre créneau." };
  }

  await prisma.rendezVous.create({
    data: { eleveId, debut, dureeMin, motif, lienTeams },
  });
  revalidatePath("/calendrier");

  await envoyerEmail({
    to: eleve.email,
    subject: "Nouveau rendez-vous avec votre professeur",
    text:
      "Bonjour,\n\nVotre professeur vous a fixé un rendez-vous " + formaterDateHeure(debut) +
      " (" + formaterDuree(dureeMin) + ")." +
      (motif ? "\nMotif : " + motif : "") +
      (lienTeams ? "\n\nLien Microsoft Teams : " + lienTeams : "") +
      "\n\nOuvrez le calendrier : " + (await origine()) + "/calendrier\n\nÀ très bientôt !",
  });

  redirect("/calendrier");
}

// Le professeur planifie la séance d'un cours (ou la replanifie).
export async function planifierCoursAction(_etat: EtatRdv, formData: FormData): Promise<EtatRdv> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const coursId = String(formData.get("coursId") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id: coursId } });
  if (!cours) return { erreur: "Choisissez un cours." };

  const debut = new Date(String(formData.get("debut") ?? ""));
  if (isNaN(debut.getTime()) || debut.getTime() <= Date.now()) {
    return { erreur: "Choisissez une date future." };
  }

  const ok = await changerDateSeanceCours(coursId, debut, await origine());
  if (!ok) return { erreur: "Cours introuvable." };
  revalidatePath("/calendrier");
  revalidatePath("/cours/" + cours.categorieId + "/" + coursId);
  redirect("/calendrier");
}

// Glisser-déposer : déplace un rendez-vous ou un cours vers un autre jour du
// calendrier. L'heure est conservée, sauf si un "heure" cible est fourni
// (dépôt sur une ligne d'heure de la vue Jour) ; un cours sans heure part à
// 15h00. Renvoie une erreur en cas de chevauchement de rendez-vous.
export async function glisserEvenementAction(
  formData: FormData
): Promise<{ erreur?: string }> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const type = String(formData.get("type") ?? "");
  const id = String(formData.get("id") ?? "");
  const dateCible = String(formData.get("date") ?? "");
  const heureCible = parseInt(String(formData.get("heure") ?? ""), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCible)) return { erreur: "Date invalide." };

  const annee = Number(dateCible.slice(0, 4));
  const mois = Number(dateCible.slice(5, 7)) - 1;
  const jour = Number(dateCible.slice(8, 10));

  if (type === "rdv") {
    const rdv = await prisma.rendezVous.findUnique({ where: { id } });
    if (!rdv) return { erreur: "Rendez-vous introuvable." };
    const heure = Number.isFinite(heureCible) ? heureCible : rdv.debut.getHours();
    const nouveauDebut = new Date(annee, mois, jour, heure, rdv.debut.getMinutes());
    if (nouveauDebut.getTime() <= Date.now()) {
      return { erreur: "Impossible de déplacer un rendez-vous dans le passé." };
    }
    const erreur = await deplacerRdvEtPrevenir(id, nouveauDebut, await origine());
    if (erreur) return { erreur };
    revalidatePath("/calendrier");
    revalidatePath("/calendrier/rdv/" + id);
  } else if (type === "cours") {
    const cours = await prisma.cours.findUnique({ where: { id } });
    if (!cours) return { erreur: "Cours introuvable." };
    const heure = Number.isFinite(heureCible)
      ? heureCible
      : cours.dateSeance
        ? cours.dateSeance.getHours()
        : 15;
    const minute = cours.dateSeance ? cours.dateSeance.getMinutes() : 0;
    const nouveauDebut = new Date(annee, mois, jour, heure, minute);
    if (nouveauDebut.getTime() <= Date.now()) {
      return { erreur: "Impossible de déplacer un cours dans le passé." };
    }
    await changerDateSeanceCours(id, nouveauDebut, await origine());
    revalidatePath("/calendrier");
  }
  return {};
}

// ---------- Disponibilités (F5.2) ----------

export type EtatDispo = { erreur?: string };

export async function ajouterDisponibiliteAction(
  _etat: EtatDispo,
  formData: FormData
): Promise<EtatDispo> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const jour = parseInt(String(formData.get("jour") ?? ""), 10);
  const heureDebut = String(formData.get("debut") ?? "");
  const heureFin = String(formData.get("fin") ?? "");
  if (!(jour >= 1 && jour <= 7)) return { erreur: "Choisissez un jour de la semaine." };

  const enMinutes = (valeur: string) => {
    const [h, m] = valeur.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const debutMin = enMinutes(heureDebut);
  const finMin = enMinutes(heureFin);
  if (!heureDebut || !heureFin || finMin <= debutMin) {
    return { erreur: "L'heure de fin doit être après l'heure de début." };
  }

  await prisma.disponibilite.create({ data: { jour, debutMin, finMin } });
  revalidatePath("/calendrier");
  return {};
}

export async function supprimerDisponibiliteAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  await prisma.disponibilite.deleteMany({ where: { id } });
  revalidatePath("/calendrier");
}

export async function ajouterDateBloqueeAction(
  _etat: EtatDispo,
  formData: FormData
): Promise<EtatDispo> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { erreur: "Choisissez une date valide." };
  }
  await prisma.dateBloquee.upsert({ where: { date }, update: {}, create: { date } });
  revalidatePath("/calendrier");
  return {};
}

export async function supprimerDateBloqueeAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const date = String(formData.get("date") ?? "");
  await prisma.dateBloquee.deleteMany({ where: { date } });
  revalidatePath("/calendrier");
}
