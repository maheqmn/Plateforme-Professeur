import bcrypt from "bcryptjs";

// Exigence 8.2 : mots de passe hachés (bcrypt).
export function hasherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 10);
}

export function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

// F1.4 : au moins 8 caractères, une majuscule, un chiffre, un caractère spécial.
// Retourne un message d'erreur en français, ou null si le mot de passe convient.
export function validerMotDePasse(motDePasse: string): string | null {
  if (motDePasse.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Z]/.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  }
  if (!/[0-9]/.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  if (!/[^A-Za-z0-9]/.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins un caractère spécial (ex. ! ? % -).";
  }
  return null;
}
