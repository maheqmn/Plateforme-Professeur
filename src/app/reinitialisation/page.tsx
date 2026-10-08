import Link from "next/link";
import { prisma } from "@/lib/db";
import ReinitialisationForm from "./formulaire";

// F1.6 : page atteinte depuis le lien reçu par email (?token=...).
export default async function PageReinitialisation({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const demande = token
    ? await prisma.passwordReset.findFirst({
        where: { token, utiliseLe: null, expireLe: { gt: new Date() } },
      })
    : null;

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-logo">&#128273;</div>
          <h1>Choisir un nouveau mot de passe</h1>
        </div>
        {demande ? (
          <ReinitialisationForm token={token} />
        ) : (
          <>
            <p className="alert" role="alert">
              Ce lien n&apos;est plus valable ou a déjà été utilisé. Demandez un nouveau lien.
            </p>
            <div className="login-links">
              <Link className="link" href="/mot-de-passe-oublie">
                Demander un nouveau lien
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
