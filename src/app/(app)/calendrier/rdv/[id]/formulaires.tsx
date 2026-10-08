"use client";

import { useActionState } from "react";
import { definirLienTeamsAction, deplacerRdvAction } from "../../actions";

// F5.5 : champ "Lien Teams" rempli par le professeur.
export function LienTeamsForm({ id, valeur }: { id: string; valeur: string | null }) {
  const [etat, formAction, enCours] = useActionState(definirLienTeamsAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.message && <p className="confirm">{etat.message}</p>}
      <div className="field">
        <label htmlFor="lienTeams">Lien Microsoft Teams de la réunion</label>
        <input
          id="lienTeams"
          name="lienTeams"
          type="url"
          defaultValue={valeur ?? ""}
          placeholder="https://teams.microsoft.com/..."
        />
      </div>
      <button type="submit" className="btn-small" disabled={enCours}>
        {enCours ? "Enregistrement..." : valeur ? "Mettre à jour le lien" : "Enregistrer le lien"}
      </button>
    </form>
  );
}

// F5.6 : déplacement du rendez-vous par le professeur.
function versDateLocal(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0") +
    "T" +
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

export function DeplacerForm({ id, debut }: { id: string; debut: Date }) {
  const [etat, formAction, enCours] = useActionState(deplacerRdvAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.message && <p className="confirm">{etat.message}</p>}
      <div className="field">
        <label htmlFor="debut">Nouvelle date et heure</label>
        <input id="debut" name="debut" type="datetime-local" defaultValue={versDateLocal(debut)} required />
      </div>
      <button type="submit" className="btn-small" disabled={enCours}>
        {enCours ? "Déplacement..." : "Déplacer le rendez-vous"}
      </button>
    </form>
  );
}
