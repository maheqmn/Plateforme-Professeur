import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import BoutonSuppression from "@/components/bouton-suppression";
import {
  creerArticleAction,
  publierArticleAction,
  epinglerArticleAction,
  supprimerArticleAction,
} from "./article/actions";

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Chapô de deux lignes (F3.1), dérivé du contenu : la mise en forme markdown
// est retirée et le texte est coupé proprement.
function chapo(contenu: string): string {
  const texte = contenu
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (texte.length <= 170) return texte;
  const coupe = texte.slice(0, 170);
  const dernierEspace = coupe.lastIndexOf(" ");
  return coupe.slice(0, dernierEspace > 120 ? dernierEspace : 170) + "…";
}

// F3.1 : le dashboard est le blog — les derniers articles s'affichent en cartes.
// F2.4 : progression de l'élève dans la catégorie qu'il consulte le plus.
export default async function PageAccueil() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");

  const estProfesseur = utilisateur.role === "PROFESSEUR";

  let progression: { total: number; termines: number; titre: string } | null = null;
  if (!estProfesseur) {
    // Catégorie la plus consultée par l'élève, sinon la première catégorie publiée.
    const consultations = await prisma.consultation.findMany({
      where: { eleveId: utilisateur.id },
      orderBy: { nb: "desc" },
    });
    let categorieRetenue: string | null = null;
    for (const consultation of consultations) {
      const nbPublies = await prisma.cours.count({
        where: { categorieId: consultation.categorieId, publie: true },
      });
      if (nbPublies > 0) {
        categorieRetenue = consultation.categorieId;
        break;
      }
    }
    if (!categorieRetenue) {
      const categories = await prisma.categorie.findMany({ orderBy: { ordre: "asc" } });
      for (const categorie of categories) {
        const nbPublies = await prisma.cours.count({
          where: { categorieId: categorie.id, publie: true },
        });
        if (nbPublies > 0) {
          categorieRetenue = categorie.id;
          break;
        }
      }
    }
    if (categorieRetenue) {
      const categorie = await prisma.categorie.findUnique({ where: { id: categorieRetenue } });
      if (categorie) {
        const total = await prisma.cours.count({
          where: { categorieId: categorieRetenue, publie: true },
        });
        const termines = await prisma.progression.count({
          where: {
            eleveId: utilisateur.id,
            cours: { categorieId: categorieRetenue, publie: true },
          },
        });
        progression = { total, termines, titre: categorie.titre };
      }
    }
  }

  // F3.6 : articles épinglés en tête, puis ordre antichronologique.
  const articles = await prisma.article.findMany({
    where: estProfesseur ? {} : { publie: true },
    orderBy: [{ epingle: "desc" }, { publieLe: "desc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <h1 className="page-title">Bonjour {utilisateur.prenom}</h1>
      <p className="page-subtitle">
        {estProfesseur
          ? "Voici votre blog, la page que vos élèves voient en arrivant."
          : "Voici les dernières nouvelles de votre professeur."}
      </p>

      {progression && progression.total > 0 && (
        <section className="welcome" aria-label="Votre progression">
          <div>
            <h2>Votre progression</h2>
            <p>Continuez sur votre lancée, un cours à la fois.</p>
          </div>
          <div className="progress">
            <strong>
              {progression.termines} / {progression.total}
            </strong>
            <span>cours terminés dans « {progression.titre} »</span>
          </div>
        </section>
      )}

      {estProfesseur && (
        <form action={creerArticleAction} style={{ marginBottom: 24 }}>
          <button type="submit" className="btn">
            Nouvel article
          </button>
        </form>
      )}

      {articles.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon" aria-hidden="true">
            {"\u{1F4F0}"}
          </div>
          <h2>Aucun article pour le moment</h2>
          <p>
            {estProfesseur
              ? "Cliquez sur « Nouvel article » pour écrire votre premier article : guide pratique, actualité, astuce..."
              : "Votre professeur publiera bientôt des guides et des actualités. Revenez régulièrement !"}
          </p>
        </div>
      ) : (
        <div className="article-grid">
          {articles.map((article) => (
            <div key={article.id} className="article-bloc">
              {/* F3.1 : carte — image ou illustration, titre, date, chapô, bouton */}
              <Link className="article-card" href={"/article/" + article.id}>
                {article.imageNomStocke ? (
                  <img
                    className="article-card-image"
                    src={"/article/" + article.id + "/image"}
                    alt={"Illustration de l'article " + article.titre}
                  />
                ) : (
                  <div className="article-card-image article-card-vide" aria-hidden="true">
                    {"\u{1F4F0}"}
                  </div>
                )}
                <div className="article-card-corps">
                  <div className="article-cartouche">
                    {article.epingle && <span className="tag une">À la une</span>}
                    {!article.publie && <span className="tag brouillon">Brouillon</span>}
                  </div>
                  <h3>{article.titre}</h3>
                  <p className="article-date">
                    {formaterDate(article.publieLe ?? article.createdAt)}
                  </p>
                  <p className="article-chapo">{chapo(article.contenu)}</p>
                  <span className="btn article-lire">Lire l&apos;article</span>
                </div>
              </Link>

              {estProfesseur && (
                <div className="actions-enseignant-dossier article-actions">
                  <Link
                    className="btn-small btn-secondary"
                    href={"/article/" + article.id + "/modifier"}
                  >
                    Modifier
                  </Link>
                  <form action={publierArticleAction}>
                    <input type="hidden" name="id" value={article.id} />
                    <button type="submit" className="btn-small">
                      {article.publie ? "Retirer" : "Publier"}
                    </button>
                  </form>
                  {article.publie && (
                    <form action={epinglerArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="btn-small btn-secondary"
                        title={article.epingle ? "Retirer de la une" : "Afficher en tête du blog"}
                      >
                        {article.epingle ? "Retirer de la une" : "À la une"}
                      </button>
                    </form>
                  )}
                  <BoutonSuppression
                    action={supprimerArticleAction}
                    id={article.id}
                    message={
                      "Supprimer définitivement l'article « " +
                      article.titre +
                      " » ? Cette action est irréversible."
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
