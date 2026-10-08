"use client";

import { useActionState } from "react";
import { parametresAction } from "./actions";

// F6.3 : paramètres du professeur. Durée des créneaux et nombre de
// rendez-vous simultanés ajoutés en phase 5 (F5.2, F5.8).
export default function ParametresForm({
  dureeJours,
  dureeCreneau,
  maxRdv,
}: {
  dureeJours: number;
  dureeCreneau: number;
  maxRdv: number;
}) {
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
        <div className="field" style={{ maxWidth: 380 }}>
          <label htmlFor="rdvDureeCreneau">Durée des créneaux de rendez-vous</label>
          <select id="rdvDureeCreneau" name="rdvDureeCreneau" className="champ-select" defaultValue={dureeCreneau}>
            <option value={30}>30 minutes</option>
            <option value={60}>1 heure</option>
          </select>
        </div>
        <div className="field" style={{ maxWidth: 380 }}>
          <label htmlFor="rdvMaxEleve">
            Nombre de rendez-vous à venir autorisés par élève en même temps
          </label>
          <input id="rdvMaxEleve" name="rdvMaxEleve" type="number" min={1} max={10} defaultValue={maxRdv} />
        </div>
        <button type="submit" className="btn" disabled={enCours}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
