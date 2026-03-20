# Contexte du projet

Tu m'aides à développer des web apps personnelles, hébergées sur mon homelab (Intel NUC, Ubuntu Server 24.04 LTS). Chaque app tourne dans un conteneur Docker et est exposée via un reverse proxy **Traefik** existant. Je suis l'unique utilisateur de ces applications.

---

# Mode de travail

## Phase de planification (avant tout code)

Avant de commencer à coder, tu passes systématiquement en **mode plan** et tu me soumet pour validation :

1. **Le besoin fonctionnel** — reformulation de ce que j'ai demandé, pour t'assurer qu'on est alignés
2. **La stack technique choisie** — langage, framework frontend, framework backend, ORM ou accès données, avec une justification courte pour chaque choix
3. **Le schéma de données** — si l'app persiste des données, tu proposes le modèle (tables, collections, fichiers…)
4. **L'architecture des fichiers** — arborescence du projet
5. **Les grandes étapes de développement** — liste ordonnée des blocs de travail

Tu attends ma validation explicite avant de commencer à coder. Si j'ai des corrections, tu mets à jour le plan et le resoumet.

## Phase de développement (après validation du plan)

- Tu travailles de manière **autonome** : tu écris, modifies et organises les fichiers sans me demander à chaque étape
- Tu me signales uniquement si tu rencontres une **ambiguïté bloquante** ou une **décision d'architecture non anticipée**
- Tu me fais un **récapitulatif en fin de session** : ce qui est fait, ce qui reste, les points d'attention

---

# Contraintes techniques

## Docker & déploiement

- Chaque app doit avoir son propre `docker-compose.yml` à la racine du projet
- Les images doivent être **légères** : favorise les variantes `alpine` ou `slim`
- Les variables sensibles (mots de passe, secrets, clés API) passent par un fichier **`.env`** (jamais hardcodées), avec un `.env.example` documenté fourni
- Les données persistantes sont montées dans un **volume Docker nommé**
- Le `docker-compose.yml` suit **exactement ce template** (remplace `NOM`, `IMAGE` et `XXXX`) :
  ```yaml
  #####################
  #       NOM         #
  #####################
  NOM:
    image: IMAGE
    container_name: NOM
    restart: unless-stopped
    networks:
      - net_NOM
    environment:
      - "TZ=Europe/Paris"
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=net_NOM"
      - "traefik.http.routers.NOM.rule=Host(`NOM.domaine.fr`)"
      - "traefik.http.routers.NOM.entrypoints=websecure"
      - "traefik.http.routers.NOM.tls=true"
      - "traefik.http.routers.NOM.tls.options=tls13only@file"
      - "traefik.http.routers.NOM.tls.certresolver=ovhresolver"
      - "traefik.http.routers.NOM.middlewares=chain-secure@file"
      - "traefik.http.services.NOM.loadbalancer.server.port=XXXX"
    volumes:
      - ./NOM/data:/usr/src/app/data

  networks:
    net_NOM:
      driver: bridge
  ```
- Chaque service a son **réseau dédié** (`net_NOM`) — pas de réseau partagé entre conteneurs sauf besoin explicite
- La variable `TZ=Europe/Paris` est toujours présente
- Le chemin du volume suit la convention `./NOM/data:/chemin/dans/conteneur`

## Choix de la stack

- Tu choisis la stack **la plus adaptée à l'app**, sans te forcer à réutiliser une stack précédente
- Par défaut, si aucune contrainte particulière, **SQLite** est le choix de stockage préféré (simplicité, pas de service supplémentaire)
- Tu justifies tout écart par rapport à SQLite (ex : besoin de concurrence élevée → PostgreSQL)

## Qualité du code

- Le code doit être **lisible et commenté** sur les parties non triviales
- Pas de sur-ingénierie : l'app est pour un usage personnel, la simplicité prime
- Un fichier **`README.md`** est toujours fourni avec : description, prérequis, instructions de lancement, variables d'environnement

---

# Ce que tu ne dois pas faire

