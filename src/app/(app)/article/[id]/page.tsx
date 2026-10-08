import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { rendreContenu } from "@/lib/markdown";
import BoutonSuppression from "@/components/bouton-suppression";
import { supprimerArticleAction } from "../actions";

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formaterTaille(octets: number): string {
  if (octets < 1024 * 1024) return Math.max(1, Math.round(octets / 1024)) + " Ko";
  return (octets / (1024 * 1024)).toFixed(1).replace(".", ",") + " Mo";
}

// F3.3 : article complet — titre, date, image d'illustration, texte mis en forme,
// fichiers attachés. En pied d'article : "Publié par [nom]" et "Retour aux articles".
export default async function PageArticle({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: { fichiers: { where: { estContenu: false }, orderBy: { createdAt: "asc" } } },
  });
  if (!article) notFound();
  // Un élève ne voit que les articles publiés (F3.4 : brouillon = professeur seul).
  if (!estProfesseur && !article.publie) notFound();

  const professeur = await prisma.user.findFirst({ where: { role: "PROFESSEUR" } });
  const date = article.publieLe ?? article.createdAt;

  return (
    <>
      <div className="crumbs">
        <Link href="/">Accueil</Link> &gt; <strong>{article.titre}</strong>
      </div>

      <article className="article-complet">
        <header>
          <h1 className="page-title">{article.titre}</h1>
          <p className="article-date">
            {article.epingle && <span className="tag une">À la une</span>}{" "}
            Publié le {formaterDate(date)}
            {!article.publie && (
              <span className="tag brouillon" style={{ marginLeft: 8 }}>
                Brouillon — visible de vous seul
              </span>
            )}
          </p>
        </header>

        {article.imageNomStocke && (
          <img
            className="article-illustration"
            src={"/article/" + article.id + "/image"}
            alt={"Illustration de l'article " + article.titre}
          />
        )}

        <div className="contenu-cours" dangerouslySetInnerHTML={{ __html: rendreContenu(article.contenu) }} />

        {article.fichiers.length > 0 && (
          <section aria-label="Fichiers joints à cet article">
            <h2 className="section-title">Fichiers joints</h2>
            <ul className="file-list">
              {article.fichiers.map((fichier) => (
                <li key={fichier.id} className="file-item">
                  <span aria-hidden="true">{"\u{1F4C4}"}</span>
                  <div>
                    <a className="link" href={"/fichiers/" + fichier.id} download>
                      {fichier.nom}
                    </a>
                    <span className="text-muted"> — {formaterTaille(fichier.taille)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* F3.3 : pied d'article */}
        <footer className="article-pied">
          {professeur && (
            <p className="article-auteur">
              Publié par {professeur.prenom} {professeur.nom}
            </p>
          )}
          <Link className="btn" href="/">
            Retour aux articles
          </Link>
        </footer>
      </article>

      {estProfesseur && (
        <div className="actions-enseignant article-actions">
          <Link className="btn-small btn-secondary" href={"/article/" + article.id + "/modifier"}>
            Modifier
          </Link>
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
    </>
  );
}
