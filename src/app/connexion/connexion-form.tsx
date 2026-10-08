"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connexionAction } from "./actions";

export default function ConnexionForm({
  espaceProfesseur,
  reinitialise,
  expire,
}: {
  espaceProfesseur: boolean;
  reinitialise: boolean;
  expire?: boolean;
}) {
  const [etat, formAction, enCours] = useActionState(connexionAction, {});

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">L</div>
          <h1>
            {espaceProfesseur ? "Espace professeur" : "La plateforme de votre professeur"}
          </h1>
        </div>
        <p className="login-sub">
          {espaceProfesseur
            ? "Connexion à l'interface d'administration."
            : "Connectez-vous pour accéder à vos cours, vos messages et votre calendrier."}
        </p>

        {reinitialise && (
          <p className="notice">Votre mot de passe a bien été modifié. Connectez-vous avec le nouveau.</p>
        )}
        {expire && (
          <p className="notice">
            Vous avez été déconnecté après 30 minutes sans activité. Reconnectez-vous pour continuer.
          </p>
        )}
        {etat.erreur && (
          <p className="alert" role="alert">
            {etat.erreur}
          </p>
        )}

        <form action={formAction}>
          <input type="hidden" name="espace" value={espaceProfesseur ? "professeur" : ""} />
          <div className="field">
            <label htmlFor="email">Votre adresse email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="ex. marie.dupont@exemple.fr" />
          </div>
          <div className="field">
            <label htmlFor="motDePasse">Votre mot de passe</label>
            <input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" />
          </div>
          <div className="checkbox-line">
            <input id="resterConnecte" name="resterConnecte" type="checkbox" />
            <label htmlFor="resterConnecte">Rester connecté sur cet appareil</label>
          </div>
          <button type="submit" className="btn btn-large" disabled={enCours}>
            Se connecter
          </button>
        </form>

        <div className="login-links">
          <Link className="link" href="/invitation">
            Première visite ? Utilisez votre invitation
          </Link>
          <Link className="link" href="/mot-de-passe-oublie">
            Mot de passe oublié
          </Link>
          <Link className="link" href={espaceProfesseur ? "/connexion" : "/connexion?espace=professeur"}>
            Espace professeur
          </Link>
          <Link className="link" href="/aide">
            Besoin d&apos;aide ? Le mode d&apos;emploi
          </Link>
        </div>

        <p className="login-legal">
          <Link className="link" href="/mentions-legales">
            Mentions légales
          </Link>{" "}
          &middot;{" "}
          <Link className="link" href="/confidentialite">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
