import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import EditeurArticle from "../../editeur";

// F3.4 : rédaction professeur. L'article existe toujours (créé en brouillon
// au clic sur "Nouvel article"), l'éditeur sert à la création comme à la modification.
export default async function PageModifierArticle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) redirect("/connexion");
  if (utilisateur.role !== "PROFESSEUR") redirect("/");
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: { fichiers: { where: { estContenu: false }, orderBy: { createdAt: "asc" } } },
  });
  if (!article) notFound();

  return (
    <>
      <div className="crumbs">
        <Link href="/">Accueil</Link> &gt; <Link href={"/article/" + id}>Article</Link> &gt;{" "}
        <strong>Modification</strong>
      </div>
      <h1 className="page-title">Modifier l&apos;article</h1>
      <p className="page-subtitle">
        {article.publie ? "Cet article est publié : vos élèves le voient." : "Cet article est un brouillon : vos élèves ne le voient pas."}
      </p>
      <div className="card">
        <EditeurArticle
          article={{
            id: article.id,
            titre: article.titre,
            contenu: article.contenu,
            publie: article.publie,
            aIllustration: article.imageNomStocke !== null,
          }}
          pieces={article.fichiers.map((f) => ({ id: f.id, nom: f.nom, taille: f.taille }))}
        />
      </div>
      <p style={{ marginTop: 16 }}>
        <Link className="link" href={"/article/" + id}>
          Voir l&apos;article comme il s&apos;affichera
        </Link>
      </p>
    </>
  );
}
