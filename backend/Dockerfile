# syntax=docker/dockerfile:1
#
# Image Docker de l'API c3-digital (NestJS). Construite depuis la RACINE du
# monorepo (voir docker-compose.yml : `build.context: .`), car le backend
# dépend du workspace npm `@c3-digital/shared` (types + configurations JSON
# des 5 formulaires officiels, `shared/forms/*.json`).
#
# Build manuel :
#   docker build -f backend/Dockerfile -t c3-digital-api .
# Usage normal : `docker compose up -d` (voir docker-compose.yml, service `api`).

##### Étape 1 : installation + compilation #####
FROM node:20-bookworm-slim AS build
WORKDIR /app

# On copie d'abord uniquement les manifests pour profiter du cache Docker :
# `npm ci` ne se relance que si un package.json ou le lockfile changent, pas
# à chaque modification du code source.
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
COPY web/package.json web/package.json

RUN npm ci

COPY shared shared
COPY backend backend

# @c3-digital/shared doit être compilé en premier : le backend l'importe
# via son `main` (shared/dist/index.js, voir shared/package.json), résolu
# par le lien symbolique npm workspaces node_modules/@c3-digital/shared.
RUN npm run build:shared
RUN npm run build --workspace=backend

##### Étape 2 : image d'exécution #####
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production

# Chromium pour la génération PDF côté serveur (voir
# backend/src/modules/pdf/pdf.service.ts, resolveExecutablePath()) :
# `/usr/bin/chromium` fait partie de sa liste de chemins candidats, donc
# aucune variable d'environnement supplémentaire n'est nécessaire ici.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# On conserve l'arborescence complète backend/ + shared/ (sources
# TypeScript comprises, pas seulement `dist/`), plutôt qu'un node_modules
# "élagué" : les scripts `npm run seed:*` et `npm run migration:*'
# s'exécutent via ts-node contre `backend/src` (voir backend/package.json),
# et lisent directement `shared/forms/*.json` sur disque (voir
# backend/src/database/seeds/seed-form-templates.ts). Ce choix privilégie
# la fiabilité d'un déploiement pilote à la taille minimale de l'image —
# voir backend/README.md, section "Déploiement (Docker)".
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/shared shared
COPY --from=build /app/backend backend

EXPOSE 3000
WORKDIR /app/backend

CMD ["node", "dist/main.js"]
