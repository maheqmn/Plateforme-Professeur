"use client";

import { useActionState } from "react";
import { parametresAction } from "./actions";

export default function ParametresForm({ dureeJours }: { dureeJours: number }) {
  const [etat, formAction, enCours] = useActionState(parametresAction, {});

  return (
    <div className="card admin-card">
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.message && <p className="confirm">{etat.message}</p>}
      <form action={formAction}>
        <div className="field" style={{ maxWidth: 380 }}>
          <label htmlFor="invitationDureeJours">Durée de validité des invitations (en jours)</label>
          <input
            id="invitationDureeJours"
            name="invitationDureeJours"
            type="number"
            min={1}
            max={30}
            defaultValue={dureeJours}
          />
        </div>
        <button type="submit" className="btn" disabled={enCours}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
