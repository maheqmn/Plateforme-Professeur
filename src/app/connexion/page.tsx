import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import ConnexionForm from "./connexion-form";

// F1.1 : écran de connexion public, sans élément distrayant.
export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ espace?: string; reinitialise?: string; expire?: string }>;
}) {
  const params = await searchParams;

  const utilisateur = await getSessionUser();
  if (utilisateur) redirect("/");

  return (
    <ConnexionForm
      espaceProfesseur={params.espace === "professeur"}
      reinitialise={params.reinitialise === "1"}
      expire={params.expire === "1"}
    />
  );
}
