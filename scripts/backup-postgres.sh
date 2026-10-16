#!/bin/sh
# Sauvegarde quotidienne de production (D2.3) : base PostgreSQL puis fichiers
# joints (la cohérence base/fichiers est assurée par l'ordre des exports).
# À lancer depuis la racine du dépôt sur le Pi. Cron conseillé (3 h du matin) :
#   0 3 * * * /home/pi/Plateforme-Professeur/scripts/backup-postgres.sh >> /home/pi/plateforme-backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f deploy/pi/docker-compose.prod.yml"
DATE=$(date +%Y%m%d_%H%M)
BACKUPS=${BACKUPS_DIR:-./backups}
RETENTION_JOURS=${RETENTION_JOURS:-30}

mkdir -p "$BACKUPS"

echo "── Sauvegarde base PostgreSQL ($DATE) ──"
$COMPOSE exec -T db pg_dump -U plateforme plateforme | gzip > "$BACKUPS/plateforme_${DATE}.sql.gz"

echo "── Sauvegarde des fichiers joints (volume stockage-prod) ──"
docker run --rm \
  -v plateforme-professeur_stockage-prod:/data:ro \
  -v "$(pwd)/$BACKUPS":/backup \
  alpine tar czf "/backup/stockage_${DATE}.tar.gz" -C /data .

echo "── Purge des sauvegardes de plus de $RETENTION_JOURS jours ──"
find "$BACKUPS" -name 'plateforme_*.sql.gz' -mtime "+$RETENTION_JOURS" -delete
find "$BACKUPS" -name 'stockage_*.tar.gz' -mtime "+$RETENTION_JOURS" -delete

echo "OK : $BACKUPS/plateforme_${DATE}.sql.gz + stockage_${DATE}.tar.gz"
echo "Conseil (8.3) : rsyncer $BACKUPS/ vers un stockage hors du Pi :"
echo "  rsync -az $BACKUPS/ utilisateur@nas:/backups/plateforme/"
