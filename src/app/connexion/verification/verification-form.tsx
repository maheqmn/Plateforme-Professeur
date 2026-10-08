"use client";

import { useActionState } from "react";
import { verificationAction } from "./actions";

export default function VerificationForm() {
  const [etat, formAction, enCours] = useActionState(verificationAction, {});

  return (
    <>
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <form action={formAction}>
        <div className="field">
          <label htmlFor="code">Code à 6 chiffres</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="ex. 418392"
            style={{ letterSpacing: "4px", fontSize: "1.2rem", textAlign: "center" }}
          />
        </div>
        <button type="submit" className="btn btn-large" disabled={enCours}>
          Valider le code
        </button>
      </form>
    </>
  );
}
