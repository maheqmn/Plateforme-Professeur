#!/bin/sh
# Réplication des sauvegardes vers un autre appareil (D2.3, exigences 8.2/8.3).
#
#   ./scripts/replicateur-sauvegardes.sh utilisateur@hote[:/chemin]
#   ex : ./scripts/replicateur-sauvegardes.sh pi@192.168.1.50:/mnt/usb/plateforme
#
# Sans --delete : la cible conserve l'historique complet même après la purge
# des 30 jours locale (protection contre l'écrasement ou la suppression).
# Cron conseillé, après la sauvegarde locale :
#   30 3 * * * /home/pi/Plateforme-Professeur/scripts/replicateur-sauvegardes.sh pi@nas:/... >> /home/pi/plateforme-backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."

CIBLE=${1:?usage: replicateur-sauvegardes.sh utilisateur@hote[:/chemin]}

[ -d backups ] || { echo "Aucun dossier ./backups — lancer d'abord scripts/backup-postgres.sh" >&2; exit 1; }

rsync -az backups/ "$CIBLE/"
echo "OK : backups/ répliqué vers $CIBLE"
