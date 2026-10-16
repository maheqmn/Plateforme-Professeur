#!/bin/sh
# Création d'une migration versionnée pour la production PostgreSQL (D2.2).
#
#   npm run migrate:dev -- nom-de-la-migration
#
# Le schéma du dépôt reste SQLite (développement local) ; ce script génère
# une variante PostgreSQL éphémère et lance `prisma migrate dev` contre le
# PostgreSQL du compose local (docker compose up -d db, port 127.0.0.1:5432).
# La migration créée rejoint prisma/migrations/, versionnée par Git, puis
# appliquée en production par `prisma migrate deploy` (jamais db push).
set -eu
cd "$(dirname "$0")/.."

NOM=${1:?usage: npm run migrate:dev -- <nom-de-la-migration> (sans espaces)}
: "${DATABASE_URL:=postgresql://plateforme:plateforme@localhost:5432/plateforme?schema=public}"

sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > prisma/schema.postgres.prisma
trap 'rm -f prisma/schema.postgres.prisma' EXIT

DATABASE_URL="$DATABASE_URL" npx prisma migrate dev \
  --schema prisma/schema.postgres.prisma --name "$NOM"
