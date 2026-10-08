import Link from "next/link";

// Exigence 7.7 : guide court et illustré de l'utilisation de la plateforme.
// Page publique : utile aussi avant la première connexion.
export default function PageAide() {
  return (
    <main className="page-publique">
      <div className="card">
        <h1>Aide — mode d&apos;emploi en 4 gestes</h1>
        <p className="page-subtitle" style={{ marginTop: -4 }}>
          Tout se fait depuis la barre à gauche, qui ne change jamais de place.
        </p>

        <section className="aide-section">
          <div className="aide-icone" aria-hidden="true">{"\u{1F511}"}</div>
          <div>
            <h2>1. Se connecter</h2>
            <ol>
              <li>Ouvrez le lien que votre professeur vous a envoyé (ou son code d&apos;invitation).</li>
              <li>Créez votre compte : prénom, nom, email, mot de passe.</li>
              <li>À chaque visite, saisissez votre email et votre mot de passe sur la page de connexion.</li>
            </ol>
            <p className="text-muted">
              Astuce : cochez « Rester connecté sur cet appareil » si vous êtes le seul à
              l&apos;utiliser.
            </p>
          </div>
        </section>

        <section className="aide-section">
          <div className="aide-icone" aria-hidden="true">{"\u{1F4DA}"}</div>
          <div>
            <h2>2. Lire un cours</h2>
            <ol>
              <li>Cliquez sur « Mes cours » dans la barre à gauche.</li>
              <li>Ouvrez le dossier qui vous intéresse (par exemple « Cours débutant »).</li>
              <li>Cliquez sur un cours : le contenu s&apos;affiche, avec ses fichiers à télécharger.</li>
              <li>Cochez « Cours terminé » quand vous avez fini : votre progression s&apos;affiche sur la page d&apos;accueil.</li>
            </ol>
          </div>
        </section>

        <section className="aide-section">
          <div className="aide-icone" aria-hidden="true">{"\u{1F4C5}"}</div>
          <div>
            <h2>3. Prendre rendez-vous</h2>
            <ol>
              <li>Cliquez sur « Calendrier » dans la barre à gauche.</li>
              <li>Les créneaux <strong>en vert</strong> sont disponibles : cliquez sur celui qui vous convient.</li>
              <li>Vérifiez la date, ajoutez un motif si vous le souhaitez, puis cliquez sur « Confirmer le rendez-vous ».</li>
              <li>Vous recevez la confirmation par email, puis un rappel 24 heures avant.</li>
            </ol>
            <p className="text-muted">
              Vous pouvez annuler depuis le rendez-vous jusqu&apos;à 24 heures avant. Après,
              écrivez simplement au professeur via la messagerie.
            </p>
          </div>
        </section>

        <section className="aide-section">
          <div className="aide-icone" aria-hidden="true">{"\u2709"}</div>
          <div>
            <h2>4. Écrire au professeur</h2>
            <ol>
              <li>Cliquez sur « Messages » dans la barre à gauche.</li>
              <li>Écrivez votre message dans la zone en bas, joignez une photo ou un document si besoin.</li>
              <li>Cliquez sur le grand bouton « Envoyer ».</li>
            </ol>
            <p className="text-muted">
              Quand un point rouge apparaît à côté de « Messages », vous avez une réponse.
            </p>
          </div>
        </section>

        <section className="aide-section">
          <div className="aide-icone" aria-hidden="true">{"\u{1F50D}"}</div>
          <div>
            <h2>Et aussi</h2>
            <ul>
              <li>
                Les boutons <strong>A+</strong> et <strong>A&ndash;</strong> en bas d&apos;écran
                agrandissent ou réduisent le texte.
              </li>
              <li>Un souci de connexion ? Contactez votre professeur : il peut réinitialiser votre accès.</li>
            </ul>
          </div>
        </section>

        <p>
          <Link className="btn" href="/">
            Retour
          </Link>
        </p>
      </div>
    </main>
  );
}
