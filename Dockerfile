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
EXPOSE 3000
CMD ["node", "index.js"]
