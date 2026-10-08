import Link from "next/link";
import { verifierInvitation } from "@/lib/invitation";
import InscriptionForm from "./inscription-form";

// F1.4 : inscription en deux étapes. On arrive ici avec une invitation validée.
// Une invitation expirée, utilisée ou révoquée affiche un message clair.
export default async function PageInscription({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string }>;
}) {
  const params = await searchParams;
  const verification = params.invitation ? await verifierInvitation(params.invitation) : null;
  const valide = verification && verification.ok ? verification : null;

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">&#128100;</div>
          <h1>Créez votre compte</h1>
        </div>
        {valide ? (
          <InscriptionForm codeInvitation={valide.invitation.code} />
        ) : (
          <>
            <p className="alert" role="alert">
              {verification && !verification.ok
                ? verification.erreur
                : "Aucune invitation valide n'a été fournie."}
            </p>
            <div className="login-links">
              <Link className="link" href="/invitation">
                Saisir une invitation
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
