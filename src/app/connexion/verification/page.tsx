import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import VerificationForm from "./verification-form";

// F1.5 : seconde étape de connexion du professeur (code reçu par email).
export default async function PageVerification() {
  const store = await cookies();
  const token = store.get("verification2fa")?.value;
  if (!token) redirect("/connexion");

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">&#128273;</div>
          <h1>Vérification en deux étapes</h1>
        </div>
        <p className="login-sub">
          Pour sécuriser l&apos;espace professeur, un code à 6 chiffres a été envoyé par email. Il est valable
          10 minutes.
        </p>
        {process.env.NODE_ENV !== "production" && (
          <p className="notice">
            Mode développement : le code est affiché dans la console du serveur (bloc « EMAIL »).
          </p>
        )}
        <VerificationForm />
        <div className="login-links">
          <Link className="link" href="/connexion">
            Revenir à la connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
