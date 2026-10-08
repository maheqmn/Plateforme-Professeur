"use client";

import { useActionState } from "react";
import { creerInvitationAction } from "./actions";

export default function InvitationForm({ dureeJours }: { dureeJours: number }) {
  const [etat, formAction, enCours] = useActionState(creerInvitationAction, {});

  return (
    <div className="card admin-card">
      <form action={formAction}>
        <div className="field">
          <label htmlFor="emailInvite">Email de la personne à inviter (optionnel)</label>
          <input id="emailInvite" name="emailInvite" type="email" placeholder="ex. marie.dupont@exemple.fr" />
        </div>
        <button type="submit" className="btn" disabled={enCours}>
          Créer une invitation
        </button>
      </form>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 12 }}>
        Les invitations expirent après {dureeJours} jour(s) et ne servent qu&apos;une seule fois. Si un email est
        renseigné, l&apos;invitation (lien + instructions pas à pas) lui est envoyée.
      </p>
      {etat.erreur && (
        <p className="alert" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.code && (
        <div className="confirm">
          <p>
            <strong>Invitation créée.</strong> Communiquez ce code à votre élève :
          </p>
          <p className="code-invitation">{etat.code}</p>
          <p>ou ce lien direct :</p>
          <p className="code-invitation">{etat.lien}</p>
          <p>
            Valable jusqu&apos;au <strong>{etat.expireLe}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
