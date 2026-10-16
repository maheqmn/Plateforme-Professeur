# Déploiement production — Plateforme-Professeur

Mise en ligne automatisée sur **https://cours.galleriedearmelle.fr**, hébergée
sur le Raspberry Pi 5 déjà utilisé pour la galerie (Caddy frontal commun).

> **Arbitrage enregistré** (16 octobre 2026) : le cahier des charges prévoyait
> une instance cloud UE + k3s (D3) ; l'hébergement retenu est le Pi maison,
> déjà en production pour la galerie. Conséquences assumées : disponibilité
> liée à la box, sauvegardes à répliquer hors du Pi (§8), pas d'orchestrateur
> (compose suffit au dimensionnement, 8.4). Les données restent en France (8.3).

---

## 1. Architecture

```
                Internet
                    │  80/443 (redirections box → Pi)
        ┌───────────┴────────────┐
        │  Raspberry Pi 5       │
        │  ┌──────────────────┐  │   réseau docker partagé « web »
        │  │ Caddy (galerie)  │──┼──► galleriedearmelle.fr → galerie
        │  │  TLS Let's Encrypt│  │
        │  └──────────────────┘  │
        │        │                │──► cours.galleriedearmelle.fr
        │        ▼                   → plateforme-app:3000
        │  ┌─────────────────────────────┐
        │  │ compose plateforme-professeur│
        │  │  app (Next.js standalone)   │── 127.0.0.1:3000 (contrôles)
        │  │  db (PostgreSQL 16)         │── volume pgdata-prod
        │  │  rappels (cron horaire F5.5)│
        │  │  migrate (prisma, 1 lancement/déploiement) │
        │  └─────────────────────────────┘
        │  volumes : pgdata-prod, stockage-prod (fichiers joints)
        └───────────────────────────────┘

GitHub Actions : push main → qualité + build ARM64 → ghcr.io
                 tag v*  → en plus déploiement SSH sur le Pi (D4.3)
```

## 2. Prérequis sur le Pi

Si la galerie tourne déjà, tout est prêt : Docker, UFW (22/80/443),
redirections de la box, DynHost. Sinon, suivre d'abord les sections 1 à 3 du
`DEPLOY.md` du projet GalerieArmelle.

## 3. DNS — OVH, zone galleriedearmelle.fr

| Type  | Nom    | Valeur                     |
|-------|--------|----------------------------|
| CNAME | `cours`| `galleriedearmelle.fr.`   |

Le DynHost existant met à jour l'enregistrement A de la racine ; le CNAME
suit automatiquement.

> **Orthographe** : le domaine enregistré est `galleriedearmelle.fr`
> (deux « l ») ; le `DEPLOY.md` de la galerie mentionne `galeriedearmelle.fr`
> (un « l ») qui ne résout pas. Vérifier dans le manager OVH quel domaine est
> réellement possédé avant de créer l'enregistrement.

## 4. Réseau partagé avec Caddy (une fois)

```bash
docker network create web
```

Dans le compose de la galerie, rattacher le service `caddy` au réseau externe :

```yaml
services:
  caddy:
    networks: [default, web]   # ajouter web
networks:
  web:
    external: true
```

Puis ajouter le site du fichier `deploy/pi/Caddyfile-plateforme` au Caddyfile
de la galerie et recharger :

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## 5. Installation sur le Pi (une fois)

```bash
cd ~ && git clone https://github.com/maheqmn/Plateforme-Professeur.git
cd Plateforme-Professeur
cp .env.production.example .env
nano .env        # POSTGRES_PASSWORD = openssl rand -hex 24
docker login ghcr.io -u maheqmn   # PAT GitHub, scope read:packages

docker compose -f deploy/pi/docker-compose.prod.yml up -d
curl http://127.0.0.1:3000/api/sante   # → {"status":"ok"}
```

Compte professeur initial : lancer une fois le seed (voir §10), ou créer le
compte via une invitation.

## 6. Automatisation GitHub → Pi

