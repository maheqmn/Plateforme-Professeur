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

  // Contenu d'exemple (phase 2) si aucun dossier n'existe encore.
  const nbCategories = await prisma.categorie.count();
  if (nbCategories === 0) {
    const categorie = await prisma.categorie.create({
      data: { titre: "Cours débutant", ordre: 1 },
    });
    const exemples = [
      {
        titre: "Cours 1 — Allumer et utiliser l'ordinateur",
        description: "Découvrir l'écran, la souris et le clavier, sans crainte de rien casser.",
        contenu:
          "## Objectif du cours\n\nCe premier cours vous aide à vous sentir à l'aise devant l'ordinateur.\n\n- Allumer et éteindre l'ordinateur correctement\n- Utiliser la souris : cliquer, double-cliquer\n- Se repérer sur l'écran\n\n## À retenir\n\n**Il n'y a rien à casser.** Si quelque chose s'affiche mal, on peut toujours recommencer.",
        publie: true,
        ordre: 1,
      },
      {
        titre: "Cours 2 — Naviguer sur Internet",
        description: "Ouvrir un site, revenir en arrière, ajouter un site en favori.",
        contenu:
          "## Objectif du cours\n\nInternet permet de lire des articles, regarder des vidéos et rester en contact.\n\n- Ouvrir son navigateur\n- Saisir une adresse internet\n- Revenir à la page précédente\n\n## Pour aller plus loin\n\nVoici un tutoriel vidéo utile : [Apprendre à naviguer sur Internet](https://www.youtube.com/results?search_query=apprendre+internet+seniors)",
        publie: true,
        ordre: 2,
      },
      {
        titre: "Cours 3 — Envoyer un email",
        description: "Écrire, répondre et joindre un document à un message.",
        contenu:
          "## Objectif du cours\n\nL'email est le courrier d'Internet.\n\n- Écrire un nouveau message\n- Répondre à un message reçu\n- Joindre une photo\n\n## À retenir\n\n**Attention aux emails suspects** : si un message inconnu vous promet de l'argent, ne cliquez sur rien.",
        publie: true,
        ordre: 3,
      },
      {
        titre: "Cours 4 — Reconnaître une arnaque en ligne",
        description: "Les signes qui doivent alerter, et les bons réflexes.",
        contenu: "Ce cours est encore en préparation. Il sera visible des élèves une fois terminé.",
        publie: false,
        ordre: 4,
      },
    ];
    for (const exemple of exemples) {
      await prisma.cours.create({
        data: { ...exemple, categorieId: categorie.id },
      });
    }
    console.log("Catégorie « Cours débutant » créée avec 4 cours d'exemple (dont 1 en préparation).");
  }

  // Articles d'exemple (phase 3, F3.2) si aucun article n'existe encore.
  const nbArticles = await prisma.article.count();
  if (nbArticles === 0) {
    const aujourdhui = new Date();
    const ilYA = (jours: number) => new Date(aujourdhui.getTime() - jours * 24 * 60 * 60 * 1000);
    const articles = [
      {
        titre: "Reconnaître un email frauduleux : les 5 signes qui alertent",
        contenu:
          "## Pourquoi ce dossier ?\n\nLes emails frauduleux imitent de mieux en mieux les vrais messages de votre banque ou de vos proches. Voici les signes qui doivent alerter.\n\n- **L'urgence** : « votre compte sera bloqué dans 24 heures » — une vraie banque ne vous presse jamais ainsi.\n- **L'expéditeur inconnu** : vérifiez l'adresse complète, pas seulement le nom affiché.\n- **Les fautes d'orthographe** dans un message soi-disant officiel.\n- **La demande de code ou de mot de passe** : aucune organisation sérieuse ne les demande par email.\n- **Le lien trompeur** : survolez le lien avec la souris et lisez l'adresse réelle avant de cliquer.\n\n## Le bon réflexe\n\n**En cas de doute, ne cliquez sur rien.** Appelez votre banque au numéro figurant sur votre relevé, ou montrez le message à un proche de confiance.",
        publie: true,
        epingle: true,
        publieLe: ilYA(1),
      },
      {
        titre: "Bien utiliser sa messagerie : joindre une photo à un email",
        contenu:
          "## Envoyer une photo à vos proches\n\nC'est l'une des demandes les plus fréquentes en cours ! La marche à suivre avec la plupart des messageries :\n\n- Ouvrez un **nouveau message** et remplissez le destinataire.\n- Cliquez sur le trombone ou sur « Joindre un fichier ».\n- Retrouvez votre photo dans le dossier **Images**, puis cliquez sur « Ouvrir ».\n- Attendez que la pièce soit chargée, puis cliquez sur **Envoyer**.\n\n## À retenir\n\nUne photo prise avec un téléphone moderne peut être **volumineuse** : une seule par message, c'est plus sûr.",
        publie: true,
        epingle: false,
        publieLe: ilYA(5),
      },
      {
        titre: "Qu'est-ce que l'intelligence artificielle ? (en toute simplicité)",
        contenu:
          "## Une calculatrice géante qui imite le langage\n\nL'intelligence artificielle dont on parle dans les journaux est un programme entraîné sur d'immenses quantités de textes, capable de **rédiger des réponses** en imitant notre façon d'écrire.\n\n## Ce qu'elle sait faire\n\n- Résumer un long texte\n- Proposer une liste de courses à partir d'une recette\n- Répondre à des questions générales\n\n## Ce qu'elle ne sait pas faire\n\nElle peut **se tromper avec aplomb** : elle ne « sait » rien, elle prédit des mots plausibles. Vérifiez toujours une information importante auprès d'une source fiable.\n\n## Pour aller plus loin\n\nUn guide accessible : [Comprendre l'IA en 10 questions](https://www.cnous.fr)",
        publie: true,
        epingle: false,
        publieLe: ilYA(12),
      },
      {
        titre: "Nouveautés : les aides auditives connectées",
        contenu: "Cet article est encore au brouillon. Il sera visible des élèves une fois terminé.",
        publie: false,
        epingle: false,
        publieLe: null,
      },
    ];
    for (const article of articles) {
      await prisma.article.create({ data: article });
    }
    console.log("Blog créé avec 4 articles d'exemple (dont 1 épinglé, 1 brouillon).");
  }
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
