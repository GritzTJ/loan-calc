# Simulateur de Prêt Immobilier

Application web de simulation de prêt immobilier avec quatre modules :

1. **Simulateur de prêt** — Mensualité, tableau d'amortissement, graphique, export Excel
2. **Capacité d'emprunt** — Capital empruntable selon le taux d'endettement, prix du bien accessible
3. **Comparaison de scénarios** — Deux prêts côte à côte avec tableau comparatif
4. **Historique** — Sauvegarde, rechargement et suppression des simulations

Toutes les calculettes intègrent un champ assurance emprunteur optionnel.

## Stack technique

- **Frontend** : Vue 3 + Vite + Tailwind CSS
- **Backend** : Express 4 + better-sqlite3
- **Build** : Docker multi-stage (Node 22 → Node 22 Alpine)
- **Thème** : clair / sombre / système (toggle dans le header)

## Prérequis

- Docker & Docker Compose

## Lancement

```bash
docker compose up -d --build
```

L'application est accessible via Traefik sur `https://loan-calc.domaine.fr`.

## Développement local

### Backend
```bash
cd backend
npm install
DATABASE_PATH=./data/loan-calc.db node index.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # proxy /api → localhost:3000 via vite.config.js
```

Frontend sur `http://localhost:5173`, API sur `http://localhost:3000`.

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_PATH` | `./data/loan-calc.db` | Chemin vers la base SQLite |
| `API_PORT` | `3000` | Port d'écoute du serveur Express |

Voir `.env.example` pour référence.

## Structure

```
loan-calc/
├── docker-compose.yml        # Orchestration Docker + labels Traefik
├── Dockerfile                # Build multi-stage
├── backend/
│   ├── index.js              # Serveur Express (API + static)
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
