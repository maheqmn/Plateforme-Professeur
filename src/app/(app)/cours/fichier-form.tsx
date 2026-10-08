"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ajouterFichierAction } from "./actions";

// F2.3 : ajout de fichiers joints (PDF, images, documents bureautiques),
// 10 Mo maximum par fichier. Glisser-déposer accepté, plusieurs fichiers d'un coup.
export default function FichierForm({ coursId }: { coursId: string }) {
  const [etat, formAction, enCours] = useActionState(ajouterFichierAction, {});
  const champFichier = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  function televerser(fichiers: FileList) {
    if (fichiers.length === 0) return;
    const donnees = new FormData();
    donnees.set("coursId", coursId);
    for (const fichier of Array.from(fichiers)) {
      donnees.append("fichier", fichier);
    }
    // Le dispatch de useActionState doit être appelé dans une transition
    // pour que isPending (enCours) se mette à jour correctement.
    startTransition(() => {
      formAction(donnees);
    });
    if (champFichier.current) {
      champFichier.current.value = "";
    }
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="coursId" value={coursId} />
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.message && <p className="confirm">{etat.message}</p>}
      <div
        className={"dropzone" + (survol ? " actif" : "")}
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt des fichiers"
        onClick={() => champFichier.current?.click()}
        onKeyDown={(evenement) => {
          if (evenement.key === "Enter" || evenement.key === " ") {
            evenement.preventDefault();
            champFichier.current?.click();
          }
        }}
        onDragOver={(evenement) => {
          evenement.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(evenement) => {
          evenement.preventDefault();
          setSurvol(false);
          televerser(evenement.dataTransfer.files);
        }}
      >
        <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
          {enCours ? "Ajout en cours..." : "Glissez vos fichiers ici"}
        </p>
        <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          ou cliquez pour parcourir votre ordinateur — 10 Mo maximum par fichier
          <br />
          (PDF, images, Word, PowerPoint...)
        </p>
      </div>
      <input
        ref={champFichier}
        type="file"
        name="fichier"
        multiple
        hidden
        onChange={(evenement) => {
          if (evenement.target.files && evenement.target.files.length > 0) {
            televerser(evenement.target.files);
          }
        }}
      />
    </form>
  );
}
