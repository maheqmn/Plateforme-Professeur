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
  messagesNonLus = 0,
}: {
  prenom: string;
  nom: string;
  role: string;
  messagesNonLus?: number;
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
            {/* F4.5 : point rouge en cas de message non lu */}
            {lien.label === "Messages" && messagesNonLus > 0 && (
              <span className="badge-non-lu" title={messagesNonLus + " message(s) non lu(s)"} />
            )}
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
        <div className="ligne-utilisateur">
          <div className="avatar">{initiales}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">
              {prenom} {nom}
            </div>
            <div className="user-role">{estProfesseur ? "Professeur" : "Élève"}</div>
          </div>
        </div>
        <div className="ligne-actions">
          <form action={deconnexionAction}>
            <button type="submit" className="btn-logout">
              Se déconnecter
            </button>
          </form>
          {/* Exigence 7.7 : bouton d'aide permanent, en bas à droite. */}
          <Link className="lien-aide" href="/aide" title="Aide — le mode d'emploi de la plateforme">
            Aide ?
          </Link>
        </div>
      </div>
    </aside>
  );
}
