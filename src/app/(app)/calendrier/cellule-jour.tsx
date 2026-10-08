"use client";

import { useRouter } from "next/navigation";
import { useState, startTransition } from "react";
import { glisserEvenementAction } from "./actions";

// Zone interactive du calendrier (professeur, style Teams). Sert aussi bien
// de cellule de jour (vue mois/semaine) que de ligne d'heure (vue jour) :
// - double-clic : ouvre la création d'événement, la date (et l'heure s'il y
//   en a une) sont pré-remplies ;
// - zone de dépôt : glisser-déposer d'un rendez-vous ou d'un cours ; l'heure
//   cible est celle de la ligne en vue Jour ;
// - en cas de chevauchement, un message d'erreur s'affiche.
export default function CelluleJour({
  cle,
  heure,
  editable,
  className,
  children,
}: {
  cle: string;
  heure?: number;
  editable: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");

  return (
    <div
      className={className + (editable ? " jour-editable" : "")}
      title={
        editable
          ? "Double-cliquez pour créer un événement" + (heure !== undefined ? " à " + heure + "h" : " ce jour-là")
          : undefined
      }
      onDoubleClick={
        editable
          ? () =>
              router.push(
                "/calendrier/nouveau?date=" + cle + (heure !== undefined ? "T" + String(heure).padStart(2, "0") + ":00" : "")
              )
          : undefined
      }
      onDragOver={editable ? (evenement) => evenement.preventDefault() : undefined}
      onDrop={
        editable
          ? (evenement) => {
              evenement.preventDefault();
              const brut = evenement.dataTransfer.getData("application/x-evenement");
              if (!brut) return;
              let donnees: { type?: string; id?: string };
              try {
                donnees = JSON.parse(brut);
              } catch {
                return;
              }
              if (!donnees.type || !donnees.id) return;
              const formData = new FormData();
              formData.set("type", donnees.type);
              formData.set("id", donnees.id);
              formData.set("date", cle);
              if (heure !== undefined) formData.set("heure", String(heure));
              startTransition(async () => {
                const resultat = await glisserEvenementAction(formData);
                setErreur(resultat.erreur ?? "");
                router.refresh();
              });
            }
          : undefined
      }
    >
      {children}
      {editable && erreur && <span className="erreur-depot">{erreur}</span>}
    </div>
  );
}
