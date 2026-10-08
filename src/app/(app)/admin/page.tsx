import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { dureeValiditeInvitation, statutInvitation } from "@/lib/invitation";
import { dureeCreneau, maxRdvParEleve } from "@/lib/calendrier";
import InvitationForm from "./invitation-form";
import ParametresForm from "./parametres-form";
import { revoquerInvitationAction, basculerEleveAction } from "./actions";

const ETIQUETTES_STATUT = {
  attente: "En attente",
  utilisee: "Utilisée",
  expiree: "Expirée",
  revoquee: "Révoquée",
} as const;

function formaterDate(date: Date): string {
  return (
    date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) +
    " à " +
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

// F6.1, F6.2, F6.3 : gestion des élèves, des invitations et des paramètres.
export default async function PageAdmin() {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  if (utilisateur.role !== "PROFESSEUR") redirect("/");

  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: { usedBy: { select: { prenom: true, nom: true } } },
  });
  const eleves = await prisma.user.findMany({
    where: { role: "ELEVE" },
    orderBy: { createdAt: "desc" },
  });
  const jours = await dureeValiditeInvitation();
  const [creneau, maxRdv] = await Promise.all([dureeCreneau(), maxRdvParEleve()]);

  return (
    <>
      <h1 className="page-title">Administration</h1>
      <p className="page-subtitle">Gérez vos invitations, vos élèves et vos paramètres.</p>

      <section className="admin-section" aria-label="Invitations">
        <h2 className="section-title">Invitations</h2>
        <InvitationForm dureeJours={jours} />
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Expire le</th>
                <th>Statut</th>
                <th>Utilisée par</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Aucune invitation pour le moment.
                  </td>
                </tr>
              )}
              {invitations.map((invitation) => {
                const statut = statutInvitation(invitation);
                return (
                  <tr key={invitation.id}>
                    <td className="code-invitation">{invitation.code}</td>
                    <td>{formaterDate(invitation.expireLe)}</td>
                    <td>
                      <span className={"tag " + statut}>{ETIQUETTES_STATUT[statut]}</span>
                    </td>
                    <td>
                      {invitation.usedBy ? invitation.usedBy.prenom + " " + invitation.usedBy.nom : "—"}
                    </td>
                    <td>
                      {statut === "attente" && (
                        <form action={revoquerInvitationAction}>
                          <input type="hidden" name="id" value={invitation.id} />
                          <button type="submit" className="btn-small btn-danger">
                            Révoquer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section" aria-label="Élèves">
        <h2 className="section-title">Élèves</h2>
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Email</th>
                <th>Inscription</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eleves.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted">
                    Aucun élève inscrit pour le moment. Créez une invitation pour en inviter un.
                  </td>
                </tr>
              )}
              {eleves.map((eleve) => (
                <tr key={eleve.id}>
                  <td>
                    {eleve.prenom} {eleve.nom}
                  </td>
                  <td>{eleve.email}</td>
                  <td>{formaterDate(eleve.createdAt)}</td>
                  <td>{eleve.derniereConnexion ? formaterDate(eleve.derniereConnexion) : "Jamais connecté"}</td>
                  <td>
                    <span className={"tag " + (eleve.actif ? "actif" : "inactif")}>
                      {eleve.actif ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td>
                    <form action={basculerEleveAction}>
                      <input type="hidden" name="id" value={eleve.id} />
                      <button type="submit" className="btn-small">
                        {eleve.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 10 }}>
          Désactiver un élève le déconnecte immédiatement ; il voit alors le message « Votre accès a été
          retiré ».
        </p>
      </section>

      <section className="admin-section" aria-label="Paramètres">
        <h2 className="section-title">Paramètres</h2>
        <ParametresForm dureeJours={jours} dureeCreneau={creneau} maxRdv={maxRdv} />
      </section>
    </>
  );
}
