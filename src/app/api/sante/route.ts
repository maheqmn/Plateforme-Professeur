import fs from "node:fs";
import { prisma } from "@/lib/db";
import { DOSSIER_STOCKAGE, preparerDossierStockage } from "@/lib/fichiers";

// D1.3 / D3.2 : sonde de santé utilisée par le HEALTHCHECK Docker et les
// probes Kubernetes (readiness/liveness). Vérifie la base et le volume de
// stockage ; aucun secret n'est exposé dans la réponse.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await preparerDossierStockage();
    await fs.promises.access(DOSSIER_STOCKAGE, fs.constants.W_OK);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degrade" }, { status: 503 });
  }
}
