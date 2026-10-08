"use client";

import { useActionState } from "react";
import Link from "next/link";
import { validerInvitationAction } from "./actions";

export default function InvitationForm({ codeInitial }: { codeInitial: string }) {
  const [etat, formAction, enCours] = useActionState(validerInvitationAction, {});

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">&#9997;</div>
          <h1>Utilisez votre invitation</h1>
        </div>
        <p className="login-sub">
          Saisissez le code d&apos;invitation donné par votre professeur. Si vous avez reçu un email, cliquez
          simplement sur le lien qu&apos;il contient : le code sera déjà rempli.
        </p>
        {etat.erreur && (
          <p className="alert" role="alert">
            {etat.erreur}
          </p>
        )}
        <form action={formAction}>
          <div className="field">
            <label htmlFor="code">Code d&apos;invitation</label>
            <input
              id="code"
              name="code"
              defaultValue={codeInitial}
              placeholder="ex. K7M2PQ4R"
              autoCapitalize="characters"
              style={{ letterSpacing: "3px", textAlign: "center", fontSize: "1.1rem" }}
            />
          </div>
          <button type="submit" className="btn btn-large" disabled={enCours}>
            Continuer
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
