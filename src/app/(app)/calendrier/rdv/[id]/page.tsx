import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import BoutonSuppression from "@/components/bouton-suppression";
import { formaterDateHeure, formaterDuree, DELAI_ANNULATION_MS } from "@/lib/calendrier";
import { annulerRdvAction } from "../../actions";
import { DeplacerForm, LienTeamsForm } from "./formulaires";

// F5.4 : le rendez-vous n'est visible que du professeur et de l'élève inscrit.
// F5.5 : lien Teams. F5.6 : déplacement / annulation professeur.
// F5.7 : annulation par l'élève jusqu'à 24 heures avant.
export default async function PageRendezVous({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";
  const { id } = await params;

  const rdv = await prisma.rendezVous.findUnique({ where: { id }, include: { eleve: true } });
  if (!rdv) notFound();
  if (!estProfesseur && rdv.eleveId !== utilisateur.id) notFound();

  const reste = rdv.debut.getTime() - Date.now();
  const annulableParEleve = reste > DELAI_ANNULATION_MS;

  return (
    <>
      <div className="crumbs">
        <Link href="/calendrier">Calendrier</Link> &gt; <strong>Rendez-vous</strong>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          {estProfesseur ? "Rendez-vous avec " + rdv.eleve.prenom + " " + rdv.eleve.nom : "Votre rendez-vous"}
        </h2>
        <p style={{ marginTop: -4 }}>
          <strong>{formaterDateHeure(rdv.debut)}</strong> — {formaterDuree(rdv.dureeMin)}
        </p>
        {rdv.motif && (
          <p className="text-muted" style={{ marginTop: -6 }}>
            Motif : {rdv.motif}
          </p>
        )}
        {rdv.lienTeams && (
          <p>
            <a className="btn" href={rdv.lienTeams} target="_blank" rel="noopener noreferrer">
              Rejoindre la réunion Teams
            </a>
          </p>
        )}

        {estProfesseur && (
          <div className="zone-enseignant" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <LienTeamsForm id={rdv.id} valeur={rdv.lienTeams} />
            <DeplacerForm id={rdv.id} debut={rdv.debut} />
            <div>
              <BoutonSuppression
                action={annulerRdvAction}
                id={rdv.id}
                message={
                  "Annuler définitivement ce rendez-vous du " +
                  formaterDateHeure(rdv.debut) +
                  " ? L'élève sera prévenu par email."
                }
                libelle="Annuler le rendez-vous"
              />
            </div>
          </div>
        )}

        {!estProfesseur &&
          (annulableParEleve ? (
            <div>
              <BoutonSuppression
                action={annulerRdvAction}
                id={rdv.id}
                message="Annuler votre rendez-vous ? Le créneau redeviendra disponible pour les autres élèves."
                libelle="Annuler mon rendez-vous"
              />
            </div>
          ) : (
            <p className="notice">
              Ce rendez-vous a lieu dans moins de 24 heures : il n&apos;est plus annulable ici.
              Écrivez à votre professeur via la{" "}
              <Link className="link" href="/messages">
                messagerie
              </Link>{" "}
              pour demander l&apos;annulation.
            </p>
          ))}
      </div>
    </>
  );
}
