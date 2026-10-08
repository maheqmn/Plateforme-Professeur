import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Placeholder phase 1 — le calendrier (F5) arrive en phase 5.
export default async function PageCalendrier() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  return (
    <>
      <h1 className="page-title">Calendrier</h1>
      <p className="page-subtitle">Les dates des cours et la prise de rendez-vous s&apos;afficheront ici.</p>
      <div className="card empty-state">
        <div className="empty-icon" aria-hidden="true">
          {"\u{1F4C5}"}
        </div>
        <h2>Le calendrier arrive bientôt</h2>
        <p>
          {estProfesseur
            ? "Vous pourrez définir vos disponibilités et planifier vos cours depuis cette rubrique très prochainement."
            : "Vous pourrez consulter les dates des cours et prendre rendez-vous avec votre professeur très prochainement."}
        </p>
      </div>
    </>
  );
}
