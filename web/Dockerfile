# syntax=docker/dockerfile:1
#
# Image Docker du web c3-digital (React + Vite, servi en statique par
# nginx). Comme backend/Dockerfile, à construire depuis la RACINE du
# monorepo (dépendance au workspace `@c3-digital/shared`) :
#   docker build -f web/Dockerfile -t c3-digital-web \
#     --build-arg VITE_API_BASE_URL=https://api.exemple.cd .
#
# IMPORTANT : Vite intègre `VITE_API_BASE_URL` dans le bundle JS au moment
# du *build*, pas au démarrage du conteneur (contrairement à l'API) — voir
# web/README.md, section "Déploiement". Il faut donc reconstruire l'image
# (ou fournir un autre `--build-arg`) si l'URL de l'API change.

##### Étape 1 : build de production #####
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
COPY web/package.json web/package.json

RUN npm ci

COPY shared shared
COPY web web

RUN npm run build:shared

ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build --workspace=web

##### Étape 2 : nginx (fichiers statiques) #####
FROM nginx:1.27-alpine AS runtime

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80
