import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Conversation from "./conversation";
import { chargerConversation, marquerLus } from "./donnees";

function formaterDateHeure(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    " à " +
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// F4.2 : vue élève — conversation unique avec le professeur.
// F4.3 : vue professeur — liste des conversations avec dernier message et
// indicateur de message non lu.
export default async function PageMessages() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  if (!estProfesseur) {
    await marquerLus(utilisateur.id, utilisateur.id);
    const messages = await chargerConversation(utilisateur.id, utilisateur.id, false);
    return (
      <>
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">
          Votre conversation privée avec votre professeur. Seuls vous et lui pouvez la lire.
        </p>
        <Conversation eleveId={utilisateur.id} messages={messages} />
      </>
    );
  }

  const eleves = await prisma.user.findMany({
    where: { role: "ELEVE", actif: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      conversations: { orderBy: { creeLe: "desc" }, take: 1, include: { fichiers: true } },
      messagesEnvoyes: { where: { luLe: null }, select: { id: true, luLe: true } },
    },
  });

  return (
    <>
      <h1 className="page-title">Messages</h1>
      <p className="page-subtitle">
        Vos conversations privées avec vos élèves. Cliquez sur un élève pour ouvrir la discussion.
      </p>

      {eleves.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon" aria-hidden="true">
            {"\u2709"}
          </div>
          <h2>Aucun élève pour le moment</h2>
          <p>
            Invitez vos élèves depuis l&apos;administration : une conversation privée s&apos;ouvrira
            automatiquement avec chacun d&apos;eux.
          </p>
        </div>
      ) : (
        <div className="course-list">
          {eleves.map((eleve) => {
            const dernier = eleve.conversations[0];
            const nonLus = eleve.messagesEnvoyes.filter((m) => m.luLe === null).length;
            return (
              <Link key={eleve.id} className="course-item conversation-item" href={"/messages/" + eleve.id}>
                <div className="avatar" aria-hidden="true">
                  {(eleve.prenom.charAt(0) + eleve.nom.charAt(0)).toUpperCase()}
                </div>
                <div>
                  <h3>
                    {eleve.prenom} {eleve.nom}
                    {nonLus > 0 && (
                      <span className="tag une" style={{ marginLeft: 8 }}>
                        {nonLus} non lu{nonLus > 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <p className="course-desc">
                    {dernier
                      ? (dernier.texte ||
                        (dernier.fichiers.length > 0 ? "(" + dernier.fichiers.length + " fichier(s) joint(s))" : "(message)")).slice(0, 90)
                      : "Aucun message — écrivez le premier !"}
                  </p>
                </div>
                <span className="text-muted conversation-date">
                  {dernier ? formaterDateHeure(dernier.creeLe) : ""}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
