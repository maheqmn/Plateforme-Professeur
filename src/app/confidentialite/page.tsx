import Link from "next/link";

// Exigence 8.3 : politique de confidentialité. Page publique.
export default function PageConfidentialite() {
  return (
    <main className="page-publique">
      <div className="card">
        <h1>Politique de confidentialité</h1>

        <h2>Quelles données sont collectées ?</h2>
        <p>Uniquement ce qui est nécessaire au fonctionnement de la plateforme :</p>
        <ul>
          <li>
            <strong>Compte</strong> : votre prénom, votre nom, votre adresse email et votre
            mot de passe (celui-ci est chiffré de façon irréversible : personne, pas même le
            professeur, ne peut le lire).
          </li>
          <li>
            <strong>Cours et articles</strong> : les cours que vous marquez comme terminés
            et les rubriques que vous consultez, pour afficher votre progression.
          </li>
          <li>
            <strong>Messages</strong> : les messages échangés avec votre professeur et leurs
            pièces jointes. Aucun autre élève ne peut y accéder.
          </li>
          <li>
            <strong>Rendez-vous</strong> : les créneaux que vous réservez et leur motif.
          </li>
        </ul>
        <p>Aucune donnée de navigation, publicité ou mesure d&apos;audience n&apos;est collectée.</p>

        <h2>Qui peut voir vos données ?</h2>
        <p>
          Votre professeur, uniquement. Il voit votre progression, vos messages et vos
          rendez-vous pour organiser ses cours. Les échanges entre élèves sont impossibles :
          la messagerie ne propose aucun annuaire ni recherche de destinataire.
        </p>

        <h2>Où sont hébergées les données ?</h2>
        <p>
          Sur un serveur situé dans l&apos;Union européenne, sécurisé par une connexion
          chiffrée (HTTPS). Une sauvegarde quotidienne automatique est conservée 30 jours,
          également sur ce serveur.
        </p>

        <h2>Vos droits</h2>
        <p>
          Conformément au Règlement général sur la protection des données (RGPD), vous
          disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos
          données. Ces demandes sont traitées par votre professeur, directement depuis la
          gestion des comptes : écrivez-lui via la rubrique « Messages » et il vous
          confirmera la marche à suivre. La suppression de votre compte entraîne celle de
          vos messages et rendez-vous.
        </p>

        <p>
          <Link className="btn" href="/">
            Retour
          </Link>
        </p>
      </div>
    </main>
  );
}
