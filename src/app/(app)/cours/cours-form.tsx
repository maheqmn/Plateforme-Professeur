"use client";

import { useActionState, useRef } from "react";
import { enregistrerCoursAction } from "./actions";

export type DonneesCours = {
  id: string;
  titre: string;
  description: string;
  contenu: string;
  lienExterne: string | null;
  publie: boolean;
};

// F2.3 / F2.5 : création ou modification d'un cours.
// Barre de mise en forme : titre, gras, liste (insertion de markdown simple).
export default function CoursForm({
  categorieId,
  cours,
}: {
  categorieId: string;
  cours?: DonneesCours;
}) {
  const [etat, formAction, enCours] = useActionState(enregistrerCoursAction, {});
  const zoneTexte = useRef<HTMLTextAreaElement>(null);
  const modification = Boolean(cours);

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
  }

  return (
    <form action={formAction} className="cours-formulaire">
      <input type="hidden" name="categorieId" value={categorieId} />
      {cours && <input type="hidden" name="coursId" value={cours.id} />}
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <div className="field">
        <label htmlFor="titre">Titre du cours</label>
        <input id="titre" name="titre" defaultValue={cours?.titre ?? ""} required />
      </div>
      <div className="field">
        <label htmlFor="description">Courte description (affichée dans la liste des cours)</label>
        <input id="description" name="description" defaultValue={cours?.description ?? ""} required />
      </div>
      <div className="field">
        <label htmlFor="contenu">Contenu du cours</label>
        <div className="toolbar" role="group" aria-label="Mise en forme du texte">
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("## ")}>
            Titre
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("**", "**")}>
            Gras
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={() => inserer("- ")}>
            Liste
          </button>
        </div>
        <textarea
          id="contenu"
          name="contenu"
          ref={zoneTexte}
          rows={10}
          className="champ-texte"
          defaultValue={cours?.contenu ?? ""}
          placeholder="Rédigez ici le contenu du cours. Utilisez les boutons ci-dessus pour mettre en forme : titres, gras, listes."
        />
      </div>
      <div className="field">
        <label htmlFor="lienExterne">Lien externe (optionnel : vidéo, article...)</label>
        <input id="lienExterne" name="lienExterne" type="url" defaultValue={cours?.lienExterne ?? ""} placeholder="https://..." />
      </div>
      <div className="checkbox-line">
        <input id="publie" name="publie" type="checkbox" defaultChecked={cours?.publie ?? false} />
        <label htmlFor="publie">Visible par les élèves</label>
      </div>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: -8, marginBottom: 16 }}>
        Par défaut, un nouveau cours est « en préparation » : seul vous pouvez le voir. Cochez la case pour le
        rendre visible.
      </p>
      <button type="submit" className="btn" disabled={enCours}>
        {modification ? "Enregistrer les modifications" : "Créer le cours"}
      </button>
    </form>
  );
}
