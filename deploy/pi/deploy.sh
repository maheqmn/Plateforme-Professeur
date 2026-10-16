#!/bin/sh
# Déploiement / rollback sur le Raspberry Pi.
#
#   ./deploy/pi/deploy.sh v1.0.0              → production (port 3000)
#   ./deploy/pi/deploy.sh <sha> staging        → staging   (port 3001, tunnel SSH)
#   ./deploy/pi/deploy.sh v0.9.0               → rollback production (D4.4)
#
# À exécuter depuis la racine du dépôt cloné sur le Pi (le script se
# repositionne). Le tag doit exister sur GitHub.
set -eu
cd "$(dirname "$0")/../.."

TAG=${1:?usage: deploy.sh <tag> [prod|staging]}
ENVIRONNEMENT=${2:-prod}

case "$ENVIRONNEMENT" in
  prod)
    COMPOSE_F=deploy/pi/docker-compose.prod.yml
    ENV_F=.env
    PORT=3000
    ;;
  staging)
    COMPOSE_F=deploy/pi/docker-compose.staging.yml
    ENV_F=.env.staging
    PORT=3001
    ;;
  *)
    echo "Environnement inconnu : $ENVIRONNEMENT (attendu : prod|staging)" >&2
    exit 1
    ;;
esac

if [ ! -f "$ENV_F" ]; then
  echo "Fichier $ENV_F introuvable (voir .env.staging.example / .env.production.example)" >&2
  exit 1
fi

echo "── Synchronisation du dépôt sur le tag $TAG ──"
git fetch --tags --prune
git reset --hard "refs/tags/$TAG" 2>/dev/null || git reset --hard "$TAG"

echo "── Version déployée ($ENVIRONNEMENT) : $TAG ──"
sed -i "s/^TAG=.*/TAG=$TAG/" "$ENV_F"

echo "── Pull des images ──"
docker compose --env-file "$ENV_F" -f "$COMPOSE_F" pull

echo "── Redémarrage (migrations puis app) ──"
docker compose --env-file "$ENV_F" -f "$COMPOSE_F" up -d --remove-orphans

echo "── Nettoyage des images obsolètes ──"
docker image prune -f

echo "── Contrôle de santé (D4.3 : /api/sante) ──"
ok=0
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/sante" 2>/dev/null | grep -q '"ok"'; then
    ok=1
    echo "Application en ligne (essai $i)."
    break
  fi
  sleep 5
done
docker compose --env-file "$ENV_F" -f "$COMPOSE_F" ps
if [ "$ok" -ne 1 ]; then
  echo "ERREUR : /api/sante ne répond pas. Logs : docker compose -f $COMPOSE_F logs app" >&2
  echo "Rollback : ./deploy/pi/deploy.sh <tag-précédent>" >&2
  exit 1
fi
