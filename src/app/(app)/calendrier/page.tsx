import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import BoutonSuppression from "@/components/bouton-suppression";
import {
  cleDate,
  creneauxPeriode,
  depuisCle,
  formaterHeure,
  formaterDateHeure,
  jourSemaine,
} from "@/lib/calendrier";
import { supprimerDisponibiliteAction, supprimerDateBloqueeAction } from "./actions";
import DisposForms from "./dispos-forms";
import CelluleJour from "./cellule-jour";
import PuceEvenement from "./puce-evenement";

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const JOURS_LONGS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const FILTRES = [
  { cle: "tout", libelle: "Tout" },
  { cle: "cours", libelle: "Cours" },
  { cle: "rdv", libelle: "Rendez-vous" },
  { cle: "dispos", libelle: "Disponibilités" },
] as const;
const HEURES_JOUR = Array.from({ length: 14 }, (_, i) => i + 8); // 8h à 21h

function lienCalendrier(vue: string, ancre: Date, filtre?: string): string {
  const params = new URLSearchParams({ vue, ancre: cleDate(ancre) });
  if (filtre) params.set("filtre", filtre);
  return "/calendrier?" + params.toString();
}

function heureCourt(date: Date): string {
  return date.getHours() + "h" + String(date.getMinutes()).padStart(2, "0");
}

