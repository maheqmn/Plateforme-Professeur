import Link from "next/link";

// Exigence 8.3 : mentions légales et politique de confidentialité accessibles
// depuis l'écran de connexion. Pages publiques (aucune connexion requise).
export default function PageMentionsLegales() {
  return (
    <main className="page-publique">
      <div className="card">
        <h1>Mentions légales</h1>

        <h2>Éditeur de la plateforme</h2>
        <p>
          Cette plateforme est un espace privé d&apos;apprentissage, édité et administré par le
          professeur qui vous a invité. Pour toute question, écrivez-lui via la rubrique
          « Messages » de la plateforme, ou à l&apos;adresse email qui vous a été communiquée
          lors de votre inscription.
        </p>

        <h2>Objet du site</h2>
        <p>
          La plateforme propose des cours d&apos;informatique, des articles de blog, une
          messagerie privée avec le professeur et la prise de rendez-vous individuels.
          Elle est exclusivement réservée aux élèves invités : aucune partie du contenu
          n&apos;est publique.
        </p>

        <h2>Hébergement</h2>
        <p>
          La plateforme et l&apos;ensemble des données sont hébergées dans l&apos;Union
          européenne, sur un serveur dédié à l&apos;application. Une sauvegarde quotidienne
          automatique est conservée pendant 30 jours.
        </p>

        <h2>Vos données personnelles (RGPD)</h2>
        <p>
          Seules les données strictement nécessaires au service sont collectées : prénom,
          nom, adresse email, messages échangés avec le professeur, rendez-vous pris.
        </p>
        <ul>
          <li>
            <strong>Accès et rectification</strong> : demandez au professeur (rubrique
            « Messages ») la correction d&apos;une information vous concernant ; il peut la
            mettre à jour depuis son administration.
          </li>
          <li>
            <strong>Suppression</strong> : vous pouvez demander à tout moment la suppression
            de votre compte et de vos données. Le professeur procède depuis la gestion des
            comptes ; la suppression efface également vos messages et rendez-vous.
          </li>
          <li>
            <strong>Durée de conservation</strong> : les données sont conservées le temps de
            votre inscription à la plateforme, puis supprimées à votre demande ou lorsque
            votre compte est désactivé.
          </li>
        </ul>
        <p>
          Pour en savoir plus, consultez la{" "}
          <Link className="link" href="/confidentialite">
            politique de confidentialité
          </Link>
          .
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
