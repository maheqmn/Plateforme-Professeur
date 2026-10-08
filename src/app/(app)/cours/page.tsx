import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Placeholder phase 1 — la gestion des cours (F2) arrive en phase 2.
export default async function PageCours() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  return (
    <>
      <h1 className="page-title">Mes cours</h1>
      <p className="page-subtitle">Ouvrez un dossier pour voir les cours qu&apos;il contient.</p>
      <div className="card empty-state">
        <div className="empty-icon" aria-hidden="true">
          {"\u{1F4DA}"}
        </div>
        <h2>Les cours arrivent bientôt</h2>
        <p>
          {estProfesseur
            ? "Vous pourrez créer vos dossiers et vos cours dans cette rubrique très prochainement."
            : "Votre professeur prépare actuellement ses cours. Revenez régulièrement pour les découvrir."}
        </p>
      </div>
    </>
  );
}
