# Simulateur de Prêt Immobilier

Application web de simulation de prêt immobilier avec cinq modules :

1. **Simulateur de prêt** — Mensualité, coût, TAEG comparé au seuil d'usure, prêts complémentaires (PTZ…) avec lissage, remboursement anticipé et modulation, tableau d'amortissement par année, exports Excel et PDF
2. **Capacité d'emprunt** — Capital empruntable selon le taux d'endettement, prix du bien accessible (frais de notaire au barème, travaux)
3. **Projet** — Montant à emprunter pour un bien donné, plan de financement besoins / ressources, export PDF
4. **Comparer** — 2 à 4 prêts côte à côte (chargeables depuis l'historique), et un mode « Louer ou acheter »
5. **Historique** — Simulations, capacités et projets enregistrés : ouvrir, comparer, mettre à jour, renommer, supprimer

Toutes les calculettes de prêt intègrent une assurance emprunteur optionnelle, calculée sur le capital initial (contrat de la banque) ou sur le capital restant dû (délégation).

La saisie de chaque onglet est conservée sur l'appareil (`localStorage`) ; l'Historique, lui, est stocké côté serveur.

L'app est installable comme **PWA** sur mobile (Android / iOS) : icône sur l'écran d'accueil, ouverture plein écran, splash screen.

## Stack technique

- **Frontend** : Vue 3 + Vite + Tailwind CSS + `vite-plugin-pwa` (Workbox), police Archivo auto-hébergée
- **Backend** : Express 4 + better-sqlite3
- **Auth** : OIDC Authorization Code + PKCE (Pocket ID / Authentik)
- **Build** : Docker multi-stage (`node:22.23.5-alpine`, version épinglée)
- **Thème** : clair / sombre / système (toggle dans le header) ; couleurs et police définies une seule fois dans `frontend/src/assets/main.css`
- **Navigation** : barre d'onglets en bas sur téléphone et tablette, onglets dans l'en-tête sur grand écran

## Prérequis

- Docker & Docker Compose
- Un provider OIDC (Pocket ID ou Authentik)

## Lancement

### Avec l'image GHCR (recommandé)

```bash
cp docker-compose-exemple.yml docker-compose.yml
cp .env.example .env   # puis renseigner les variables OIDC et SESSION_SECRET
docker compose up -d
```

Le `docker-compose.yml` lit toute la configuration dans `.env` (`env_file`) : aucun secret n'est écrit dans le fichier Compose.

L'image `ghcr.io/gritztj/loan-calc:latest` est automatiquement tirée depuis GitHub Container Registry.

> Le conteneur tourne en utilisateur `node` (UID 1000). Au premier démarrage, vérifier que le volume `./data` côté hôte est inscriptible par cet UID : `sudo chown -R 1000:1000 ./data`.

### Build local

```bash
cp docker-compose-exemple.yml docker-compose.yml   # puis remplacer image: par build: .
cp .env.example .env
docker compose up -d --build
```

L'application est accessible via Traefik sur `https://loan-calc.domaine.fr`.

## Entretien trimestriel : seuils d'usure

Les seuils d'usure embarqués (`frontend/src/services/usury.js`) changent chaque trimestre. Mettre à jour la période et les trois taux d'après l'avis de la Banque de France, puis publier une version. Passé la fin du trimestre, l'app signale elle-même que la valeur est périmée ; un seuil peut aussi être saisi à la main dans le Simulateur.

## Mises à jour de sécurité de Node

La version de Node est épinglée dans le `Dockerfile` (deux `FROM`) et dans le workflow GitHub Actions. Pour appliquer un correctif de sécurité Node : relever ces versions, pousser un tag, puis `docker compose pull && docker compose up -d`. Vérification : `docker exec loan-calc node -v`.

Version minimale : **22.23.4** (correctif Node2Shell, CVE-2026-111497).

## CI/CD

L'image Docker est buildée et publiée automatiquement sur **GHCR** via GitHub Actions lors du push d'un tag Git :

```bash
git tag v2.4.3
git push origin v2.4.3
```

Tags générés : `ghcr.io/gritztj/loan-calc:2.4.3`, `ghcr.io/gritztj/loan-calc:2.4`, `ghcr.io/gritztj/loan-calc:latest`.

## Développement local

### Backend
```bash
cd backend
npm install
DATABASE_PATH=./data/loan-calc.db NODE_ENV=development node index.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # proxy /api et /auth → localhost:3000 via vite.config.js
```

Frontend sur `http://localhost:5173`, API sur `http://localhost:3000`.

### Tests
```bash
cd frontend && npm test   # formules financières (Vitest)
cd backend && npm test    # API simulations + redirection après login (node --test)
```

Les deux suites tournent dans GitHub Actions avant chaque build d'image.

> `NODE_ENV=development` désactive le flag `secure` sur le cookie de session (nécessaire sans HTTPS en local).

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_PATH` | `./data/loan-calc.db` | Chemin vers la base SQLite |
| `API_PORT` | `3000` | Port d'écoute du serveur Express |

### Authentification OIDC

| Variable | Exemple | Description |
|----------|---------|-------------|
| `OIDC_ISSUER` | `https://pocket-id.domaine.fr` | URL racine du provider (sans slash final) |
| `OIDC_CLIENT_ID` | — | Client ID créé chez le provider |
| `OIDC_CLIENT_SECRET` | — | Client secret |
| `OIDC_REDIRECT_URI` | `https://loan-calc.domaine.fr/auth/callback` | URI de retour après authentification |
| `SESSION_SECRET` | — | Secret cookie session (min. 32 chars — `openssl rand -hex 32`) |

**Configuration Pocket ID :**
- Callback URL : `https://loan-calc.domaine.fr/auth/callback`
- Post-logout redirect URI : `https://loan-calc.domaine.fr/`
- PKCE : activé

Voir `.env.example` pour référence complète.

## Structure

```
loan-calc/
├── docker-compose-exemple.yml # Orchestration Docker + labels Traefik (à copier en docker-compose.yml)
├── Dockerfile                # Build multi-stage
├── backend/
│   ├── index.js              # Serveur Express (API + static + auth guard)
│   ├── auth.js               # Middleware OIDC (session, login, callback, logout)
│   ├── db.js                 # Init SQLite
│   └── routes/
│       └── simulations.js    # CRUD simulations
└── frontend/
    ├── public/icons/         # Icônes PWA (svg + png 192/512/maskable/apple) et splash iOS
    ├── scripts/              # generate-splash.mjs : régénère icônes et splash depuis favicon.svg
    └── src/
        ├── components/       # Composants Vue (UI)
        ├── composables/      # useTheme, useIsDark
        └── services/         # loanCalculator, storageService, excelExport
```

## Installation comme PWA

- **Android (Chrome / Edge)** : ouvrir l'app, menu ⋮ → "Ajouter à l'écran d'accueil" (ou bandeau d'installation natif)
- **iOS (Safari)** : ouvrir l'app, bouton de partage → "Sur l'écran d'accueil"

Une fois installée, l'app s'ouvre en plein écran sans la barre d'URL. Les mises à jour sont silencieuses : la nouvelle version s'applique au prochain rechargement complet de l'app.

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/simulations` | Liste toutes les simulations |
| `POST` | `/api/simulations` | Crée une simulation `{ name, type, params }` |
| `DELETE` | `/api/simulations/:id` | Supprime une simulation |
