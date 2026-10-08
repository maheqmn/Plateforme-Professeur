"use client";

import { useEffect, useState } from "react";

// Exigence 7.1 : boutons A+ / A- permanents pour ajuster la taille du texte.
// Le réglage est mémorisé sur l'appareil (localStorage).
const MIN = 16;
const MAX = 24;

export default function FontControls() {
  const [taille, setTaille] = useState(18);

  useEffect(() => {
    const enregistre = window.localStorage.getItem("tailleTexte");
    if (enregistre) {
      const valeur = parseInt(enregistre, 10);
      if (Number.isFinite(valeur)) setTaille(Math.min(MAX, Math.max(MIN, valeur)));
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = taille + "px";
    window.localStorage.setItem("tailleTexte", String(taille));
  }, [taille]);

  return (
    <div className="font-controls">
      <button type="button" onClick={() => setTaille((t) => Math.max(MIN, t - 1))} title="Réduire la taille du texte">
        A-
      </button>
      <button type="button" onClick={() => setTaille((t) => Math.min(MAX, t + 1))} title="Agrandir la taille du texte">
        A+
      </button>
    </div>
  );
}
