import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { creneauValide, depuisCle, formaterDateHeure, formaterDuree } from "@/lib/calendrier";
import ReserverForm from "./reserver-form";

// F5.3 : fenêtre de confirmation simple avant de verrouiller le créneau.
export default async function PageReserver({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string; duree?: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  if (utilisateur.role !== "ELEVE") redirect("/calendrier");

  const { debut: debutBrut, duree: dureeBrut } = await searchParams;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(debutBrut ?? "");
  const duree = parseInt(dureeBrut ?? "", 10);

  if (!match || (duree !== 30 && duree !== 60)) {
    return (
      <div className="card empty-state">
        <h2>Créneau invalide</h2>
        <p>
          Ce lien de réservation est incorrect.{" "}
          <Link className="link" href="/calendrier">
            Retour au calendrier
          </Link>
        </p>
      </div>
    );
  }

  const debut = depuisCle(match[1], Number(match[2]) * 60 + Number(match[3]));
  const valide = await creneauValide(debut, duree);

  if (!valide) {
    return (
      <div className="card empty-state">
        <h2>Ce créneau n&apos;est plus disponible</h2>
        <p>Il a peut-être été pris par un autre élève entre-temps.</p>
        <p>
          <Link className="btn" href="/calendrier">
            Choisir un autre créneau
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="crumbs">
        <Link href="/calendrier">Calendrier</Link> &gt; <strong>Réservation</strong>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Confirmer le rendez-vous du {formaterDateHeure(debut)} ?
        </h2>
        <p className="text-muted" style={{ marginTop: -8 }}>
          Durée : {formaterDuree(duree)}. Le rendez-vous aura lieu par Microsoft Teams ; vous recevrez
          le lien et un rappel par email.
        </p>
        <ReserverForm debut={debutBrut!} duree={duree} />
        <p style={{ marginBottom: 0 }}>
          <Link className="link" href="/calendrier">
            Annuler et revenir au calendrier
          </Link>
        </p>
      </div>
    </>
  );
}
