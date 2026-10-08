"use client";

import { useActionState } from "react";
import { reserverAction } from "../actions";

// F5.3 : confirmation simple — "Confirmer le rendez-vous du ... ?" avec le
// motif optionnel.
export default function ReserverForm({
  debut,
  duree,
}: {
  debut: string;
  duree: number;
}) {
  const [etat, formAction, enCours] = useActionState(reserverAction, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="debut" value={debut} />
      <input type="hidden" name="duree" value={duree} />
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <div className="field">
        <label htmlFor="motif">Motif (optionnel, ex. « Révision du cours 3 »)</label>
        <input id="motif" name="motif" placeholder="Ex. Révision du cours 3" />
      </div>
      <button type="submit" className="btn btn-large" disabled={enCours}>
        {enCours ? "Confirmation..." : "Confirmer le rendez-vous"}
      </button>
    </form>
  );
}
