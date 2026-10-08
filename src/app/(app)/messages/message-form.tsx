"use client";

import { useActionState, useRef } from "react";
import { envoyerMessageAction } from "./actions";

// F4.2 / F4.4 : saisie en bas de la conversation, bouton "Envoyer" grand et
// visible, pièces jointes (images, PDF, 10 Mo maximum par fichier).
export default function MessageForm({ eleveId }: { eleveId: string }) {
  const [etat, formAction, enCours] = useActionState(envoyerMessageAction, {});
  const champFichier = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="chat-formulaire">
      <input type="hidden" name="eleveId" value={eleveId} />
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <label htmlFor="texte" className="text-muted" style={{ fontSize: "0.85rem" }}>
        Votre message
      </label>
      <textarea
        id="texte"
        name="texte"
        rows={3}
        className="champ-texte"
        placeholder="Écrivez votre message ici..."
      />
      <div className="chat-formulaire-actions">
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={() => champFichier.current?.click()}
        >
          Joindre des fichiers
        </button>
        <button type="submit" className="btn btn-large" disabled={enCours}>
          {enCours ? "Envoi..." : "Envoyer"}
        </button>
      </div>
      <input ref={champFichier} type="file" name="fichier" multiple hidden />
    </form>
  );
}