// F5.1 : calendrier partagé — vue mensuelle, hebdomadaire ou du jour.
// F5.3 : créneaux libres en vert pour l'élève. F5.9 : filtres et vue du jour.
// Style Teams : bouton "Nouvel événement", double-clic sur un jour, et
// glisser-déposer des rendez-vous et cours (professeur).
export default async function PageCalendrier({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; ancre?: string; filtre?: string; reserve?: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  const estProfesseur = utilisateur.role === "PROFESSEUR";
  const { vue, ancre: ancreBrute, filtre, reserve } = await searchParams;

  const vueJour = vue === "jour";
  const vueSemaine = vue === "semaine";
  const ancre = /^\d{4}-\d{2}-\d{2}$/.test(ancreBrute ?? "") ? depuisCle(ancreBrute!) : new Date();
  const filtreActif = estProfesseur && FILTRES.some((f) => f.cle === filtre) ? filtre! : "tout";

  // Début de la période selon la vue.
  const debutPeriode = new Date(ancre);
  if (vueJour) {
    // l'ancre elle-même
  } else if (vueSemaine) {
    debutPeriode.setDate(debutPeriode.getDate() - (jourSemaine(debutPeriode) - 1));
  } else {
    debutPeriode.setDate(1);
    debutPeriode.setDate(debutPeriode.getDate() - (jourSemaine(debutPeriode) - 1));
  }
  const nbJours = vueJour ? 1 : vueSemaine ? 7 : 42;
  const finPeriode = new Date(debutPeriode);
  finPeriode.setDate(finPeriode.getDate() + nbJours);
  const aujourdhui = cleDate(new Date());
  const moisAncre = ancre.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Données de la période.
  const [rdvs, cours] = await Promise.all([
    prisma.rendezVous.findMany({
      where: {
        debut: { gte: debutPeriode, lt: finPeriode },
        ...(estProfesseur ? {} : { eleveId: utilisateur.id }),
      },
      include: { eleve: { select: { prenom: true, nom: true } } },
      orderBy: { debut: "asc" },
    }),
    prisma.cours.findMany({
      where: {
        dateSeance: { gte: debutPeriode, lt: finPeriode },
        ...(estProfesseur ? {} : { publie: true }),
      },
      include: { categorie: { select: { id: true } } },
      orderBy: { dateSeance: "asc" },
    }),
  ]);

  const montrerCreneaux = !estProfesseur || filtreActif === "tout" || filtreActif === "dispos";
  const creneaux = montrerCreneaux ? await creneauxPeriode(debutPeriode, finPeriode) : [];

  const [disponibilites, bloquees] = estProfesseur
    ? await Promise.all([
        prisma.disponibilite.findMany({ orderBy: [{ jour: "asc" }, { debutMin: "asc" }] }),
        prisma.dateBloquee.findMany({ orderBy: { date: "asc" } }),
      ])
    : [[], []];

  // Vue du jour (F5.9) : aperçu en liste pour le professeur.
  const maintenant = new Date();
  const rdvsJour = estProfesseur
    ? await prisma.rendezVous.findMany({
        where: { debut: { gte: maintenant, lt: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1) } },
        include: { eleve: { select: { prenom: true, nom: true } } },
        orderBy: { debut: "asc" },
      })
    : [];
  const coursJour = estProfesseur
    ? await prisma.cours.findMany({
        where: {
          dateSeance: { gte: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()), lt: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1) },
        },
      })
    : [];

  // Groupage par jour pour les cellules.
  const parJour = new Map<string, { cours: typeof cours; rdvs: typeof rdvs; creneaux: typeof creneaux }>();
  const jours: Date[] = [];
  for (let i = 0; i < nbJours; i++) {
    const jour = new Date(debutPeriode);
    jour.setDate(jour.getDate() + i);
    jours.push(jour);
    parJour.set(cleDate(jour), { cours: [], rdvs: [], creneaux: [] });
  }
  for (const c of cours) parJour.get(cleDate(c.dateSeance!))?.cours.push(c);
  for (const r of rdvs) parJour.get(cleDate(r.debut))?.rdvs.push(r);
  for (const cr of creneaux) parJour.get(cleDate(cr.debut))?.creneaux.push(cr);

  // Navigation précédent / suivant.
  const navig = new Date(ancre);
  const navigPrec = new Date(ancre);
  if (vueJour) {
    navig.setDate(navig.getDate() + 1);
    navigPrec.setDate(navigPrec.getDate() - 1);
  } else if (vueSemaine) {
    navig.setDate(navig.getDate() + 7);
    navigPrec.setDate(navigPrec.getDate() - 7);
  } else {
    navig.setMonth(navig.getMonth() + 1);
    navigPrec.setMonth(navigPrec.getMonth() - 1);
  }

  const disposParJour = new Map<number, typeof disponibilites>();
  for (const d of disponibilites) {
    const liste = disposParJour.get(d.jour) ?? [];
    liste.push(d);
    disposParJour.set(d.jour, liste);
  }

  const classesJour = (jour: Date) =>
    "calendrier-jour" +
    (cleDate(jour) === aujourdhui ? " aujourd-hui" : "") +
    (!vueJour && !vueSemaine && jour.getMonth() !== ancre.getMonth() ? " hors-periode" : "");

  const contenuJour = (jour: Date) => {
    const cle = cleDate(jour);
    const { cours: cJour, rdvs: rJour, creneaux: crJour } = parJour.get(cle)!;
    const disposDuJour = disposParJour.get(jourSemaine(jour)) ?? [];
    return (
      <>
        <span className="calendrier-numero">{jour.getDate()}</span>
        {(filtreActif === "tout" || filtreActif === "cours") &&
          cJour.map((c) => (
            <PuceEvenement
              key={c.id}
              href={"/cours/" + c.categorie.id + "/" + c.id}
              className="evenement cours"
              deplacable={estProfesseur}
              type="cours"
              id={c.id}
            >
              {heureCourt(c.dateSeance!)} — {c.titre}
            </PuceEvenement>
          ))}
        {(filtreActif === "tout" || filtreActif === "rdv") &&
          rJour.map((r) => (
            <PuceEvenement
              key={r.id}
              href={"/calendrier/rdv/" + r.id}
              className="evenement rdv"
              deplacable={estProfesseur}
              type="rdv"
              id={r.id}
            >
              {heureCourt(r.debut)} — {estProfesseur ? r.eleve.prenom + " " + r.eleve.nom : "Rendez-vous"}
            </PuceEvenement>
          ))}
        {estProfesseur && (filtreActif === "tout" || filtreActif === "dispos") && disposDuJour.length > 0 && (
          <span className="evenement dispos">
            {disposDuJour.map((d) => formaterHeure(d.debutMin) + "–" + formaterHeure(d.finMin)).join(", ")}
          </span>
        )}
        {!estProfesseur &&
          crJour
            .filter((cr) => cr.libre)
            .map((cr) => (
              <Link
                key={cr.debut.toISOString()}
                className="evenement creneau-libre"
                href={"/calendrier/reserver?debut=" + cle + "T" + String(cr.debut.getHours()).padStart(2, "0") + ":" + String(cr.debut.getMinutes()).padStart(2, "0") + "&duree=" + cr.dureeMin}
              >
                {heureCourt(cr.debut)} — Disponible
              </Link>
            ))}
        {estProfesseur && filtreActif === "dispos" &&
          crJour
            .filter((cr) => cr.libre)
            .slice(0, 6)
            .map((cr) => (
              <span key={cr.debut.toISOString()} className="evenement creneau-libre statique">
                {heureCourt(cr.debut)}
              </span>
            ))}
      </>
    );
  };

  return (
    <>
      <h1 className="page-title">Calendrier</h1>
      <p className="page-subtitle">
        {estProfesseur
          ? "Vos cours, vos rendez-vous et vos disponibilités. Double-cliquez sur un jour (ou une heure en vue Jour) pour planifier, ou glissez un rendez-vous ou un cours pour le déplacer. Deux rendez-vous ne peuvent pas se chevaucher."
          : "Les dates de cours de votre professeur et vos rendez-vous. Les créneaux verts sont disponibles."}
      </p>

      {reserve && (
        <p className="confirm" role="status">
          Votre rendez-vous est confirmé ! Vous recevrez un rappel par email 24 heures avant.
        </p>
      )}

      <div className="calendrier-barre">
        <div className="calendrier-nav">
          <Link className="btn-small btn-secondary" href={lienCalendrier(vue ?? "mois", navigPrec, filtreActif)} aria-label="Période précédente">
            {"\u2190"}
          </Link>
          <strong className="calendrier-titre">
            {vueJour
              ? debutPeriode.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
              : vueSemaine
                ? "Semaine du " + debutPeriode.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                : moisAncre.charAt(0).toUpperCase() + moisAncre.slice(1)}
          </strong>
          <Link className="btn-small btn-secondary" href={lienCalendrier(vue ?? "mois", navig, filtreActif)} aria-label="Période suivante">
            {"\u2192"}
          </Link>
          <Link className="btn-small" href={lienCalendrier(vue ?? "mois", new Date(), filtreActif)}>
            Aujourd&apos;hui
          </Link>
        </div>
        <div className="calendrier-vues">
          <Link className={"btn-small " + (!vueSemaine && !vueJour ? "" : "btn-secondary")} href={lienCalendrier("mois", ancre, filtreActif)}>
            Mois
          </Link>
          <Link className={"btn-small " + (vueSemaine ? "" : "btn-secondary")} href={lienCalendrier("semaine", ancre, filtreActif)}>
            Semaine
          </Link>
          <Link className={"btn-small " + (vueJour ? "" : "btn-secondary")} href={lienCalendrier("jour", ancre, filtreActif)}>
            Jour
          </Link>
          {estProfesseur && (
            <Link className="btn btn-nouveau-evenement" href={"/calendrier/nouveau" + (vueJour ? "?date=" + cleDate(ancre) : "")}>
              Nouvel événement
            </Link>
          )}
        </div>
      </div>

      {estProfesseur && (
        <div className="calendrier-filtres" role="group" aria-label="Filtres du calendrier">
          {FILTRES.map((f) => (
            <Link
              key={f.cle}
              className={"btn-small " + (filtreActif === f.cle ? "" : "btn-secondary")}
              href={lienCalendrier(vueJour ? "jour" : vueSemaine ? "semaine" : "mois", ancre, f.cle)}
            >
              {f.libelle}
            </Link>
          ))}
        </div>
      )}

      {vueJour ? (
        <div className="calendrier-journee">
          {HEURES_JOUR.map((heure) => {
            const { cours: cJour, rdvs: rJour, creneaux: crJour } = parJour.get(cleDate(ancre))!;
            const aCetteHeure = (d: Date) => d.getHours() === heure;
            return (
              <CelluleJour
                key={heure}
                cle={cleDate(ancre)}
                heure={heure}
                editable={estProfesseur}
                className="journee-ligne"
              >
                <span className="journee-heure">{formaterHeure(heure * 60)}</span>
                <div className="journee-contenu">
                  {(filtreActif === "tout" || filtreActif === "cours") &&
                    cJour.filter((c) => aCetteHeure(c.dateSeance!)).map((c) => (
                      <PuceEvenement
                        key={c.id}
                        href={"/cours/" + c.categorie.id + "/" + c.id}
                        className="evenement cours"
                        deplacable={estProfesseur}
                        type="cours"
                        id={c.id}
                      >
                        {heureCourt(c.dateSeance!)} — {c.titre}
                      </PuceEvenement>
                    ))}
                  {(filtreActif === "tout" || filtreActif === "rdv") &&
                    rJour.filter((r) => aCetteHeure(r.debut)).map((r) => (
                      <PuceEvenement
                        key={r.id}
                        href={"/calendrier/rdv/" + r.id}
                        className="evenement rdv"
                        deplacable={estProfesseur}
                        type="rdv"
                        id={r.id}
                      >
                        {heureCourt(r.debut)} — {estProfesseur ? r.eleve.prenom + " " + r.eleve.nom : "Rendez-vous"}
                      </PuceEvenement>
                    ))}
                  {!estProfesseur &&
                    crJour
                      .filter((cr) => cr.libre && aCetteHeure(cr.debut))
                      .map((cr) => (
                        <Link
                          key={cr.debut.toISOString()}
                          className="evenement creneau-libre"
                          href={"/calendrier/reserver?debut=" + cleDate(ancre) + "T" + String(cr.debut.getHours()).padStart(2, "0") + ":" + String(cr.debut.getMinutes()).padStart(2, "0") + "&duree=" + cr.dureeMin}
                        >
                          {heureCourt(cr.debut)} — Disponible
                        </Link>
                      ))}
                </div>
              </CelluleJour>
            );
          })}
        </div>
      ) : (
        <div className={"calendrier-grille" + (vueSemaine ? " vue-semaine" : "")}>
          {JOURS.map((j) => (
            <div key={j} className="calendrier-entete">
              {j}
            </div>
          ))}
          {jours.map((jour) => (
            <CelluleJour key={cleDate(jour)} cle={cleDate(jour)} editable={estProfesseur} className={classesJour(jour)}>
              {contenuJour(jour)}
            </CelluleJour>
          ))}
        </div>
      )}

      {estProfesseur && (
        <section className="card zone-enseignant" aria-label="Aujourd'hui" style={{ marginTop: 24 }}>
          <h2 className="section-title">Aujourd&apos;hui</h2>
          {rdvsJour.length === 0 && coursJour.length === 0 ? (
            <p className="text-muted" style={{ marginTop: 0 }}>
              Rien de prévu aujourd&apos;hui.
            </p>
          ) : (
            <ul className="liste-jour">
              {coursJour.map((c) => (
                <li key={"c" + c.id}>
                  {formaterDateHeure(c.dateSeance!)} — Cours : {c.titre}
                </li>
              ))}
              {rdvsJour.map((r) => (
                <li key={"r" + r.id}>
                  {formaterDateHeure(r.debut)} — Rendez-vous avec {r.eleve.prenom} {r.eleve.nom}
                  {r.motif ? " (" + r.motif + ")" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {estProfesseur && (
        <>
          <details className="details-form card" style={{ marginTop: 24 }}>
            <summary>Mes disponibilités (créneaux de rendez-vous)</summary>
            <DisposForms />
            {disponibilites.length > 0 && (
              <ul className="liste-jour">
                {disponibilites.map((d) => (
                  <li key={d.id}>
                    {JOURS_LONGS[d.jour]} {formaterHeure(d.debutMin)}–{formaterHeure(d.finMin)}{" "}
                    <BoutonSuppression
                      action={supprimerDisponibiliteAction}
                      id={d.id}
                      message="Supprimer cette disponibilité ? Les créneaux correspondants disparaîtront du calendrier."
                      libelle="Supprimer"
                    />
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className="details-form card" style={{ marginTop: 16 }}>
            <summary>Dates bloquées (vacances, congés...)</summary>
            <DisposForms bloquee />
            {bloquees.length > 0 && (
              <ul className="liste-jour">
                {bloquees.map((b) => (
                  <li key={b.date}>
                    {new Date(b.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{" "}
                    <BoutonSuppression
                      action={supprimerDateBloqueeAction}
                      id={b.date}
                      message="Débloquer cette date ? Les créneaux redeviendront réservables."
                      libelle="Débloquer"
                    />
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      )}
    </>
  );
}
