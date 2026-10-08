import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Phase 1 : dashboard vide. Le blog (F3) sera branché ici en phase 3.
export default async function PageAccueil() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");

  const estProfesseur = utilisateur.role === "PROFESSEUR";

  return (
    <>
      <h1 className="page-title">Bonjour {utilisateur.prenom}</h1>
      <p className="page-subtitle">
        {estProfesseur
          ? "Voici votre espace. Vos articles s'afficheront ici pour vos élèves."
          : "Voici les dernières nouvelles de votre professeur."}
      </p>

      <section className="welcome">
        <div>
          <h2>Bienvenue sur votre espace</h2>
          <p>
            Retrouvez ici vos cours, vos messages et vos rendez-vous, toujours au même endroit.
          </p>
        </div>
      </section>

      {estProfesseur ? (
        <div className="folder-grid">
          <Link className="folder-card" href="/admin">
            <div className="folder-icon">{"\u270E"}</div>
            <div>
              <h3>Gérer vos invitations</h3>
              <span className="folder-count">Administration</span>
            </div>
          </Link>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon" aria-hidden="true">
            {"\u{1F4F0}"}
          </div>
          <h2>Aucun article pour le moment</h2>
          <p>
            Votre professeur publiera bientôt des guides et des actualités. Revenez régulièrement !
          </p>
        </div>
      )}
    </>
  );
}
