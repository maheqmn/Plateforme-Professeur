"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { enregistrerFichier, supprimerDuDisque, TAILLE_MAX_FICHIER } from "@/lib/fichiers";

async function exigerProfesseur() {
  const utilisateur = await getSessionUser();
  if (!utilisateur || utilisateur.role !== "PROFESSEUR") return null;
  return utilisateur;
}

// ---------- Dossiers (niveau 1, F2.1 / F2.5) ----------

export type EtatDossier = { erreur?: string };

export async function enregistrerDossierAction(_etat: EtatDossier, formData: FormData): Promise<EtatDossier> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const id = String(formData.get("categorieId") ?? "") || null;
  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return { erreur: "Veuillez saisir un titre pour le dossier." };

  if (id) {
    await prisma.categorie.update({ where: { id }, data: { titre } });
    revalidatePath("/cours");
    revalidatePath("/cours/" + id);
    redirect("/cours/" + id);
  }

  const dernier = await prisma.categorie.findFirst({ orderBy: { ordre: "desc" }, select: { ordre: true } });
  const categorie = await prisma.categorie.create({
    data: { titre, ordre: (dernier?.ordre ?? 0) + 1 },
  });
  revalidatePath("/cours");
  redirect("/cours/" + categorie.id);
}

// F2.7 : suppression avec confirmation côté client, message nommé.
export async function supprimerDossierAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const categorie = await prisma.categorie.findUnique({
    where: { id },
    include: { cours: { include: { fichiers: true } } },
  });
  if (!categorie) return;

  await prisma.categorie.delete({ where: { id } });
  for (const cours of categorie.cours) {
    for (const fichier of cours.fichiers) {
      await supprimerDuDisque(fichier.nomStocke);
    }
  }
  revalidatePath("/cours");
  redirect("/cours");
}

export async function deplacerDossierAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const sens = String(formData.get("sens") ?? ""); // "monter" | "descendre"

  const courant = await prisma.categorie.findUnique({ where: { id } });
  if (!courant) return;
  const voisin = await prisma.categorie.findFirst({
    where: sens === "monter" ? { ordre: { lt: courant.ordre } } : { ordre: { gt: courant.ordre } },
    orderBy: sens === "monter" ? { ordre: "desc" } : { ordre: "asc" },
  });
  if (!voisin) return;

  await prisma.$transaction([
    prisma.categorie.update({ where: { id: voisin.id }, data: { ordre: courant.ordre } }),
    prisma.categorie.update({ where: { id: courant.id }, data: { ordre: voisin.ordre } }),
  ]);
  revalidatePath("/cours");
}

// ---------- Cours (niveau 2, F2.3 / F2.5 / F2.6) ----------

export type EtatCours = { erreur?: string };

export async function enregistrerCoursAction(_etat: EtatCours, formData: FormData): Promise<EtatCours> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const coursId = String(formData.get("coursId") ?? "") || null;
  const categorieId = String(formData.get("categorieId") ?? "");
  const titre = String(formData.get("titre") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "");
  const lienExterne = String(formData.get("lienExterne") ?? "").trim() || null;
  const publie = formData.get("publie") === "on"; // F2.6 : par défaut, un nouveau cours est en préparation.

  if (!titre || !description) {
    return { erreur: "Le titre et la description sont obligatoires." };
  }
  if (lienExterne && !/^https?:\/\//.test(lienExterne)) {
    return { erreur: "Le lien externe doit commencer par http:// ou https://." };
  }

  if (coursId) {
    await prisma.cours.update({
      where: { id: coursId },
      data: { titre, description, contenu, lienExterne, publie },
    });
    revalidatePath("/cours/" + categorieId);
    revalidatePath("/cours/" + categorieId + "/" + coursId);
    redirect("/cours/" + categorieId + "/" + coursId);
  }

  const dernier = await prisma.cours.findFirst({
    where: { categorieId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  const cours = await prisma.cours.create({
    data: {
      titre,
      description,
      contenu,
      lienExterne,
      publie,
      categorieId,
      ordre: (dernier?.ordre ?? 0) + 1,
    },
  });
  revalidatePath("/cours/" + categorieId);
  redirect("/cours/" + categorieId + "/" + cours.id);
}

export async function supprimerCoursAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id }, include: { fichiers: true } });
  if (!cours) return;

  await prisma.cours.delete({ where: { id } });
  for (const fichier of cours.fichiers) {
    await supprimerDuDisque(fichier.nomStocke);
  }
  revalidatePath("/cours");
  revalidatePath("/cours/" + cours.categorieId);
  redirect("/cours/" + cours.categorieId);
}