- Ne pas commencer à coder sans validation du plan
- Ne pas créer de fichiers de configuration Traefik globaux (j'ai déjà mon stack Traefik en place)
- Ne pas exposer de ports directement sur l'hôte si ce n'est pas nécessaire (Traefik gère le routage)
- Ne pas utiliser de secrets ou credentials en dur dans le code ou les fichiers Docker


---

# Projet : loan-calc

## Description

Simulateur de prêt immobilier — usage personnel — **v2.4.2**

5 onglets : **Simulateur** · **Capacité** · **Projet** · **Comparer** · **Historique**

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | Vue 3 (Composition API) + Vite + Tailwind CSS + Chart.js |
| Backend | Node.js 22 + Express 4 + SQLite (better-sqlite3) |
| Build | Docker multi-stage (`node:22-alpine`) |
| Dev | Vite sur `:5173` proxy `/api/*` et `/auth/*` → Express sur `:3000` |

## Fichiers clés

```
backend/
  index.js                          — serveur Express (API + static + auth guard)
  auth.js                           — middleware OIDC
  db.js                             — init SQLite
  routes/simulations.js             — CRUD simulations

frontend/src/
  services/loanCalculator.js        — toutes les formules financières
  services/storageService.js        — appels API REST
  components/                       — un composant Vue par onglet + utilitaires
    PropertyPrice.vue               — calcul prix max du bien (sous Capacité)
    InfoTooltip.vue                 — tooltips sur les champs calculés
```

## Règles métier à ne pas casser

- Les **frais de notaire** ne peuvent **pas** être financés par le crédit → doivent venir de l'apport
- Les **frais d'agence** peuvent être financés par le crédit (prix FAI = prix net vendeur + agence)
- **Prix max du bien** = `min(C1, C2)` avec :
  - `C1 (budget)` = `(borrowingCapacity + apport) / (1 + notaryRate [+ agencyRate%])`
  - `C2 (apport)` = `apport / notaryRate`
- Taux notaire : **ancien = 8 %**, **neuf = 3 %**

## Branches Git

- `main` — version stable (v2.4.2)

## Authentification OIDC

- `backend/auth.js` — openid-client v5, Authorization Code + PKCE, discovery automatique
- Session en mémoire (express-session), cookie httpOnly/secure, durée 8h
- Fallback `userinfo` → ID token claims (compatibilité Pocket ID)
- `app.set('trust proxy', 1)` obligatoire (Traefik termine TLS, Express reçoit HTTP)
- Provider supportés : **Authentik** (`OIDC_ISSUER` = `.../application/o/loan-calc/`) ou **Pocket ID** (`OIDC_ISSUER` = racine du domaine)

## Variables d'environnement

```dotenv
DATABASE_PATH=/usr/src/app/data/loan-calc.db
API_PORT=3000

OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=
SESSION_SECRET=        # openssl rand -hex 32
```

---

# Workflow versioning et release

## Convention SemVer

Format : `vMAJEUR.MINEUR.PATCH`

| Type de changement | Incrément | Exemples |
|-------------------|-----------|---------|
| Bug fix, ajustement UI, nouvelle feature dans onglet existant | PATCH (Z+1) | tooltip, toggle, champ, style |
| Nouvel onglet, refonte complète d'une section | MINOR (Y+1) | 6e onglet, refonte Capacité |
| Refonte majeure de l'app / migration stack | MAJOR (X+1) | Vue 2→3, réécriture backend |

## Fichiers à mettre à jour lors d'un bump de version

1. **`frontend/src/App.vue`** — version affichée dans le footer de l'UI
2. **`CLAUDE.md`** — version dans la description du projet (ligne "Simulateur de prêt immobilier...") et dans les branches Git (ligne "`main` — version stable")

Les `package.json` (backend `2.0.0`, frontend `1.0.0`) ne sont **pas** synchronisés avec la version produit → ne pas les modifier.

## Fin de chaque session de développement

Une fois le code écrit, Claude :
1. Propose le numéro de version selon la convention ci-dessus
2. Met à jour `frontend/src/App.vue` (footer) et `CLAUDE.md` (version)
3. Inclut le bump dans le commit de la fonctionnalité (pas de commit séparé)
4. Format de commit : `feat: vX.Y.Z — <description>` ou `fix: vX.Y.Z — <description>`

## Push GitHub

Une fois que l'utilisateur confirme que le code est fonctionnel, Claude pousse sur `main` **sans demander de confirmation supplémentaire**.
