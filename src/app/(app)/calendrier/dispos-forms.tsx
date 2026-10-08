"use client";

import { useActionState } from "react";
import { ajouterDisponibiliteAction, ajouterDateBloqueeAction } from "./actions";

const JOURS = [
  { valeur: 1, libelle: "Lundi" },
  { valeur: 2, libelle: "Mardi" },
  { valeur: 3, libelle: "Mercredi" },
  { valeur: 4, libelle: "Jeudi" },
  { valeur: 5, libelle: "Vendredi" },
  { valeur: 6, libelle: "Samedi" },
  { valeur: 7, libelle: "Dimanche" },
];

// F5.2 : définition des disponibilités récurrentes et des dates bloquées.
export default function DisposForms({ bloquee = false }: { bloquee?: boolean }) {
  const [etat, formAction, enCours] = useActionState(
    bloquee ? ajouterDateBloqueeAction : ajouterDisponibiliteAction,
    {}
  );

  return (
    <form action={formAction} className="dispos-formulaire">
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {bloquee ? (
        <div className="field">
          <label htmlFor="date">Date à bloquer</label>
          <input id="date" name="date" type="date" required />
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="jour">Jour de la semaine</label>
            <select id="jour" name="jour" className="champ-select">
              {JOURS.map((j) => (
                <option key={j.valeur} value={j.valeur}>
                  {j.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="debut">De</label>
            <input id="debut" name="debut" type="time" required />
          </div>
          <div className="field">
            <label htmlFor="fin">À</label>
            <input id="fin" name="fin" type="time" required />
          </div>
        </>
      )}
      <button type="submit" className="btn-small" disabled={enCours}>
        {bloquee ? "Bloquer la date" : "Ajouter la disponibilité"}
      </button>
    </form>
  );
}