export async function deplacerCoursAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const sens = String(formData.get("sens") ?? "");

  const courant = await prisma.cours.findUnique({ where: { id } });
  if (!courant) return;
  const voisin = await prisma.cours.findFirst({
    where: {
      categorieId: courant.categorieId,
      ...(sens === "monter" ? { ordre: { lt: courant.ordre } } : { ordre: { gt: courant.ordre } }),
    },
    orderBy: sens === "monter" ? { ordre: "desc" } : { ordre: "asc" },
  });
  if (!voisin) return;

  await prisma.$transaction([
    prisma.cours.update({ where: { id: voisin.id }, data: { ordre: courant.ordre } }),
    prisma.cours.update({ where: { id: courant.id }, data: { ordre: voisin.ordre } }),
  ]);
  revalidatePath("/cours/" + courant.categorieId);
}

// F2.5 : "Déplacer un cours d'un dossier à l'autre".
export async function changerDossierCoursAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const coursId = String(formData.get("coursId") ?? "");
  const categorieCible = String(formData.get("categorieIdCible") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id: coursId } });
  if (!cours || cours.categorieId === categorieCible) return;

  const dernier = await prisma.cours.findFirst({
    where: { categorieId: categorieCible },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  await prisma.cours.update({
    where: { id: coursId },
    data: { categorieId: categorieCible, ordre: (dernier?.ordre ?? 0) + 1 },
  });
  revalidatePath("/cours");
  revalidatePath("/cours/" + cours.categorieId);
  redirect("/cours/" + categorieCible + "/" + coursId);
}

export async function publierCoursAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id } });
  if (!cours) return;
  await prisma.cours.update({ where: { id }, data: { publie: !cours.publie } });
  revalidatePath("/cours");
  revalidatePath("/cours/" + cours.categorieId);
  revalidatePath("/cours/" + cours.categorieId + "/" + cours.id);
}

// ---------- Fichiers joints (F2.3) ----------

export type EtatFichier = { erreur?: string; message?: string };

export async function ajouterFichierAction(_etat: EtatFichier, formData: FormData): Promise<EtatFichier> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const coursId = String(formData.get("coursId") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id: coursId } });
  if (!cours) return { erreur: "Cours introuvable." };

  // Plusieurs fichiers peuvent être déposés d'un coup (glisser-déposer).
  const televerses = formData
    .getAll("fichier")
    .filter((element): element is File => element instanceof File && element.size > 0);
  if (televerses.length === 0) {
    return { erreur: "Veuillez choisir au moins un fichier à ajouter." };
  }

  const ajoutes: string[] = [];
  const problemes: string[] = [];
  for (const fichier of televerses) {
    if (fichier.size > TAILLE_MAX_FICHIER) {
      problemes.push("« " + fichier.name + " » dépasse la taille maximale de 10 Mo.");
      continue;
    }
    const donnees = new Uint8Array(await fichier.arrayBuffer());
    const nomStocke = await enregistrerFichier(fichier.name, donnees);
    await prisma.fichier.create({
      data: { nom: fichier.name, nomStocke, taille: fichier.size, coursId },
    });
    ajoutes.push(fichier.name);
  }

  revalidatePath("/cours/" + cours.categorieId + "/" + coursId);

  let message = "";
  if (ajoutes.length === 1) {
    message = "Le fichier « " + ajoutes[0] + " » a bien été ajouté.";
  } else if (ajoutes.length > 1) {
    message = ajoutes.length + " fichiers ont bien été ajoutés.";
  }
  if (problemes.length > 0) {
    return { message, erreur: "Non ajoutés : " + problemes.join(" ") };
  }
  return { message };
}

export async function supprimerFichierAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const fichier = await prisma.fichier.findUnique({ where: { id } });
  if (!fichier) return;
  await prisma.fichier.delete({ where: { id } });
  await supprimerDuDisque(fichier.nomStocke);
  revalidatePath("/cours/" + fichier.coursId);
}

// ---------- Progression élève (F2.3 / F2.4) ----------

export async function basculerTerminerAction(formData: FormData): Promise<void> {
  const utilisateur = await getSessionUser();
  if (!utilisateur || utilisateur.role !== "ELEVE") return;
  const coursId = String(formData.get("coursId") ?? "");
  const cours = await prisma.cours.findUnique({ where: { id: coursId } });
  if (!cours || !cours.publie) return;

  const existante = await prisma.progression.findUnique({
    where: { eleveId_coursId: { eleveId: utilisateur.id, coursId } },
  });
  if (existante) {
    await prisma.progression.delete({ where: { eleveId_coursId: { eleveId: utilisateur.id, coursId } } });
  } else {
    await prisma.progression.create({ data: { eleveId: utilisateur.id, coursId } });
  }
  revalidatePath("/");
  revalidatePath("/cours");
  revalidatePath("/cours/" + cours.categorieId);
  revalidatePath("/cours/" + cours.categorieId + "/" + coursId);
}
