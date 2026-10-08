# Cahier des charges — Déploiement automatisé et conteneurisation (Docker / Kubernetes)

Version 1.0 — 8 octobre 2026

Complète le « Cahier des charges — Plateforme web e-learning pour apprenants seniors »
(phases 1 à 5 livrées). Correspond à la phase 6 : mise en ligne, sauvegardes,
recette. Les exigences sont numérotées D1 à D9.

---

## 1. Contexte et objectifs

L'application (Next.js 15, App Router, Server Actions, Prisma) est terminée
fonctionnellement. Elle fonctionne en développement avec SQLite, un stockage de
fichiers local (`stockage/`), des emails journalisés en console et un script de
rappels (`npm run rappels`). Ce document définit son industrialisation :

- Conteneurisation reproductible (Docker).
- Orchestration en cluster (Kubernetes, léger : k3s).
- Chaîne CI/CD : commit → tests → image → déploiement automatisé.
- Zéro coupure visible pour les élèves lors des mises à jour (exigence 7.6 :
  chaque page en moins de 3 secondes, y compris pendant un déploiement).

Volumétrie de référence (cahier initial, 8.4) : 1 compte professeur, 20 à 50
élèves, quelques centaines de messages, 30 à 100 rendez-vous par an, 5 Go de
fichiers maximum. **Le dimensionnement reste modeste** : un cluster mono-noeud
(k3s) sur une petite instance cloud UE suffit largement ; l'architecture reste
toutefois portable vers un cluster managé plus grand sans changement de code.

## 2. Choix structurants

| Sujet | Développement (actuel) | Production (cible) | Motif |
| --- | --- | --- | --- |
| Base de données | SQLite (`prisma db push`) | PostgreSQL 16 (`prisma migrate`) | Exigence 8.1 du cahier initial : le schéma est déjà compatible. |
| Fichiers joints | dossier local `stockage/` | Volume persistant (PVC) | Le module `src/lib/fichiers.ts` isole déjà le stockage : un seul fichier à modifier pour un futur S3. |
| Emails | console serveur | Brevo / Postmark (API) | Exigence 8.1 : brancher dans `src/lib/email.ts` uniquement. |
| Rappels 24 h | script manuel | CronJob Kubernetes | F5.5 : planification horaire. |
| Processus | `next dev` | conteneur `next start` (sortie standalone) | Reproductibilité. |

## 3. Conteneurisation (Docker) — D1

D1.1 — **Image applicative unique** `plateforme-professeur`, build multi-étapes :
installation des dépendances, `prisma generate`, `next build`, puis image finale
minimale sur base `node:22-alpine` n'embarquant que la sortie standalone de
Next.js (`output: "standalone"` à activer dans `next.config.ts`) et le client
Prisma généré.

D1.2 — **Image de production seulement** : aucun outil de build, pas de
`node_modules` complet, pas de sources superflus. `.dockerignore` excluera
`.next`, `node_modules`, `stockage/`, `prisma/dev.db`, `.git`.

D1.3 — **Durcissement** : utilisateur non-root dédié, lecture seule du système
de fichiers applicatif possible, variables d'environnement uniquement (aucun
secret dans l'image), `HEALTHCHECK` intégré.

D1.4 — **Image `outils`** (facultative) : prisma-cli + kubectl pour les jobs de
migration et de sauvegarde, afin de ne pas alourdir l'image applicative.

D1.5 — **Reproductibilité** : image taguée par le SHA Git (par ex.
`ghcr.io/<compte>/plateforme-professeur:abc1234`) plus un tag `latest` mobile.
Le tag déployé est tracé dans le déploiement Kubernetes (annotation).

D1.6 — **Environnement local conteneurisé** : un `docker-compose.yml` permet de
remonter l'application + PostgreSQL + un faux service SMTP (Mailpit) pour
développer et recetter dans les mêmes conditions que la production.

## 4. Migrations et données — D2

D2.1 — **Passage SQLite → PostgreSQL** : le schéma est déjà compatible ; la
donnée de développement n'est pas à migrer (la production part d'une base vide,
puis exécute `prisma migrate deploy` + le seed de contenu d'exemple).

D2.2 — **Migrations versionnées** : abandon de `db push` pour la production.
Chaque changement de schéma passe par `prisma migrate dev` en local, le dossier
`prisma/migrations/` est versionné Git, et `migrate deploy` s'exécute en job
Kubernetes **avant** le déploiement de la nouvelle image (initContainer ou
CronJob pré-déploiement).

D2.3 — **Sauvegardes quotidiennes** (exigence 8.2) : CronJob `pg_dump` compressé,
conservation 30 jours, export chiffré vers un stockage objet (S3 ou équivalent)
**situé dans l'UE** (8.3). Un déploiement de restauration est documenté et
éprouvé au moins une fois en recette : critère d'acceptation explicite.

D2.4 — **Fichiers joints** : sauvegardés avec la même cadence (tar du volume
`stockage/` vers le même stockage objet). La cohérence base/fichiers est
assurée par l'ordre des exports (base d'abord).

