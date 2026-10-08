import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { lireFichier } from "@/lib/fichiers";

// Téléchargement d'un fichier joint (cours ou article de blog). Accessible à
// l'élève seulement si le contenu est publié ; toujours accessible au professeur.
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const utilisateur = await getSessionUser();
  if (!utilisateur) {
    return new Response("Connexion requise.", { status: 401 });
  }

  const { id } = await params;
  const fichier = await prisma.fichier.findUnique({
    where: { id },
    include: { cours: true, article: true },
  });
  if (!fichier) {
    return new Response("Fichier introuvable.", { status: 404 });
  }
  if (utilisateur.role !== "PROFESSEUR") {
    const visible =
      (fichier.coursId !== null && fichier.cours?.publie === true) ||
      (fichier.articleId !== null && fichier.article?.publie === true);
    if (!visible) {
      return new Response("Accès refusé.", { status: 403 });
    }
  }

  try {
    const donnees = await lireFichier(fichier.nomStocke);
    // Cast requis : TS ne reconnaît pas Uint8Array<ArrayBufferLike> comme BodyInit.
    const corps = donnees as unknown as BodyInit;
    return new Response(corps, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(fichier.nom),
      },
    });
  } catch {
    return new Response("Fichier introuvable sur le serveur.", { status: 404 });
  }
}
