import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { lireFichier } from "@/lib/fichiers";

// Image d'illustration d'un article (F3.3). Accessible à l'élève seulement si
// l'article est publié ; toujours accessible au professeur.
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) {
    return new Response("Connexion requise.", { status: 401 });
  }

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || !article.imageNomStocke) {
    return new Response("Image introuvable.", { status: 404 });
  }
  if (utilisateur.role !== "PROFESSEUR" && !article.publie) {
    return new Response("Accès refusé.", { status: 403 });
  }

  try {
    const donnees = await lireFichier(article.imageNomStocke);
    const extension = article.imageNomStocke.split(".").pop()?.toLowerCase() ?? "";
    const typesImages: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      svg: "image/svg+xml",
    };
    // Cast requis : TS ne reconnaît pas Uint8Array<ArrayBufferLike> comme BodyInit.
    const corps = donnees as unknown as BodyInit;
    return new Response(corps, {
      headers: {
        "Content-Type": typesImages[extension] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Image introuvable sur le serveur.", { status: 404 });
  }
}