## 5. Orchestration Kubernetes — D3

Cluster cible : **k3s mono-noeud** sur instance cloud UE (2 vCPU / 4 Go suffisent),
ingress Traefik (inclus dans k3s) + cert-manager pour le HTTPS.

D3.1 — **Espace de noms** `plateforme` ; manifestes versionnés Git
(`deploy/k8s/`), paramétrés par kustomize (une base + deux superpositions
`staging` et `production`).

D3.2 — **Déploiement applicatif** :
- `Deployment` plateforme-professeur, **2 replicas** (mise à jour sans coupure),
  stratégie `RollingUpdate` (maxUnavailable 0, maxSurge 1) ;
- `readinessProbe` sur `/api/sante` (vérifie session + base + volume), `livenessProbe`
  idem ; les probes sont implémentées dans l'application (route dédiée) ;
- requêtes/limites de ressources modestes (ex. 150m/256Mo de requête,
  500m/512Mo de limite), à affiner en recette ;
- `securityContext` non-root, `readOnlyRootFilesystem` true (sauf `/tmp`).

D3.3 — **Service et Ingress** : Service ClusterIP, Ingress Traefik avec TLS
Let's Encrypt automatique (cert-manager), redirection HTTP → HTTPS, en-têtes
de sécurité (HSTS). Exigence 8.2 : HTTPS obligatoire sur tout le site.

D3.4 — **PostgreSQL** : déploiement `StatefulSet` mono-réplica + PVC (20 Go) sur
le cluster (le dimensionnement ne justifie pas un service managé ; la
compatibilité avec un PostgreSQL managé — Neon, Scalingo, OVH — reste exigée par
la simple variable d'environnement). Mot de passe dans un `Secret`.

D3.5 — **Volume fichiers** : `PVC` 10 Go monté sur `/app/stockage`, `ReadWriteOnce`
suffisant tant qu'un seul replica écrit ; en cas de passage à S3 (recommandé à
moyen terme, exigence 8.1), le PVC est retiré sans changement applicatif.

D3.6 — **CronJobs** :
- `rappels` (horaire) : exécute le script des rappels 24 h (F5.5) ; le champ
  `rappelEnvoyeLe` garantit l'unicité, donc un passage horaire est sûr ;
- `sauvegarde` (quotidienne, 3h du matin) : D2.3 ;
- `purge-sauvegardes` (hebdomadaire) : suppression des exports de plus de
  30 jours.

D3.7 — **Secrets** : `DATABASE_URL`, `EMAIL_API_KEY`, `ORIGINE` (URL publique),
stockés dans des `Secret` Kubernetes, remplis par la CI depuis des variables
chiffrées du dépôt (GitHub Actions secrets) — jamais en clair dans Git.
Rotation documentée. Les tokens de session étant des valeurs aléatoires de
256 bits (hachées en base), aucun secret supplémentaire n'est requis pour
elles.

D3.8 — **Anti-chevauchement de rendez-vous en multi-replicas** (point de
vigilance) : vérifier en recette que la validation serveur (`conflitRdv`) reste
correcte avec 2 replicas — les écritures passent par la même base, mais un
verrou applicatif PostgreSQL (transaction + contrainte) sera ajouté si la
recette révèle des courses.

## 6. Chaîne CI/CD — D4

Déclencheurs sur GitHub (le dépôt Git actuel), pipeline GitHub Actions :

D4.1 — **À chaque push** : `tsc --noEmit`, build Next.js, `prisma validate`,
build de l'image Docker (cache par couches), **scan de vulnérabilités**
(trivy) bloquant sur les vulnérabilités critiques.

D4.2 — **À chaque merge sur `main`** : tag de l'image par SHA, push vers le
registre (GHCR), déploiement sur **staging** (même cluster, espace de noms
`plateforme-staging`, URL privée protégée par authentification basique).

