#!/bin/sh
# D1.5 : construction des images, taguée par le SHA Git + latest.
#   app   -> plateforme-professeur:<sha> et plateforme-professeur:latest
#   outils -> plateforme-professeur-outils:latest (jobs de migration, D1.4)
set -eu
cd "$(dirname "$0")/../.."
SHA=$(git rev-parse --short HEAD)
IMAGE=plateforme-professeur

echo "==> build ${IMAGE}:${SHA} (cible app)"
docker build --target app -t "${IMAGE}:${SHA}" -t "${IMAGE}:latest" .

echo "==> build ${IMAGE}-outils:latest (cible outils)"
docker build --target outils -t "${IMAGE}-outils:latest" .

echo "OK : ${IMAGE}:${SHA}, ${IMAGE}:latest, ${IMAGE}-outils:latest"
