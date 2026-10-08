import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Sidebar from "./sidebar";

// Critère d'acceptation 1 : aucune page n'est accessible sans connexion.
export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");

  return (
    <div className="layout">
      <Sidebar prenom={utilisateur.prenom} nom={utilisateur.nom} role={utilisateur.role} />
      <main className="main">{children}</main>
    </div>
  );
}
