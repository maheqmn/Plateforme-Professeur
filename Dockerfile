# syntax=docker/dockerfile:1

# Phase 6 — conteneurisation (cahier des charges de déploiement, D1).
# Cibles :
#   app (défaut) : image applicative minimale (sortie standalone Next.js)
#                  -> docker build .
#   outils       : prisma-cli + scripts pour les jobs de migration, de seed
#                  et de rappels (D1.4) -> docker build --target outils .

ARG NODE_IMAGE=node:22-alpine

# ---- deps : dépendances + client Prisma ciblant PostgreSQL -----------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# Le schéma doit être présent avant npm ci : le postinstall exécute
# "prisma generate" (D2.1 : production sur PostgreSQL, le dépôt reste SQLite).
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
 && npm ci

# ---- builder : next build, sortie standalone (D1.1) ------------------------
FROM deps AS builder
COPY . .
# "COPY . ." restaure le schéma SQLite du contexte : rebasculer en PostgreSQL.
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
 && npm run build

# ---- app : exécution minimale et durcie (D1.2, D1.3) -----------------------
FROM ${NODE_IMAGE} AS app
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# D1.3 : utilisateur non-root (compte "node" fourni par l'image officielle,
# uid 1000). Le dossier des fichiers joints est un point de montage.
RUN mkdir -p /app/stockage && chown node:node /app/stockage
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Le moteur Prisma n'est pas toujours remonté par le traçage de fichiers de
# Next.js : copie explicite (évite "Query engine library not found").
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
USER node
EXPOSE 3000
# D1.3 : HEALTHCHECK intégré — /api/sante vérifie base + volume de stockage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/api/sante" || exit 1
CMD ["node", "server.js"]

# ---- outils : jobs de migration / seed / rappels (D1.4) ---------------------
FROM ${NODE_IMAGE} AS outils
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
COPY prisma/seed.ts prisma/rappels-email.ts ./prisma/
CMD ["npx", "prisma", "migrate", "deploy"]
