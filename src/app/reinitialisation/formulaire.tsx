"use client";

import { useActionState } from "react";
import { reinitialiserAction } from "./actions";

export default function ReinitialisationForm({ token }: { token: string }) {
  const [etat, formAction, enCours] = useActionState(reinitialiserAction, {});

  return (
    <>
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="motDePasse">Nouveau mot de passe</label>
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
          Enregistrer le nouveau mot de passe
        </button>
      </form>
    </>
  );
}
