import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Conversation from "../conversation";
import { chargerConversation, marquerLus } from "../donnees";

// F4.3 : un clic sur un élève de la liste ouvre la conversation complète.
// Réservée au professeur : un élève est redirigé vers sa propre conversation (F4.1).
export default async function PageConversationEleve({
  params,
}: {
  params: Promise<{ eleveId: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  if (utilisateur.role !== "PROFESSEUR") redirect("/messages");
  const { eleveId } = await params;

  const eleve = await prisma.user.findFirst({ where: { id: eleveId, role: "ELEVE" } });
  if (!eleve) notFound();

  await marquerLus(eleveId, utilisateur.id);
  const messages = await chargerConversation(eleveId, utilisateur.id, true);

  return (
    <>
      <div className="crumbs">
        <Link href="/messages">Messages</Link> &gt; <strong>{eleve.prenom} {eleve.nom}</strong>
      </div>
      <h1 className="page-title">
        Conversation avec {eleve.prenom} {eleve.nom}
      </h1>
      <p className="page-subtitle">
        Conversation privée. Vous pouvez supprimer n&apos;importe lequel de ses messages si nécessaire.
      </p>
      <Conversation eleveId={eleveId} messages={messages} />
    </>
  );
}
