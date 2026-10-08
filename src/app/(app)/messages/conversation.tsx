import BoutonSuppression from "@/components/bouton-suppression";
import { supprimerMessageAction } from "./actions";
import MessageForm from "./message-form";
import AncreBas from "./ancre-bas";

export type MessageAffiche = {
  id: string;
  texte: string;
  deMoi: boolean;
  suppressible: boolean;
  fichiers: { id: string; nom: string }[];
};

// Rendu partagé d'une conversation (F4.2) : historique déroulant, bulles
// distinctes selon l'expéditeur, suppression quand elle est permise,
// champ de saisie en bas.
export default function Conversation({
  eleveId,
  messages,
}: {
  eleveId: string;
  messages: MessageAffiche[];
}) {
  return (
    <div className="chat-fenetre">
      {messages.length === 0 ? (
        <p className="chat-vide text-muted">
          Aucun message pour le moment. Écrivez le premier !
        </p>
      ) : (
        <ol className="chat-liste">
          {messages.map((message) => (
            <li key={message.id} className={"bulle-bloc " + (message.deMoi ? "de-moi" : "de-lautre")}>
              <div className="bulle">
                <p>{message.texte}</p>
                {message.fichiers.length > 0 && (
                  <ul className="bulle-fichiers">
                    {message.fichiers.map((fichier) => (
                      <li key={fichier.id}>
                        <a className="link" href={"/fichiers/" + fichier.id} download>
                          {fichier.nom}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {message.suppressible && (
                <BoutonSuppression
                  action={supprimerMessageAction}
                  id={message.id}
                  message="Supprimer définitivement ce message ? Cette action est irréversible."
                  libelle="Supprimer"
                />
              )}
            </li>
          ))}
          <AncreBas />
        </ol>
      )}
      <MessageForm eleveId={eleveId} />
    </div>
  );
}
