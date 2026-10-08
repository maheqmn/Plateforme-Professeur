"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { startTransition } from "react";
import {
  enregistrerArticleAction,
  definirIllustrationAction,
  supprimerIllustrationAction,
  ajouterPiecesAction,
  supprimerPieceAction,
  ajouterImageContenuAction,
} from "./actions";

export type DonneesArticle = {
  id: string;
  titre: string;
  contenu: string;
  publie: boolean;
  aIllustration: boolean;
};

export type DonneesPiece = { id: string; nom: string; taille: number };

function formaterTaille(octets: number): string {
  if (octets < 1024 * 1024) return Math.max(1, Math.round(octets / 1024)) + " Ko";
  return (octets / (1024 * 1024)).toFixed(1).replace(".", ",") + " Mo";
}

// F3.4 : éditeur simple du professeur — titre, image d'illustration (optionnelle),
// contenu mis en forme (titre, gras, listes, liens, images par téléchargement),
// statut brouillon / publié, et enregistrement automatique toutes les 60 secondes.
export default function EditeurArticle({
  article,
  pieces,
}: {
  article: DonneesArticle;
  pieces: DonneesPiece[];
}) {
  const [titre, setTitre] = useState(article.titre);
  const [contenu, setContenu] = useState(article.contenu);
  const [publie, setPublie] = useState(article.publie);
  const [aIllustration, setAIllustration] = useState(article.aIllustration);
  const [listePieces, setListePieces] = useState<DonneesPiece[]>(pieces);
  const [statut, setStatut] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, commencerTransition] = useTransition();

  const zoneTexte = useRef<HTMLTextAreaElement>(null);
  const champIllustration = useRef<HTMLInputElement>(null);
  const champImage = useRef<HTMLInputElement>(null);
  const champPieces = useRef<HTMLInputElement>(null);

  // Suivi des modifications non enregistrées (pour l'autosave et l'alerte de sortie).
  const modifie = useRef(false);

  function marquerModifie() {
    modifie.current = true;
  }

  const sauvegarder = useCallback(() => {
    if (!modifie.current) return;
    const donnees = new FormData();
    donnees.set("id", article.id);
    donnees.set("titre", titre);
    donnees.set("contenu", contenu);
    donnees.set("publie", String(publie));
    startTransition(async () => {
      const resultat = await enregistrerArticleAction(donnees);
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      modifie.current = false;
      setErreur("");
      setStatut("Enregistré à " + (resultat.enregistreLe ?? ""));
    });
  }, [article.id, titre, contenu, publie]);

  // F3.4 : enregistrement automatique toutes les 60 secondes.
  useEffect(() => {
    const minuteur = setInterval(sauvegarder, 60_000);
    return () => clearInterval(minuteur);
  }, [sauvegarder]);

  // Sécurité : ne pas perdre le contenu si l'onglet est fermé entre deux enregistrements.
  useEffect(() => {
    const avertir = (evenement: BeforeUnloadEvent) => {
      if (!modifie.current) return;
      evenement.preventDefault();
    };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, []);

  function inserer(avant: string, apres = "") {
    const el = zoneTexte.current;
    if (!el) return;
    const debut = el.selectionStart ?? 0;
    const fin = el.selectionEnd ?? 0;
    const texte = el.value;
    const selection = texte.slice(debut, fin) || "texte";
    el.value = texte.slice(0, debut) + avant + selection + apres + texte.slice(fin);
    const curseur = debut + avant.length + selection.length + apres.length;
    el.setSelectionRange(curseur, curseur);
    el.focus();
    setContenu(el.value);
    marquerModifie();
  }

  // F3.4 : images par téléchargement. L'image est enregistrée sur la plateforme,
  // puis une référence markdown est insérée dans le contenu.
  function televerserImageContenu(fichiers: FileList) {
    if (fichiers.length === 0) return;
    const donnees = new FormData();
    donnees.set("id", article.id);
    donnees.set("image", fichiers[0]);
    startTransition(async () => {
      const resultat = await ajouterImageContenuAction(donnees);
      if (resultat.erreur || !resultat.url) {
        setErreur(resultat.erreur ?? "L'image n'a pas pu être ajoutée.");
        return;
      }
      inserer("\n![" + fichiers[0].name.replace(/[[\]]/g, "") + "](" + resultat.url + ")\n");
    });
    if (champImage.current) champImage.current.value = "";
  }

  function televerserIllustration(fichiers: FileList) {
    if (fichiers.length === 0) return;
    const donnees = new FormData();
    donnees.set("id", article.id);
    donnees.set("image", fichiers[0]);
    startTransition(async () => {
      const resultat = await definirIllustrationAction(donnees);
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      setAIllustration(true);
      setErreur("");
      setStatut("Image d'illustration mise à jour.");
    });
    if (champIllustration.current) champIllustration.current.value = "";
  }

  function televerserPieces(fichiers: FileList) {
    if (fichiers.length === 0) return;
    const donnees = new FormData();
    donnees.set("id", article.id);
    for (const fichier of Array.from(fichiers)) {
      donnees.append("fichier", fichier);
    }
    startTransition(async () => {
      const resultat = await ajouterPiecesAction(donnees);
      if (resultat.erreur) setErreur(resultat.erreur);
      else setErreur("");
      if (resultat.message) setStatut(resultat.message);
      if (resultat.joints) {
        setListePieces((precedentes) => [...resultat.joints!, ...precedentes]);
      }
    });
    if (champPieces.current) champPieces.current.value = "";
  }

  function retirerPiece(id: string) {
    const donnees = new FormData();
    donnees.set("id", id);
    if (!window.confirm("Supprimer définitivement la pièce jointe ?")) return;
    startTransition(async () => {
      await supprimerPieceAction(donnees);
      setListePieces((precedentes) => precedentes.filter((p) => p.id !== id));
    });
  }

  function retirerIllustration() {
    if (!window.confirm("Supprimer l'image d'illustration ?")) return;
    const donnees = new FormData();
    donnees.set("id", article.id);
    startTransition(async () => {
      await supprimerIllustrationAction(donnees);
      setAIllustration(false);
    });
  }

  return (
    <>
      {erreur && (
        <p className="alert" role="alert">
          {erreur}
        </p>
      )}

      <div className="field">
        <label htmlFor="titre">Titre de l&apos;article</label>
        <input
          id="titre"
          value={titre}
          onChange={(evenement) => {
            setTitre(evenement.target.value);
            marquerModifie();
          }}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="contenu">Contenu de l&apos;article</label>
        <div className="toolbar" role="group" aria-label="Mise en forme du texte">
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("\n## ")}>
            Titre
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("**", "**")}>
            Gras
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("\n- ")}>
            Liste
          </button>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => inserer("[", "](https://)")}
          >
            Lien
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={() => champImage.current?.click()}>
            Image
          </button>
        </div>
        <textarea
          id="contenu"
          ref={zoneTexte}
          rows={14}
          className="champ-texte"
          value={contenu}
          onChange={(evenement) => {
            setContenu(evenement.target.value);
            marquerModifie();
          }}
          placeholder="Rédigez ici votre article. Utilisez les boutons ci-dessus pour mettre en forme : titres, gras, listes, liens, images."
        />
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
          L&apos;article s&apos;enregistre automatiquement toutes les 60 secondes.
        </p>
      </div>

      <div className="field">
        <label>Image d&apos;illustration (affichée sur la carte et en tête d&apos;article, optionnelle)</label>
        {aIllustration ? (
          <div className="illustration-apercu">
            <img src={"/article/" + article.id + "/image"} alt="Illustration actuelle de l'article" />
            <div>
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => champIllustration.current?.click()}
              >
                Remplacer l&apos;image
              </button>{" "}
              <button type="button" className="btn-small btn-danger" onClick={retirerIllustration}>
                Supprimer l&apos;image
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-small btn-secondary" onClick={() => champIllustration.current?.click()}>
            Choisir une image
          </button>
        )}
        <input
          ref={champIllustration}
          type="file"
          accept="image/*"
          hidden
          onChange={(evenement) => evenement.target.files && televerserIllustration(evenement.target.files)}
        />
        <input
          ref={champImage}
          type="file"
          accept="image/*"
          hidden
          onChange={(evenement) => evenement.target.files && televerserImageContenu(evenement.target.files)}
        />
      </div>

      <div className="field">
        <label>Fichiers joints à l&apos;article (PDF, documents... 10 Mo maximum par fichier)</label>
        <button type="button" className="btn-small btn-secondary" onClick={() => champPieces.current?.click()}>
          Ajouter des fichiers
        </button>
        <input
          ref={champPieces}
          type="file"
          multiple
          hidden
          onChange={(evenement) => evenement.target.files && televerserPieces(evenement.target.files)}
        />
        {listePieces.length > 0 && (
          <ul className="file-list">
            {listePieces.map((piece) => (
              <li key={piece.id} className="file-item">
                <span aria-hidden="true">{"\u{1F4C4}"}</span>
                <div>
                  {piece.nom}
                  <span className="text-muted"> — {formaterTaille(piece.taille)}</span>
                </div>
                <button type="button" className="btn-small btn-danger" onClick={() => retirerPiece(piece.id)}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="checkbox-line">
        <input
          id="publie"
          type="checkbox"
          checked={publie}
          onChange={(evenement) => {
            setPublie(evenement.target.checked);
            marquerModifie();
          }}
        />
        <label htmlFor="publie">Publié (visible par les élèves)</label>
      </div>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: -8, marginBottom: 16 }}>
        Par défaut, l&apos;article est un « brouillon » : seul vous pouvez le voir. Cochez la case pour le publier.
      </p>

      <div className="editeur-pied">
        <button type="button" className="btn" disabled={enCours} onClick={sauvegarder}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <span className="editeur-statut" role="status">
          {statut}
        </span>
      </div>
    </>
  );
}
