import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "professeur@plateforme.local";
  const existant = await prisma.user.findUnique({ where: { email } });
  if (!existant) {
    await prisma.user.create({
      data: {
        prenom: "Jacques",
        nom: "Martin",
        email,
        passwordHash: await bcrypt.hash("Professeur!2026", 10),
        role: "PROFESSEUR",
      },
    });
    console.log("Compte professeur créé : " + email + " / Professeur!2026");
  } else {
    console.log("Le compte professeur existe déjà.");
  }

  // F1.3 : durée de validité par défaut des invitations (2 jours).
  await prisma.setting.upsert({
    where: { key: "invitationDureeJours" },
    update: {},
    create: { key: "invitationDureeJours", value: "2" },
  });
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
