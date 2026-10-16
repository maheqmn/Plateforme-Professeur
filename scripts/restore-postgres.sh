#!/bin/sh
# Restauration d'une sauvegarde (D2.3, procédure éprouvée en recette exigée).
#
#   ./scripts/restore-postgres.sh backups/plateforme_20261016_0300.sql.gz [backups/stockage_20261016_0300.tar.gz]
#
# Arrête l'app (aucune écriture pendant la restauration), restaure la base,
# puis les fichiers si l'archive est fournie, et redémarre.
set -eu
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f deploy/pi/docker-compose.prod.yml"
BASE=${1:?usage: restore-postgres.sh <base.sql.gz> [stockage.tar.gz]}
FICHIERS=${2:-}

[ -f "$BASE" ] || { echo "Archive introuvable : $BASE" >&2; exit 1; }
[ -z "$FICHIERS" ] || [ -f "$FICHIERS" ] || { echo "Archive introuvable : $FICHIERS" >&2; exit 1; }

echo "── Arrêt de l'application (base figée) ──"
$COMPOSE stop app rappels

echo "── Restauration de la base ──"
gunzip -c "$BASE" | $COMPOSE exec -T db psql -U plateforme -d plateforme

if [ -n "$FICHIERS" ]; then
  echo "── Restauration des fichiers joints ──"
  docker run --rm \
    -v plateforme-professeur_stockage-prod:/data \
    -v "$(pwd)":/src \
    alpine sh -c "rm -rf /data/* && tar xzf '/src/$FICHIERS' -C /data"
fi

echo "── Redémarrage ──"
$COMPOSE up -d --remove-orphans
$COMPOSE ps
echo "Vérifier : curl http://127.0.0.1:3000/api/sante"
