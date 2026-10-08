"use client";

import Link from "next/link";

// Puce d'événement (rendez-vous ou cours). déplaçable = professeur : la puce
// peut être glissée vers un autre jour du calendrier.
export default function PuceEvenement({
  href,
  className,
  deplacable,
  type,
  id,
  children,
}: {
  href: string;
  className: string;
  deplacable: boolean;
  type?: "rdv" | "cours";
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className + (deplacable ? " deplacable" : "")}
      draggable={deplacable}
      onDragStart={
        deplacable
          ? (evenement) => {
              evenement.dataTransfer.setData(
                "application/x-evenement",
                JSON.stringify({ type, id })
              );
              evenement.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
    >
      {children}
    </Link>
  );
}
