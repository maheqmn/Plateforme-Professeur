import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Sidebar from "./sidebar";

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

  return (
    <div className="layout">
      <Sidebar
        prenom={utilisateur.prenom}
        nom={utilisateur.nom}
        role={utilisateur.role}
        messagesNonLus={messagesNonLus}
      />
      <main className="main">{children}</main>
    </div>
  );
}
