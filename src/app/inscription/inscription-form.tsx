"use client";

import { useActionState } from "react";
import { inscriptionAction } from "./actions";

export default function InscriptionForm({ codeInvitation }: { codeInvitation: string }) {
  const [etat, formAction, enCours] = useActionState(inscriptionAction, {});

  return (
    <>
      <p className="login-sub">Dernière étape : quelques informations et un mot de passe.</p>
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <form action={formAction}>
        <input type="hidden" name="invitation" value={codeInvitation} />
        <div className="field">
          <label htmlFor="prenom">Votre prénom</label>
          <input id="prenom" name="prenom" autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="nom">Votre nom</label>
          <input id="nom" name="nom" autoComplete="family-name" />
        </div>
        <div className="field">
          <label htmlFor="email">Votre adresse email</label>
          <input id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="motDePasse">Choisissez un mot de passe</label>
          <input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="confirmation">Confirmez le mot de passe</label>
          <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" />
        </div>
        <p className="aide-mdp">
          Un mot de passe solide contient au moins 8 caractères, dont une majuscule, un chiffre et un caractère
          spécial. Exemple : Cartable7!Rouge
        </p>
        <button type="submit" className="btn btn-large" disabled={enCours}>
          Créer mon compte
        </button>
      </form>
    </>
  );
}
