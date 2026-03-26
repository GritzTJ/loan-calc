# Simulateur de Prêt Immobilier

Application web de simulation de prêt immobilier avec cinq modules :

1. **Simulateur de prêt** — Mensualité, tableau d'amortissement, graphique, export Excel
2. **Capacité d'emprunt** — Capital empruntable selon le taux d'endettement, prix du bien accessible
3. **Projet** — Vue d'ensemble d'un projet d'achat immobilier
4. **Comparaison de scénarios** — Deux prêts côte à côte avec tableau comparatif
5. **Historique** — Sauvegarde, rechargement et suppression des simulations

Toutes les calculettes intègrent un champ assurance emprunteur optionnel.

## Stack technique

- **Frontend** : Vue 3 + Vite + Tailwind CSS
- **Backend** : Express 4 + better-sqlite3
- **Auth** : OIDC Authorization Code + PKCE (Pocket ID / Authentik)
- **Build** : Docker multi-stage (Node 22 Alpine)
- **Thème** : clair / sombre / système (toggle dans le header)

## Prérequis

- Docker & Docker Compose
- Un provider OIDC (Pocket ID ou Authentik)

## Lancement

### Avec l'image GHCR (recommandé)

```bash
cp .env.example .env   # puis renseigner les variables OIDC
docker compose up -d
```

L'image `ghcr.io/gritztj/loan-calc:latest` est automatiquement tirée depuis GitHub Container Registry.

### Build local

```bash
cp .env.example .env
docker compose up -d --build   # nécessite build: . dans docker-compose.yml
```

L'application est accessible via Traefik sur `https://loan-calc.domaine.fr`.

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
├── docker-compose.yml        # Orchestration Docker + labels Traefik
├── Dockerfile                # Build multi-stage
├── backend/
│   ├── index.js              # Serveur Express (API + static + auth guard)
│   ├── auth.js               # Middleware OIDC (session, login, callback, logout)
│   ├── db.js                 # Init SQLite
│   └── routes/
│       └── simulations.js    # CRUD simulations
└── frontend/
    └── src/
        ├── components/       # Composants Vue (UI)
        ├── composables/      # useTheme, useIsDark
        └── services/         # loanCalculator, storageService, excelExport
```

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/simulations` | Liste toutes les simulations |
| `POST` | `/api/simulations` | Crée une simulation `{ name, type, params }` |
| `DELETE` | `/api/simulations/:id` | Supprime une simulation |
