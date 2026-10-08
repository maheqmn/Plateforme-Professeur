import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Placeholder phase 1 — la messagerie (F4) arrive en phase 4.
export default async function PageMessages() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  return (
    <>
      <h1 className="page-title">Messages</h1>
      <p className="page-subtitle">
        {estProfesseur ? "Vos conversations avec vos élèves." : "Votre conversation privée avec votre professeur."}
      </p>
      <div className="card empty-state">
        <div className="empty-icon" aria-hidden="true">
          {"\u2709"}
        </div>
        <h2>La messagerie arrive bientôt</h2>
        <p>
          {estProfesseur
            ? "Vous pourrez échanger avec vos élèves depuis cette rubrique très prochainement."
            : "Vous pourrez écrire à votre professeur depuis cette rubrique très prochainement."}
        </p>
      </div>
    </>
  );
}