D4.3 — **Déploiement production** : **déclenché par tag `v*`** (pas
automatique sur main) — décision humaine explicite conformément aux bonnes
pratiques de ce projet. Étapes : job migrations → `kubectl set image` (ou
kustomize edit + apply) → attente des probes prêts → contrôle post-déploiement
(GET `/api/sante`, page d'accueil, connexion).

D4.4 — **Rollback** : commande unique documentée (`kubectl rollout undo` ou
re-tag de l'image précédente), testée au moins une fois en recette. Les
migrations ne descendant pas de version, toute migration irréversible est
interdite sans procédure de retour écrite.

D4.5 — **Traçabilité** : chaque déploiement annote le Deployment avec le SHA
Git, le tag d'image et l'auteur ; les 10 derniers ReplicaSets sont conservés
(`revisionHistoryLimit: 10`).

## 7. Adaptations applicatives requises — D5

Petits développements dans l'application, préalables au déploiement :

- D5.1 — `output: "standalone"` dans `next.config.ts` (build d'image léger) ;
  vérifier que les Server Actions et le mode MPA fonctionnent en standalone.
- D5.2 — Route `/api/sante` : vérifie la session (lecture de cookie), la base
  (`SELECT 1`) et l'accès au volume fichiers ; renvoie 200 ou 503. Aucune
  information sensible dans le corps de réponse.
- D5.3 — `src/lib/email.ts` : branchement réel du service transactionnel
  (Brevo) derrière la même signature `envoyerEmail` ; le mode console reste
  actif si `EMAIL_API_KEY` est absente.
- D5.4 — `prisma/rappels-email.ts` : lecture de `DATABASE_URL` déjà en place ;
  ajouter la journalisation compatible conteneur (sortie standard uniquement).
- D5.5 — Dossier `prisma/migrations/` initialisé à partir du schéma courant
  (`migrate init`), et `package.json` : script `migrate:deploy`.

## 8. Environnements — D6

| Environnement | But | Données |
| --- | --- | --- |
| Local (compose) | Développement quotidien | Volume jetable, seed à volonté |
| Staging (cluster) | Recette avant production | Copie anonymisée ou seed ; emails vers Mailpit |
| Production (cluster) | Service aux élèves | Données réelles, sauvegardes |

D6.1 — Staging et production partagent les mêmes manifestes kustomize ; seuls
diffèrent l'URL, les secrets et les ressources.
D6.2 — La production n'est jamais déployée depuis un poste local ; uniquement
par la CI, sur tag.

## 9. Sécurité — D7

D7.1 — Images scannées à chaque build (D4.1) ; base alpine reconstruite
hebdomadairement.
D7.2 — Secrets hors Git (D3.7) ; aucun secret dans les logs (masquage CI).
D7.3 — HTTPS partout (D3.3), HSTS activé après validation du domaine.
D7.4 — L'accès au cluster (kubeconfig) est limité à la CI et au professeur ;
pas d'exposition de l'API Kubernetes sur Internet (k3s écoute en local, accès
via tunnel SSH).
D7.5 — Les données personnelles restent dans l'UE : instance et stockage objet
au minimum (8.3). Le registre d'images (GHCR) est hors UE : les images ne
contiennent que du code, mais deux options se présentent et l'arbitrage se
fera au démarrage de la phase — soit un registre UE (OVH, Scalingo ou
équivalent), soit une exception documentée et motivée pour le seul registre
d'images, mentionnée dans la politique de confidentialité.

## 10. Recette et critères d'acceptation — D8

D8.1 — Un déploiement complet depuis un commit vierge (cluster vide) prend
moins de 30 minutes en suivant uniquement la documentation.
D8.2 — Mise à jour de version en production : aucun message d'erreur visible
côté élève, interruption ressentie inférieure à 10 secondes (2 replicas,
RollingUpdate).
D8.3 — Restauration de sauvegarde éprouvée : base + fichiers remontés sur
staging, application fonctionnelle, contenu vérifié.
D8.4 — Le CronJob rappels envoie bien les emails 24 h avant (test avec un
rendez-vous réel).
D8.5 — Scan d'image sans vulnérabilité critique ; pods non-root vérifiés.
D8.6 — Parcours de recette fonctionnel complet (connexion, invitation, cours,
blog, message, réservation, rappel) exécuté sur staging avant chaque
déploiement production.

## 11. Documentation — D9

D9.1 — `deploy/README.md` : procédure d'installation du cluster de zéro
(instance, k3s, cert-manager, namespaces, secrets), ordonnée pas à pas et
sans jargon, utilisable par un administrateur non expert.
D9.2 — Procédures : déployer une version, revenir en arrière, restaurer une
sauvegarde, ajouter un secret, monter la taille d'un volume.
D9.3 — Schéma d'architecture (composants et flux) dans le README de déploiement.

## 12. Planning indicatif

| Étape | Contenu | Durée |
| --- | --- | --- |
| 1 | Standalone + `/api/sante` + migrations + email Brevo (D5) | 3 jours |
| 2 | Dockerfile + compose + Mailpit (D1) | 3 jours |
| 3 | k3s + manifestes + secrets + CronJobs (D3) | 4 jours |
| 4 | CI/CD GitHub Actions + staging + rollback (D4, D6) | 3 jours |
| 5 | Sauvegardes + restauration éprouvée (D2) | 2 jours |
| 6 | Recette complète + documentation (D8, D9) | 3 jours |

Total indicatif : 3 semaines, en cohérence avec la phase 6 du cahier initial.

## 13. Hors périmètre

- Multi-région, haute disponibilité au-delà de 2 replicas, autoscaling
  horizontal (la volumétrie 8.4 ne le justifie pas).
- Migrations de données depuis les bases SQLite de développement.
- Migration du stockage fichiers vers S3 : recommandée à moyen terme
  (exigence 8.1 du cahier initial), mais planifiée comme évolution séparée
  car `src/lib/fichiers.ts` l'isolera proprement.