1. **Clé SSH dédiée** (machine de dev) :
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/plateforme_deploy -C "github-actions"
   ssh-copy-id -i ~/.ssh/plateforme_deploy.pub pi@IP_DU_PI
   ```
2. **Secrets** (Settings → Secrets and variables → Actions) :
   `PI_HOST`, `PI_USER`, `PI_SSH_KEY` (clé privée), `PI_SSH_PORT`, et
   `PI_PATH=/home/pi/Plateforme-Professeur`.
3. **Environnement** `production` (Settings → Environments) : ajouter un
   *required reviewer* pour valider chaque mise en production.

Fonctionnement ensuite (workflow `.github/workflows/ci-cd.yml`) :

- `git push` sur `main` → TypeScript + `prisma validate`, build ARM64 des deux
  images (app + outils), scan Trivy bloquant sur les vulnérabilités critiques,
  push vers ghcr.io (`sha` + `latest`).
- `git tag v1.0.0 && git push origin v1.0.0` → en plus, déploiement sur le Pi :
  `deploy/pi/deploy.sh` synchronise le dépôt, écrit `TAG=` dans `.env`, tire
  les images, applique les migrations puis redémarre, et contrôle
  `/api/sante`. **Rien n'est reconstruit sur le Pi.**

## 7. Mise à jour et rollback (D4.4)

```bash
# Déployer une version (depuis la machine de dev) :
git tag v1.1.0 && git push origin v1.1.0

# Rollback (sur le Pi, commande unique) :
./deploy/pi/deploy.sh v1.0.0
```

Les migrations ne redescendent pas de version : toute migration irréversible
est interdite sans procédure de retour écrite (D4.4).

## 8. Sauvegardes (D2.3, exigence 8.2)

```bash
chmod +x scripts/backup-postgres.sh scripts/restore-postgres.sh
crontab -e
#   0 3 * * * /home/pi/Plateforme-Professeur/scripts/backup-postgres.sh >> /home/pi/plateforme-backup.log 2>&1
```

Base d'abord, fichiers ensuite (cohérence), rétention 30 jours dans
`./backups/`. Répliquer hors du Pi (exigence 8.3 — le Pi n'est pas un lieu de
sauvegarde sûr) : `rsync -az backups/ utilisateur@nas:/backups/plateforme/`.

Restauration (à éprouver une fois en conditions réelles, D8.3) :

```bash
./scripts/restore-postgres.sh backups/plateforme_YYYYMMDD_HHMM.sql.gz backups/stockage_YYYYMMDD_HHMM.tar.gz
```

## 9. Sécurité (D7, adapté)

- HTTPS partout + HSTS : gérés par le Caddy de la galerie (site block fourni).
- Secrets uniquement dans `.env` sur le Pi et les secrets GitHub — jamais en
  clair dans Git (l'image n'embarque aucun secret, D1.3).
- Le Pi n'expose que 22/80/443 (UFW) ; l'app n'est joignable que via Caddy.
- Images scannées à chaque build (Trivy, bloquant sur CRITICAL).

## 10. Commandes utiles

```bash
COMPOSE="docker compose -f deploy/pi/docker-compose.prod.yml"
$COMPOSE ps                     # état + santé
$COMPOSE logs -f app            # logs (emails en mode console tant que
                                # le service transactionnel n'est pas branché)
$COMPOSE exec db psql -U plateforme -d plateforme   # accès base

# Créer le compte professeur initial (une fois) :
docker compose -f deploy/pi/docker-compose.prod.yml run --rm \
  rappels npx tsx prisma/seed.ts
```

## 11. Reste à faire avant l'ouverture aux élèves

- Brancher le service d'emails transactionnels dans `src/lib/email.ts`
  (D5.3) — sans lui, codes de connexion 2FA et rappels ne partent pas.
- Éprouver une restauration complète (D8.3).
- Recette fonctionnelle sur le sous-domaine (D8.6) avant d'inviter les élèves.
