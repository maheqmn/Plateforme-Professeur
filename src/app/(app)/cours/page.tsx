import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import DossierForm from "./dossier-form";
import BoutonSuppression from "@/components/bouton-suppression";
import { supprimerDossierAction, deplacerDossierAction } from "./actions";

// F2.2 : vue élèves — dossiers de niveau 1 en grandes cartes.
// F2.5 : mode édition visible uniquement du professeur.
export default async function PageCours() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const dossiers = await prisma.categorie.findMany({
    orderBy: { ordre: "asc" },
    include: { cours: { orderBy: { ordre: "asc" } } },
  });

  const terminesParEleve = new Set<string>();
  if (!estProfesseur) {
    const progressions = await prisma.progression.findMany({
      where: { eleveId: utilisateur.id },
      select: { coursId: true },
    });
    for (const p of progressions) terminesParEleve.add(p.coursId);
  }

  return (
    <>
      <h1 className="page-title">Mes cours</h1>
      <p className="page-subtitle">
        {estProfesseur
          ? "Créez vos dossiers et vos cours. Les élèves ne voient que les cours publiés."
          : "Ouvrez un dossier pour voir les cours qu'il contient."}
      </p>

      {estProfesseur && (
        <details className="details-form card">
          <summary>Nouveau dossier</summary>
          <DossierForm />
        </details>
      )}

      <div className="folder-grid">
        {dossiers.length === 0 && (
          <div className="card empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-icon" aria-hidden="true">
              {"\u{1F4DA}"}
            </div>
            <h2>Aucun dossier pour le moment</h2>
            <p>
              {estProfesseur
                ? "Créez un premier dossier (ex. « Cours débutant ») avec le bouton ci-dessus."
                : "Votre professeur prépare actuellement ses cours. Revenez régulièrement pour les découvrir."}
            </p>
          </div>
        )}
        {dossiers.map((dossier, index) => {
          const coursPublies = dossier.cours.filter((c) => c.publie);
          const visibles = estProfesseur ? dossier.cours : coursPublies;
          const termines = visibles.filter((c) => terminesParEleve.has(c.id)).length;
          return (
            <div key={dossier.id} className="folder-bloc">
              <Link className="folder-card" href={`/cours/${dossier.id}`}>
                <div className="folder-icon" aria-hidden="true">
                  {"\u{1F5C1}"}
                </div>
                <div>
                  <h3>{dossier.titre}</h3>
                  <span className="folder-count">
                    {visibles.length} cours
                    {!estProfesseur && visibles.length > 0 && " · " + termines + " terminé(s)"}
                    {estProfesseur && dossier.cours.length > coursPublies.length && (
                      <span className="tag brouillon" style={{ marginLeft: 8 }}>
                        {dossier.cours.length - coursPublies.length} en préparation
                      </span>
                    )}
                  </span>
                </div>
              </Link>
              {estProfesseur && (
                <div className="actions-enseignant-dossier">
                  <details className="details-inline">
                    <summary className="btn-small btn-secondary">Modifier</summary>
                    <div className="popover-form">
                      <DossierForm categorieId={dossier.id} titreInitial={dossier.titre} />
                    </div>
                  </details>
                  <form action={deplacerDossierAction}>
                    <input type="hidden" name="id" value={dossier.id} />
                    <input type="hidden" name="sens" value="monter" />
                    <button type="submit" className="btn-small" title="Monter le dossier" disabled={index === 0}>
                      {"\u2191"}
                    </button>
                  </form>
                  <form action={deplacerDossierAction}>
                    <input type="hidden" name="id" value={dossier.id} />
                    <input type="hidden" name="sens" value="descendre" />
                    <button
                      type="submit"
                      className="btn-small"
                      title="Descendre le dossier"
                      disabled={index === dossiers.length - 1}
                    >
                      {"\u2193"}
                    </button>
                  </form>
                  <BoutonSuppression
                    action={supprimerDossierAction}
                    id={dossier.id}
                    message={
                      "Supprimer définitivement le dossier « " +
                      dossier.titre +
                      " » et tous les cours qu'il contient ? Cette action est irréversible."
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
