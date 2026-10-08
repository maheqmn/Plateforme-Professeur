import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Stockage local des fichiers joints (phase 2). En production, l'exigence 8.1
// prévoit un stockage objet (S3 ou équivalent) : remplacer uniquement ce module.
export const DOSSIER_STOCKAGE = path.join(process.cwd(), "stockage");

// Limite de taille par fichier : 10 Mo (cohérente avec la messagerie, F4.4).
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

export async function preparerDossierStockage(): Promise<void> {
  await fs.mkdir(DOSSIER_STOCKAGE, { recursive: true });
}

// Enregistre le fichier sous un nom généré sûr, retourne le nom stocké.
// Le nom d'origine est conservé en base pour l'affichage.
export async function enregistrerFichier(nomOriginal: string, donnees: Uint8Array): Promise<string> {
  await preparerDossierStockage();
  const extension = (path.extname(nomOriginal).match(/^\.([A-Za-z0-9]{1,10})$/)?.[1] ?? "") as string;
  const nomStocke = extension ? crypto.randomUUID() + "." + extension : crypto.randomUUID();
  await fs.writeFile(path.join(DOSSIER_STOCKAGE, nomStocke), donnees);
  return nomStocke;
}

export async function lireFichier(nomStocke: string): Promise<Uint8Array> {
  const donnees = await fs.readFile(path.join(DOSSIER_STOCKAGE, nomStocke));
  return new Uint8Array(donnees);
}

// Suppression du disque au mieux : une erreur d'unlink ne doit pas bloquer la suppression en base.
export async function supprimerDuDisque(nomStocke: string): Promise<void> {
  await fs.unlink(path.join(DOSSIER_STOCKAGE, nomStocke)).catch(() => undefined);
}
