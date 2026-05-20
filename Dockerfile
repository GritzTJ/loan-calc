# Stage 1 : build de l'application Vue
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 : serveur Express (API + fichiers statiques)
FROM node:22-alpine
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
# Copie le build Vue dans le dossier servi par Express
COPY --from=build /app/dist ./public
# Exécution en utilisateur non-root (le user `node` existe dans l'image officielle).
# Le volume monté ./data devra appartenir à UID 1000 côté hôte.
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app
USER node
EXPOSE 3000
CMD ["node", "index.js"]
