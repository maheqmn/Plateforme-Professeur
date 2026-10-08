import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { rendreContenu } from "@/lib/markdown";
import { formaterDateHeure } from "@/lib/calendrier";
import CoursForm from "../../cours-form";
import FichierForm from "../../fichier-form";
import BoutonSuppression from "@/components/bouton-suppression";
import {
  publierCoursAction,
  changerDossierCoursAction,
  supprimerFichierAction,
  basculerTerminerAction,
} from "../../actions";

// F2.3 : contenu d'un cours — texte mis en forme, fichiers joints, lien externe,
// case « Cours terminé » pour l'élève.
export default async function PageCoursDetail({
  params,
}: {
  params: Promise<{ categorieId: string; coursId: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const { categorieId, coursId } = await params;
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  const cours = await prisma.cours.findUnique({
    where: { id: coursId },
    include: {
      categorie: true,
      fichiers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!cours || cours.categorieId !== categorieId) notFound();
  // F2.6 : un cours en préparation n'est visible que du professeur.
  if (!estProfesseur && !cours.publie) notFound();

  let termine = false;
  if (!estProfesseur) {
    const progression = await prisma.progression.findUnique({
      where: { eleveId_coursId: { eleveId: utilisateur.id, coursId } },
    });
    termine = Boolean(progression);
  }

  const autresDossiers = estProfesseur
    ? await prisma.categorie.findMany({
        where: { id: { not: categorieId } },
        orderBy: { ordre: "asc" },
      })
    : [];

  const contenuHtml = rendreContenu(cours.contenu);

  return (
    <>
      <div className="crumbs">
        <Link href="/cours">Mes cours</Link> &gt;{" "}
        <Link href={`/cours/${categorieId}`}>{cours.categorie.titre}</Link> &gt;{" "}
        <strong>{cours.titre}</strong>
      </div>

      <h1 className="page-title">
        {cours.titre}{" "}
        {!cours.publie && (
          <span className="tag brouillon" style={{ marginLeft: 10, verticalAlign: "middle" }}>
            En préparation
          </span>
        )}
      </h1>
      <p className="page-subtitle">{cours.description}</p>
      {cours.dateSeance && (
        <p className="article-date">
          Séance le {formaterDateHeure(cours.dateSeance)} — voir le{" "}
          <Link className="link" href="/calendrier">
            calendrier
          </Link>
        </p>
      )}

      {estProfesseur && (
        <div className="zone-enseignant">
          <details className="details-form card">
            <summary>Modifier ce cours</summary>
            <CoursForm
              categorieId={categorieId}
              cours={{
                id: cours.id,
                titre: cours.titre,
                description: cours.description,
                contenu: cours.contenu,
                lienExterne: cours.lienExterne,
                dateSeance: cours.dateSeance
                  ? cours.dateSeance.getFullYear() +
                    "-" +
                    String(cours.dateSeance.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(cours.dateSeance.getDate()).padStart(2, "0") +
                    "T" +
                    String(cours.dateSeance.getHours()).padStart(2, "0") +
                    ":" +
                    String(cours.dateSeance.getMinutes()).padStart(2, "0")
                  : null,
                publie: cours.publie,
              }}
            />
          </details>

          <div className="card admin-card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <form action={publierCoursAction}>
              <input type="hidden" name="id" value={cours.id} />
              <button type="submit" className={cours.publie ? "btn btn-secondary" : "btn"}>
                {cours.publie ? "Repasser en préparation" : "Publier pour les élèves"}
              </button>
            </form>
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              {cours.publie
                ? "Ce cours est visible par vos élèves."
                : "Ce cours n'est visible que de vous."}
            </span>
          </div>

          {autresDossiers.length > 0 && (
            <form action={changerDossierCoursAction} className="card admin-card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="coursId" value={cours.id} />
              <label htmlFor="categorieIdCible" style={{ fontWeight: 600 }}>
                Déplacer ce cours vers :
              </label>
              <select id="categorieIdCible" name="categorieIdCible" className="champ-select">
                {autresDossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>
                    {dossier.titre}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-small btn-secondary">
                Déplacer
              </button>
            </form>
          )}

          <details className="details-form card">
            <summary>Ajouter un fichier joint</summary>
            <FichierForm coursId={cours.id} />
          </details>
        </div>
      )}

      <div className="card contenu-cours" dangerouslySetInnerHTML={{ __html: contenuHtml }} />

      {cours.fichiers.length > 0 && (
        <section aria-label="Fichiers du cours" className="file-list">
          <h2 className="section-title">Fichiers du cours</h2>
          {cours.fichiers.map((fichier) => (
            <div key={fichier.id} className="file-item">
              <span aria-hidden="true">{"\u{1F4CE}"}</span>
              <div>
                <strong>{fichier.nom}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {(fichier.taille / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo
                </p>
              </div>
              <a className="btn btn-small" href={`/fichiers/${fichier.id}`}>
                Télécharger
              </a>
              {estProfesseur && (
                <BoutonSuppression
                  action={supprimerFichierAction}
                  id={fichier.id}
                  libelle="Retirer"
                  message={"Supprimer le fichier « " + fichier.nom + " » ? Les élèves ne pourront plus le télécharger."}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {cours.lienExterne && (
        <p>
          <a className="btn btn-secondary" href={cours.lienExterne} target="_blank" rel="noopener noreferrer">
            Ouvrir le lien externe
          </a>
        </p>
      )}

      {!estProfesseur && (
        <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <form action={basculerTerminerAction}>
            <input type="hidden" name="coursId" value={cours.id} />
            <button type="submit" className={termine ? "btn btn-secondary" : "btn"}>
              {termine ? "Ce cours est terminé (annuler)" : "Marquer ce cours comme terminé"}
            </button>
          </form>
          <Link className="link" href={`/cours/${categorieId}`}>
            Retour aux cours
          </Link>
        </div>
      )}
    </>
  );
}
