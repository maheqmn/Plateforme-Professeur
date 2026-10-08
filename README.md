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

### À faire (phases suivantes)

- Avertissement « Vous allez être déconnecté » 2 minutes avant expiration (F1.7, partie client).
- Mentions légales et politique de confidentialité rédigées (8.3).
- Cours (phase 2), blog (phase 3), messagerie (phase 4), calendrier (phase 5).
