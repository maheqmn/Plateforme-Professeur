import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import EvenementForms from "./evenement-forms";

// Création d'événement par le professeur (bouton "Nouvel événement" ou
// double-clic sur un jour du calendrier). Réservée au professeur.
export default async function PageNouvelEvenement({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  if (utilisateur.role !== "PROFESSEUR") redirect("/calendrier");

  const { date } = await searchParams;
  const dateSuggeree = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(date ?? "") ? date! : "";

  const [eleves, cours] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ELEVE", actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, prenom: true, nom: true },
    }),
    prisma.cours.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, titre: true, dateSeance: true },
    }),
  ]);

  return (
    <>
      <div className="crumbs">
        <Link href="/calendrier">Calendrier</Link> &gt; <strong>Nouvel événement</strong>
      </div>
      <h1 className="page-title">Nouvel événement</h1>
      <p className="page-subtitle">
        Créez un rendez-vous avec un élève, ou planifiez la séance d&apos;un cours.
      </p>
      {eleves.length === 0 && (
        <p className="notice">
          Vous n&apos;avez pas encore d&apos;élève actif : seul le cours peut être planifié pour l&apos;instant.
        </p>
      )}
      <EvenementForms
        dateSuggeree={dateSuggeree || new Date().toISOString().slice(0, 10)}
        eleves={eleves.map((e) => ({ id: e.id, nom: e.prenom + " " + e.nom }))}
        cours={cours.map((c) => ({
          id: c.id,
          titre: c.titre,
          date: c.dateSeance
            ? c.dateSeance.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
            : null,
        }))}
      />
    </>
  );
}
