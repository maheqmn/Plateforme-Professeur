"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { prolongerSessionAction } from "./actions";

// F1.7 : avertissement « Vous allez être déconnecté » 2 minutes avant
// l'expiration de la session (30 minutes sans activité). Toute interaction
// avec la page relance le décompte ; le bouton « Rester connecté » prolonge
// la session côté serveur.
const DUREE_INACTIVITE_MS = 30 * 60 * 1000;
const AVERTISSEMENT_AVANT_MS = 2 * 60 * 1000;

export default function AvertissementSession() {
  const [averti, setAverti] = useState(false);
  const [reste, setReste] = useState(DUREE_INACTIVITE_MS);
  const minuteur = useRef<number | null>(null);
  const [enCours, commencerTransition] = useTransition();

  function relancer() {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    setAverti(false);
    setReste(DUREE_INACTIVITE_MS);
    // Avertissement 2 minutes avant l'expiration.
    minuteur.current = window.setTimeout(() => {
      setAverti(true);
      setReste(AVERTISSEMENT_AVANT_MS);
      // Déconnexion automatique quand le temps est écoulé.
      window.setTimeout(() => {
        window.location.assign("/connexion?expire=1");
      }, AVERTISSEMENT_AVANT_MS);
    }, DUREE_INACTIVITE_MS - AVERTISSEMENT_AVANT_MS);
  }

  useEffect(() => {
    relancer();
    // Toute activité de l'utilisateur relance le décompte.
    const ecouteurs = ["pointerdown", "keydown"] as const;
    for (const ecouteur of ecouteurs) {
      window.addEventListener(ecouteur, relancer);
    }
    return () => {
      if (minuteur.current) window.clearTimeout(minuteur.current);
      for (const ecouteur of ecouteurs) {
        window.removeEventListener(ecouteur, relancer);
      }
    };
  }, []);

  // Compte à rebours lisible pendant l'avertissement.
  useEffect(() => {
    if (!averti) return;
    const interval = window.setInterval(() => {
      setReste((precedent) => Math.max(0, precedent - 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [averti]);

  if (!averti) return null;

  const minutes = Math.floor(reste / 60000);
  const secondes = Math.floor((reste % 60000) / 1000);

  return (
    <div className="bandeau-session" role="alertdialog" aria-live="assertive" aria-label="Expiration de la session">
      <p style={{ margin: 0 }}>
        Vous allez être déconnecté dans{" "}
        <strong>
          {minutes} minute{minutes > 1 ? "s" : ""} {String(secondes).padStart(2, "0")}
        </strong>{" "}
        par sécurité (30 minutes sans activité).
      </p>
      <button
        type="button"
        className="btn"
        disabled={enCours}
        onClick={() =>
          commencerTransition(async () => {
            await prolongerSessionAction();
            relancer();
          })
        }
      >
        {enCours ? "Un instant..." : "Rester connecté"}
      </button>
    </div>
  );
}
