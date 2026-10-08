import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, detailsSession } from "@/lib/session";
import Sidebar from "./sidebar";
import AvertissementSession from "./avertissement-session";

// Critère d'acceptation 1 : aucune page n'est accessible sans connexion.
export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";

  // F4.5 : point rouge sur l'entrée "Messages" en cas de message non lu.
  const messagesNonLus = estProfesseur
    ? await prisma.message.count({
        where: { luLe: null, auteur: { role: "ELEVE" } },
      })
    : await prisma.message.count({
        where: { eleveId: utilisateur.id, luLe: null, NOT: { auteurId: utilisateur.id } },
      });

  // F1.7 : le bandeau de déconnexion imminente ne concerne que les sessions
  // sans « Rester connecté » (30 minutes d'inactivité).
  const session = await detailsSession();
  const surveillerExpiration = session !== null && !session.rememberMe;

  return (
    <div className="layout">
      <Sidebar
        prenom={utilisateur.prenom}
        nom={utilisateur.nom}
        role={utilisateur.role}
        messagesNonLus={messagesNonLus}
      />
      <main className="main">
        {children}
        {surveillerExpiration && <AvertissementSession />}
      </main>
    </div>
  );
}
