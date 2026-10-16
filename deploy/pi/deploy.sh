#!/bin/sh
# Déploiement / rollback de production sur le Raspberry Pi.
#
#   ./deploy/pi/deploy.sh v1.0.0     → déploie la version taguée v1.0.0
#   ./deploy/pi/deploy.sh v0.9.0     → rollback vers v0.9.0 (D4.4)
#
# À exécuter depuis la racine du dépôt cloné sur le Pi (ou n'importe où :
# le script se repositionne). Le tag doit exister sur GitHub (git fetch --tags).
set -eu
cd "$(dirname "$0")/../.."

TAG=${1:?usage: deploy.sh <tag>  (ex: v1.0.0)}

echo "── Synchronisation du dépôt sur le tag $TAG ──"
git fetch --tags --prune
git reset --hard "refs/tags/$TAG"

echo "── Version déployée : $TAG (écrit TAG= dans .env) ──"
sed -i "s/^TAG=.*/TAG=$TAG/" .env

echo "── Pull des images ──"
docker compose -f deploy/pi/docker-compose.prod.yml pull

echo "── Redémarrage (migrations puis app, sans interruption longue) ──"
docker compose -f deploy/pi/docker-compose.prod.yml up -d --remove-orphans

echo "── Nettoyage des images obsolètes ──"
docker image prune -f

echo "── Contrôle de santé (D4.3 : /api/sante) ──"
ok=0
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/sante 2>/dev/null | grep -q '"ok"'; then
    ok=1
    echo "Application en ligne (essai $i)."
    break
  fi
  sleep 5
done
docker compose -f deploy/pi/docker-compose.prod.yml ps
if [ "$ok" -ne 1 ]; then
  echo "ERREUR : /api/sante ne répond pas. Logs : docker compose -f deploy/pi/docker-compose.prod.yml logs app" >&2
  echo "Rollback : ./deploy/pi/deploy.sh <tag-précédent>" >&2
  exit 1
fi
