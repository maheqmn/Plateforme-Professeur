"use client";

import { useActionState } from "react";
import { enregistrerDossierAction } from "./actions";

// F2.5 : création ou renommage d'un dossier de niveau 1.
export default function DossierForm({ categorieId, titreInitial }: { categorieId?: string; titreInitial?: string }) {
  const [etat, formAction, enCours] = useActionState(enregistrerDossierAction, {});
  const modification = Boolean(categorieId);

  return (
    <form action={formAction} className="dossier-formulaire">
      {categorieId && <input type="hidden" name="categorieId" value={categorieId} />}
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <div className="field">
        <label htmlFor={"titre-dossier-" + (categorieId ?? "nouveau")}>Titre du dossier</label>
        <input id={"titre-dossier-" + (categorieId ?? "nouveau")} name="titre" defaultValue={titreInitial ?? ""} required />
      </div>
      <button type="submit" className="btn" disabled={enCours}>
        {modification ? "Renommer le dossier" : "Créer le dossier"}
      </button>
    </form>
  );
}
