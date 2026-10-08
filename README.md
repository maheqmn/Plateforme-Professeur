# Plateforme-Professeur

Plateforme web privée e-learning pour apprenants seniors : cours, blog, messagerie et calendrier gérés par un professeur unique.

- [Cahier des charges v1.0](cahier-des-charges.md)
- [Maquettes phase 0](maquettes/index.html) — connexion, dashboard, cours, calendrier (ouvrir dans un navigateur)

## Démarrage (phase 1 — fondations)

Prérequis : Node.js 20 ou plus récent.

```bash
npm install          # installe les dépendances et génère le client Prisma
npm run db:push      # crée la base SQLite de développement (prisma/dev.db)
npm run db:seed      # crée le compte professeur et les paramètres par défaut
npm run dev          # démarre le serveur de développement sur http://localhost:3000
```

Compte professeur créé par le seed :

- Email : `professeur@plateforme.local`
- Mot de passe : `Professeur!2026`
- La connexion professeur exige un code à 6 chiffres envoyé par email (F1.5).

### Emails en développement

Aucun service d'email n'est branché (phase 1). Tous les emails (code de vérification,
invitation, réinitialisation) sont affichés dans la console du serveur sous la forme
d'un bloc `=== EMAIL (mode développement) ===`. En production, brancher un service
transactionnel (Brevo, Postmark...) dans `src/lib/email.ts`.

### Pile technique (exigence 8.1)

- Next.js 15 (App Router, TypeScript) — interface et API dans une même application.
- Prisma + SQLite en développement ; le schéma est prêt pour PostgreSQL en production
  (changer `DATABASE_URL` dans `.env`).
- Sessions serveur signées (empreinte SHA-256 du jeton en base), bcrypt pour les mots
  de passe.

### Ce qui est implémenté en phase 1

- Connexion élèves et professeur, double authentification par email du professeur (F1.1, F1.5).
- Invitations à usage unique, durée paramétrable, révocation (F1.2, F1.3, F1.4).
- Inscription en deux étapes, politique de mot de passe (F1.4).
- Réinitialisation de mot de passe par lien valable 1 heure (F1.6).
- Sessions : 30 minutes d'inactivité, « Rester connecté » 30 jours (F1.7).
- Désactivation d'élève avec déconnexion immédiate (F1.8), traçabilité des connexions (F1.9).
- Verrouillage après 5 échecs de connexion (exigence 8.2).
- Barre latérale permanente, dashboard vide, rubriques Cours / Messages / Calendrier en
  préparation (F3.5).
- Administration professeur : invitations, élèves, paramètres (F6.1 à F6.3, partie phase 1).

### Ce qui est implémenté en phase 2 (gestion des cours, F2)

- Arborescence à deux niveaux : dossiers (catégories) en grandes cartes, liste des cours,
  page de cours avec fil d'Ariane (F2.1, F2.2, exigence 7.4).
- Contenu de cours : texte mis en forme (titres, gras, listes, liens — markdown simple,
  rendu sécurisé par échappement HTML), fichiers joints (10 Mo max, stockage local
  `stockage/`), lien externe optionnel (F2.3).
- Mode édition professeur : nouveau dossier, nouveau cours, modifier, supprimer avec
  confirmation nommée, boutons Monter/Descendre, déplacement d'un cours entre dossiers (F2.5, F2.7).
- Publication : un nouveau cours est « en préparation » ; seul le professeur le voit
  jusqu'à publication (F2.6).
- Progression : case « Cours terminé » pour l'élève, et bloc de progression sur le
  dashboard dans la catégorie la plus consultée (F2.3, F2.4).

### Ce qui est implémenté en phase 3 (blog d'accueil, F3)

- Le dashboard est le blog : cartes des derniers articles avec image ou illustration,
  titre, date, chapô de deux lignes, bouton « Lire l'article » (F3.1).
- Article complet : titre, date, image d'illustration, texte mis en forme (markdown
  étendu aux images téléchargées), fichiers joints, « Publié par [nom] » et
  « Retour aux articles » (F3.3).
- Rédaction professeur : éditeur simple (titre, gras, listes, liens, images par
  téléchargement), statut brouillon / publié, enregistrement automatique toutes les
  60 secondes et alerte si l'onglet est fermé avec des modifications non enregistrées (F3.4).
- Réorganisation : ordre antichronologique, article épinglable « À la une » affiché
  en tête (F3.6).
- Les pièces jointes des articles réutilisent le modèle `Fichier` de la phase 2 et la
  route `/fichiers/[id]` (accès élève uniquement si le contenu est publié).

### Ce qui est implémenté en phase 4 (messagerie, F4)

- Conversation privée unique entre chaque élève et le professeur — aucune
  communication entre élèves, pas de recherche de destinataire (F4.1).
- Vue élève : historique déroulant, bulles distinctes selon l'expéditeur, saisie
  en bas, bouton « Envoyer » grand et visible (F4.2).
- Vue professeur : liste des conversations (nom de l'élève, dernier message,
  date, nombre de non lus) ; un clic ouvre la conversation complète (F4.3).
- Envoi de texte et pièces jointes (images, PDF, 10 Mo max par fichier) ;
  suppression de son propre message dans les 5 minutes avec confirmation,
  modération professeur illimitée (F4.4, F4.6).
- Point rouge sur l'entrée « Messages » de la barre latérale en cas de non lu,
  et email au destinataire avec lien direct vers la conversation (F4.5).
- Les pièces jointes de messages réutilisent le modèle `Fichier` et la route
  `/fichiers/[id]` (accessibles seulement aux deux participants).

### Ce qui est implémenté en phase 5 (calendrier et rendez-vous, F5)

- Calendrier partagé : vue mensuelle ou hebdomadaire, dates de cours visibles
  de tous, rendez-vous visibles du professeur et de l'élève concerné seul (F5.1).
- Disponibilités du professeur : plages récurrentes (jour + heures) et dates
  bloquées (vacances) ; créneaux individuels de 30 ou 60 minutes (F5.2).
- Prise de rendez-vous : créneaux libres en vert avec « Disponible », fenêtre
  de confirmation simple avec motif optionnel (F5.3).
- Verrouillage : le créneau réservé disparaît pour les autres élèves ; la
  visibilité et la limite d'un rendez-vous à venir (paramétrable) sont
  contrôlées côté serveur (F5.4, F5.8).
- Teams : le professeur colle le lien de la réunion, l'élève le voit et le
  reçoit par email ; rappel 24 heures avant via `npm run rappels`
  (à planifier en cron en production) (F5.5).
- Modification / annulation : le professeur déplace ou annule tout rendez-vous
  (email automatique) ; l'élève annule jusqu'à 24 heures avant ; un cours peut
  changer de date (champ « date de séance ») et les élèves sont prévenus (F5.6, F5.7).
- Vue professeur : filtres Tout / Cours / Rendez-vous / Disponibilités et
  aperçu du jour en liste (F5.9).
- Ergonomie façon Teams : bouton « Nouvel événement » (rendez-vous avec un élève
  ou planification de la séance d'un cours), double-clic sur un jour pour créer
  avec la date pré-remplie, vue Jour heure par heure, et glisser-déposer d'un
  rendez-vous ou d'un cours vers un autre jour (l'heure est conservée, les
  emails de déplacement partent automatiquement).

### À faire (phases suivantes)

- Avertissement « Vous allez être déconnecté » 2 minutes avant expiration (F1.7, partie client).
- Mentions légales et politique de confidentialité rédigées (8.3).
- Mises en ligne : hébergement, sauvegardes, cron des rappels (phase 6).
