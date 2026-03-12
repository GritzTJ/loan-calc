# Simulateur de Prêt Immobilier

Application web de simulation de prêt immobilier avec deux modules :

1. **Simulateur de prêt** — Calcul de mensualité et tableau d'amortissement complet
2. **Capacité d'emprunt** — Calcul du capital empruntable selon le taux d'endettement, avec estimation du prix du bien accessible (frais de notaire inclus)

## Stack technique

- **Frontend** : Vue 3 + Vite + Tailwind CSS
- **Serveur** : nginx:alpine (fichiers statiques)
- **Build** : Docker multi-stage (Node 22 → nginx)

## Prérequis

- Docker & Docker Compose

## Lancement

```bash
docker compose up -d --build
```

L'application est accessible via Traefik sur `https://loan-calc.domaine.fr`.

## Développement local

```bash
cd frontend
npm install
npm run dev
```

Accessible sur `http://localhost:5173`.

## Variables d'environnement

Voir `.env.example`. La v1 ne nécessite aucune variable (calculs 100% côté client).

## Structure

```
loan-calc/
├── docker-compose.yml        # Orchestration Docker + labels Traefik
├── Dockerfile                # Build multi-stage
├── nginx.conf                # Config nginx SPA
└── frontend/
    └── src/
        ├── components/       # Composants Vue (UI)
        ├── services/         # Logique métier et abstraction stockage
        └── assets/           # Styles CSS
```

## Notes v2

Le code est structuré pour permettre l'ajout d'une couche de persistance SQLite :
- `services/loanCalculator.js` : fonctions pures réutilisables côté serveur
- `services/storageService.js` : interface d'abstraction prête pour des appels API REST
