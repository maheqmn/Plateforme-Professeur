"use client";

import { useActionState } from "react";
import { creerRdvAction, planifierCoursAction } from "../actions";

// Création d'événement par le professeur (style Teams) : rendez-vous avec un
// élève, ou planification de la séance d'un cours. La date peut venir d'un
// double-clic sur un jour du calendrier.
export default function EvenementForms({
  dateSuggeree,
  eleves,
  cours,
}: {
  dateSuggeree: string; // "YYYY-MM-DDTHH:mm" ou "YYYY-MM-DD"
  eleves: { id: string; nom: string }[];
  cours: { id: string; titre: string; date: string | null }[];
}) {
  const valeurDate = dateSuggeree.length === 10 ? dateSuggeree + "T15:00" : dateSuggeree;
  const [etatRdv, rdvAction, rdvEnCours] = useActionState(creerRdvAction, {});
  const [etatCours, coursAction, coursEnCours] = useActionState(planifierCoursAction, {});

  return (
    <div className="evenement-formulaires">
      <section className="card admin-card" aria-label="Nouveau rendez-vous">
        <h3 style={{ marginTop: 0 }}>Nouveau rendez-vous</h3>
        <form action={rdvAction}>
          {etatRdv.erreur && (
            <p className="alert" role="alert">
              {etatRdv.erreur}
            </p>
          )}
          <div className="field">
            <label htmlFor="eleveId">Élève</label>
            <select id="eleveId" name="eleveId" className="champ-select" required>
              {eleves.map((eleve) => (
                <option key={eleve.id} value={eleve.id}>
                  {eleve.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rdv-debut">Date et heure</label>
            <input id="rdv-debut" name="debut" type="datetime-local" defaultValue={valeurDate} required />
          </div>
          <div className="field">
            <label htmlFor="duree">Durée</label>
            <select id="duree" name="duree" className="champ-select">
              <option value={30}>30 minutes</option>
              <option value={60}>1 heure</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="motif">Motif (optionnel)</label>
            <input id="motif" name="motif" placeholder="Ex. Révision du cours 3" />
          </div>
          <div className="field">
            <label htmlFor="lienTeams">Lien Teams (optionnel)</label>
            <input id="lienTeams" name="lienTeams" type="url" placeholder="https://teams.microsoft.com/..." />
          </div>
          <button type="submit" className="btn" disabled={rdvEnCours}>
            {rdvEnCours ? "Création..." : "Créer le rendez-vous"}
          </button>
        </form>
      </section>

      <section className="card admin-card" aria-label="Planifier un cours">
        <h3 style={{ marginTop: 0 }}>Planifier un cours</h3>
        <form action={coursAction}>
          {etatCours.erreur && (
            <p className="alert" role="alert">
              {etatCours.erreur}
            </p>
          )}
          <div className="field">
            <label htmlFor="coursId">Cours</label>
            <select id="coursId" name="coursId" className="champ-select" required>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titre}
                  {c.date ? " (déjà le " + c.date + ")" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cours-debut">Date et heure de la séance</label>
            <input id="cours-debut" name="debut" type="datetime-local" defaultValue={valeurDate} required />
          </div>
          <button type="submit" className="btn" disabled={coursEnCours}>
            {coursEnCours ? "Enregistrement..." : "Planifier le cours"}
          </button>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
            Un email préviendra vos élèves si le cours est publié.
          </p>
        </form>
      </section>
    </div>
  );
}
