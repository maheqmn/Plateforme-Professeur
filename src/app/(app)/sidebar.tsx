"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { deconnexionAction } from "./actions";

// F3.5 : barre latérale permanente, quatre entrées côté élèves.
// Exigence 7.4 : la barre ne change jamais de place.
const LIENS = [
  { href: "/", label: "Accueil", icone: "\u{1F3E0}" },
  { href: "/cours", label: "Mes cours", icone: "\u{1F4DA}" },
  { href: "/messages", label: "Messages", icone: "\u2709" },
  { href: "/calendrier", label: "Calendrier", icone: "\u{1F4C5}" },
];

export default function Sidebar({
  prenom,
  nom,
  role,
}: {
  prenom: string;
  nom: string;
  role: string;
}) {
  const chemin = usePathname();
  const initiales = (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
  const estProfesseur = role === "PROFESSEUR";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">L</div>
        <span>
          Plateforme
          <br />
          du professeur
        </span>
      </div>
      <nav aria-label="Navigation principale">
        {LIENS.map((lien) => (
          <Link key={lien.href} href={lien.href} className={chemin === lien.href ? "active" : ""}>
            <span className="nav-icon" aria-hidden="true">
              {lien.icone}
            </span>{" "}
            {lien.label}
          </Link>
        ))}
        {estProfesseur && (
          <Link href="/admin" className={chemin.startsWith("/admin") ? "active" : ""}>
            <span className="nav-icon" aria-hidden="true">
              {"\u2699"}
            </span>{" "}
            Administration
          </Link>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">{initiales}</div>
        <div>
          <div className="user-name">
            {prenom} {nom}
          </div>
          <div className="user-role">{estProfesseur ? "Professeur" : "Élève"}</div>
        </div>
        <form action={deconnexionAction}>
          <button type="submit" className="btn-logout">
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
