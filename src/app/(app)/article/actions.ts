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

// ---------- Cycle de vie de l'article (F3.4, F3.6, F2.7) ----------

// F3.4 : un nouvel article naît en brouillon, l'éditeur s'ouvre immédiatement.
export async function creerArticleAction(_formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const article = await prisma.article.create({ data: { titre: "Nouvel article" } });
  revalidatePath("/");
  redirect(`/article/${article.id}/modifier`);
}

export type EtatEnregistrement = { erreur?: string; enregistreLe?: string };

// Enregistrement de l'éditeur : bouton "Enregistrer" et enregistrement
// automatique (F3.4) passent par la même action. Le statut est transmis
// par l'éditeur car la case est contrôlée côté client.
export async function enregistrerArticleAction(formData: FormData): Promise<EtatEnregistrement> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const id = String(formData.get("id") ?? "");
  const titre = String(formData.get("titre") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "");
  const publie = formData.get("publie") === "true";

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { erreur: "Article introuvable." };
  if (!titre) return { erreur: "Le titre est obligatoire pour enregistrer." };

  const maintenant = new Date();
  await prisma.article.update({
    where: { id },
    data: {
      titre,
      contenu,
      publie,
      // F3.6 : la date de première publication est conservée en cas de
      // dépublication puis republication (ordre antichronologique stable).
      publieLe: publie ? (article.publieLe ?? maintenant) : article.publieLe,
    },
  });

  revalidatePath("/");
  revalidatePath("/article/" + id);
  return { enregistreLe: maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
}

// Publication / retour au brouillon depuis la carte du dashboard (F3.4).
export async function publierArticleAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return;

  const publie = !article.publie;
  await prisma.article.update({
    where: { id },
    data: {
      publie,
      publieLe: publie ? (article.publieLe ?? new Date()) : article.publieLe,
    },
  });
  revalidatePath("/");
  revalidatePath("/article/" + id);
}

// F3.6 : épingler un article publié ("À la une") — il s'affiche en tête.
export async function epinglerArticleAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || !article.publie) return;

  await prisma.article.update({ where: { id }, data: { epingle: !article.epingle } });
  revalidatePath("/");
}

// F2.7 (appliqué au blog) : suppression avec confirmation côté client, message nommé.
export async function supprimerArticleAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id }, include: { fichiers: true } });
  if (!article) return;

  await prisma.article.delete({ where: { id } });
  if (article.imageNomStocke) await supprimerDuDisque(article.imageNomStocke);
  for (const fichier of article.fichiers) {
    await supprimerDuDisque(fichier.nomStocke);
  }
  revalidatePath("/");
  redirect("/");
}

// ---------- Image d'illustration et pièces jointes (F3.3, F3.4) ----------

// Image d'illustration optionnelle affichée sur la carte et en tête d'article.
export async function definirIllustrationAction(
  formData: FormData
): Promise<{ erreur?: string }> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { erreur: "Article introuvable." };

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { erreur: "Veuillez choisir une image." };
  }
  if (!image.type.startsWith("image/")) {
    return { erreur: "« " + image.name + " » n'est pas une image." };
  }
  if (image.size > TAILLE_MAX_FICHIER) {
    return { erreur: "L'image dépasse la taille maximale de 10 Mo." };
  }

  const donnees = new Uint8Array(await image.arrayBuffer());
  const nomStocke = await enregistrerFichier(image.name, donnees);
  if (article.imageNomStocke) await supprimerDuDisque(article.imageNomStocke);
  await prisma.article.update({ where: { id }, data: { imageNomStocke: nomStocke } });
  revalidatePath("/");
  revalidatePath("/article/" + id);
  return {};
}

export async function supprimerIllustrationAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || !article.imageNomStocke) return;

  await supprimerDuDisque(article.imageNomStocke);
  await prisma.article.update({ where: { id }, data: { imageNomStocke: null } });
  revalidatePath("/");
  revalidatePath("/article/" + id);
}

// F3.3 : fichiers attachés éventuels, 10 Mo maximum par fichier,
// plusieurs fichiers d'un coup.
export async function ajouterPiecesAction(
  formData: FormData
): Promise<{ erreur?: string; message?: string; joints?: { id: string; nom: string; taille: number }[] }> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { erreur: "Article introuvable." };

  const televerses = formData
    .getAll("fichier")
    .filter((element): element is File => element instanceof File && element.size > 0);
  if (televerses.length === 0) {
    return { erreur: "Veuillez choisir au moins un fichier à joindre." };
  }

  const ajoutes: { id: string; nom: string; taille: number }[] = [];
  const problemes: string[] = [];
  for (const fichier of televerses) {
    if (fichier.size > TAILLE_MAX_FICHIER) {
      problemes.push("« " + fichier.name + " » dépasse la taille maximale de 10 Mo.");
      continue;
    }
    const donnees = new Uint8Array(await fichier.arrayBuffer());
    const nomStocke = await enregistrerFichier(fichier.name, donnees);
    const joint = await prisma.fichier.create({
      data: { nom: fichier.name, nomStocke, taille: fichier.size, articleId: id },
    });
    ajoutes.push({ id: joint.id, nom: joint.nom, taille: joint.taille });
  }

  revalidatePath("/article/" + id);
  revalidatePath("/article/" + id + "/modifier");

  let message = "";
  if (ajoutes.length === 1) {
    message = "Le fichier « " + ajoutes[0].nom + " » a bien été joint.";
  } else if (ajoutes.length > 1) {
    message = ajoutes.length + " fichiers ont bien été joints.";
  }
  if (problemes.length > 0) {
    return { message, erreur: "Non joints : " + problemes.join(" "), joints: ajoutes };
  }
  return { message, joints: ajoutes };
}

export async function supprimerPieceAction(formData: FormData): Promise<void> {
  const professeur = await exigerProfesseur();
  if (!professeur) return;
  const id = String(formData.get("id") ?? "");
  const fichier = await prisma.fichier.findUnique({ where: { id } });
  if (!fichier || !fichier.articleId) return;

  await prisma.fichier.delete({ where: { id } });
  await supprimerDuDisque(fichier.nomStocke);
  revalidatePath("/article/" + fichier.articleId);
  revalidatePath("/article/" + fichier.articleId + "/modifier");
}

// F3.4 : image insérée dans le contenu. Elle est enregistrée comme pièce
// jointe de l'article, puis référencée dans le markdown par l'éditeur.
export async function ajouterImageContenuAction(
  formData: FormData
): Promise<{ erreur?: string; url?: string }> {
  const professeur = await exigerProfesseur();
  if (!professeur) return { erreur: "Action non autorisée." };

  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { erreur: "Article introuvable." };

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { erreur: "Veuillez choisir une image." };
  }
  if (!image.type.startsWith("image/")) {
    return { erreur: "« " + image.name + " » n'est pas une image." };
  }
  if (image.size > TAILLE_MAX_FICHIER) {
    return { erreur: "L'image dépasse la taille maximale de 10 Mo." };
  }

  const donnees = new Uint8Array(await image.arrayBuffer());
  const nomStocke = await enregistrerFichier(image.name, donnees);
  const fichier = await prisma.fichier.create({
    data: { nom: image.name, nomStocke, taille: image.size, articleId: id, estContenu: true },
  });
  return { url: "/fichiers/" + fichier.id };
}
