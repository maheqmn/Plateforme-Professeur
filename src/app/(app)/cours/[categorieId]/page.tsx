import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import CoursForm from "../cours-form";
import BoutonSuppression from "@/components/bouton-suppression";
import { supprimerCoursAction, deplacerCoursAction } from "../actions";

// F2.2 : vue élèves — liste des cours de niveau 2 d'un dossier.
// F2.4 : la consultation de la catégorie est comptée (progression).
export default async function PageCategorie({
  params,
}: {
  params: Promise<{ categorieId: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const { categorieId } = await params;
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const categorie = await prisma.categorie.findUnique({
    where: { id: categorieId },
    include: { cours: { orderBy: { ordre: "asc" } } },
  });
  if (!categorie) notFound();

  if (!estProfesseur) {
    await prisma.consultation.upsert({
      where: { eleveId_categorieId: { eleveId: utilisateur.id, categorieId } },
      create: { eleveId: utilisateur.id, categorieId, nb: 1 },
      update: { nb: { increment: 1 } },
    });
  }

  const coursVisibles = estProfesseur ? categorie.cours : categorie.cours.filter((c) => c.publie);

  const termines = new Set<string>();
  if (!estProfesseur) {
    const progressions = await prisma.progression.findMany({
      where: { eleveId: utilisateur.id, cours: { categorieId } },
      select: { coursId: true },
    });
    for (const p of progressions) termines.add(p.coursId);
  }

  return (
    <>
      <div className="crumbs">
        <Link href="/cours">Mes cours</Link> &gt; <strong>{categorie.titre}</strong>
      </div>
      <h1 className="page-title">{categorie.titre}</h1>
      <p className="page-subtitle">
        {estProfesseur
          ? "Gérez les cours de ce dossier. Les cours en préparation ne sont visibles que de vous."
          : "Ouvrez un cours pour le lire, télécharger ses fichiers et le marquer comme terminé."}
      </p>

      {estProfesseur && (
        <details className="details-form card">
          <summary>Nouveau cours</summary>
          <CoursForm categorieId={categorie.id} />
        </details>
      )}

      <div className="course-list">
        {coursVisibles.length === 0 && (
          <div className="card empty-state">
            <div className="empty-icon" aria-hidden="true">
              {"\u{1F4C4}"}
            </div>
            <h2>Aucun cours dans ce dossier</h2>
            <p>
              {estProfesseur
                ? "Créez un premier cours avec le bouton « Nouveau cours » ci-dessus."
                : "Votre professeur n'a pas encore publié de cours dans ce dossier."}
            </p>
          </div>
        )}
        {coursVisibles.map((cours, index) => (
          <div key={cours.id} className="course-item">
            <span className="doc-icon" aria-hidden="true">
              {"\u{1F4C4}"}
            </span>
            <div>
              <h3>
                <Link href={`/cours/${categorie.id}/${cours.id}`}>{cours.titre}</Link>
                {!cours.publie && (
                  <span className="tag brouillon" style={{ marginLeft: 10 }}>
                    En préparation
                  </span>
                )}
              </h3>
              <p className="course-desc">{cours.description}</p>
            </div>
            {!estProfesseur &&
              (termines.has(cours.id) ? (
                <span className="done-tag">{"\u2713"} Terminé</span>
              ) : (
                <Link className="btn btn-small" href={`/cours/${categorie.id}/${cours.id}`}>
                  Ouvrir le cours
                </Link>
              ))}
            {estProfesseur && (
              <div className="actions-enseignant">
                <Link className="btn-small btn-secondary" href={`/cours/${categorie.id}/${cours.id}`}>
                  Modifier
                </Link>
                <form action={deplacerCoursAction}>
                  <input type="hidden" name="id" value={cours.id} />
                  <input type="hidden" name="sens" value="monter" />
                  <button type="submit" className="btn-small" title="Monter le cours" disabled={index === 0}>
                    {"\u2191"}
                  </button>
                </form>
                <form action={deplacerCoursAction}>
                  <input type="hidden" name="id" value={cours.id} />
                  <input type="hidden" name="sens" value="descendre" />
                  <button
                    type="submit"
                    className="btn-small"
                    title="Descendre le cours"
                    disabled={index === coursVisibles.length - 1}
                  >
                    {"\u2193"}
                  </button>
                </form>
                <BoutonSuppression
                  action={supprimerCoursAction}
                  id={cours.id}
                  message={
                    "Supprimer définitivement le cours « " + cours.titre + " » ? Cette action est irréversible."
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
