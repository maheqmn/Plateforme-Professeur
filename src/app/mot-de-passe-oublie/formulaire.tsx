"use client";

import { useActionState } from "react";
import Link from "next/link";
import { demanderReinitialisationAction } from "./actions";

export default function DemandeForm() {
  const [etat, formAction, enCours] = useActionState(demanderReinitialisationAction, {});

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">&#128274;</div>
          <h1>Mot de passe oublié</h1>
        </div>
        <p className="login-sub">
          Saisissez votre adresse email : vous recevrez un lien pour choisir un nouveau mot de passe. Ce lien
          est valable 1 heure.
        </p>
        {etat.erreur && (
          <p className="alert" role="alert">
            {etat.erreur}
          </p>
        )}
        {etat.message && <p className="confirm">{etat.message}</p>}
        <form action={formAction}>
          <div className="field">
            <label htmlFor="email">Votre adresse email</label>
            <input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <button type="submit" className="btn btn-large" disabled={enCours}>
            Envoyer le lien
          </button>
        </form>
        <div className="login-links">
          <Link className="link" href="/connexion">
            Revenir à la connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
