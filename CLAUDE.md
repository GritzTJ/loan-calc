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

Simulateur de prêt immobilier — usage personnel — **v2.6.0**

Application installable comme **PWA** sur mobile (icône écran d'accueil, plein écran, splash screen).

5 onglets : **Simulateur** · **Capacité** · **Projet** · **Comparer** · **Historique**

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | Vue 3 (Composition API) + Vite + Tailwind CSS + Chart.js + police Archivo variable auto-hébergée (`@fontsource-variable/archivo`) |
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

frontend/
  public/icons/                     — icônes PWA (svg + png 192/512/maskable/apple)
  src/
    main.js                        — montage Vue + enregistrement du service worker (autoUpdate)
    services/loanCalculator.js     — toutes les formules financières (+ formatage, bornes de saisie)
    services/loanCalculator.test.js — tests Vitest des formules et des règles métier
    services/storageService.js     — appels API REST (lève une `ApiError` en cas d'échec)
    assets/main.css                — jetons de couleur clair/sombre, police, classes `.input-field` `.btn` `.sheet` `.figure` `.notice`
    components/                     — un composant Vue par onglet + utilitaires
      CalculatorLayout.vue         — mise en page commune : titre, bandeau de résultat collant, formulaire, feuille de résultat
      FundingBar.vue               — barre empilée + légende chiffrée (coût du crédit, besoins/ressources)
      PropertyPrice.vue            — résultat « prix du bien accessible » (sous Capacité ; la saisie est dans BorrowingCapacity)
      FormField.vue                — libellé relié à son champ (`for`/`id` via `useId`)
      NumberInput.vue              — saisie numérique formatée, bornée (`min`/`max`), unité dans le champ (`suffix`)
      DurationField.vue            — durée saisie en années ou en mois (le modèle reste en mois)
      SegmentedControl.vue         — groupe de boutons à choix unique
      SaveSimulation.vue           — bouton « Enregistrer » + modale `<dialog>` (erreur affichée, pas d'échec silencieux)
      InfoTooltip.vue              — tooltips sur les champs calculés (survol, tap et clavier)
```

## Interface (depuis v2.6.0)

- **Une seule source de couleurs** : les variables CSS de `main.css`, exposées à Tailwind par `tailwind.config.js` (`bg-surface`, `text-ink-2`, `bg-capital`…). Ne pas réintroduire de `gray-*`/`blue-*` ni de variantes `dark:` : le thème sombre redéfinit les variables
- **La couleur a un sens fixe** : `capital` (vert) = l'argent de la banque (capital, prêt, ce que le prêt peut financer) · `interest` (ocre) = intérêts · `insurance` (bleu) = assurance · `apport` (prune) = l'argent personnel (apport, ce qu'il doit payer) · `danger` = manque/erreur, jamais porté par la couleur seule (texte explicite ; dans une barre, hachures + icône + libellé). Ces 4 teintes sont validées deux à deux pour le daltonisme dans les deux thèmes : les re-valider si on les change
- **Chiffres** : classe `.figure` (Archivo condensé 75 %, graisse 600, tabulaire). Le texte reste en largeur normale. Pas de capitales, pas de `font-mono`
- **Mise en page** (`CalculatorLayout`) : < `lg` une colonne, bandeau de résultat collant **en haut** (visible au-dessus du clavier), barre d'onglets fixe en bas ; ≥ `lg` formulaire à gauche, feuille de résultat collante à droite, onglets dans l'en-tête
- **Champs à 16 px minimum** (`.input-field`) : en dessous, iOS zoome la page au focus
- « Simuler ce prêt » (Capacité, Projet) émet `simulate` → `App.vue` préremplit le Simulateur avec `merge: true` (la saisie non transmise est conservée)

## Tests

- `cd frontend && npm test` — Vitest sur `loanCalculator.js`
- `cd backend && npm test` — `node --test` : routeur simulations (base `:memory:`) et `safeReturnTo`
- Les deux suites tournent dans GitHub Actions (job `test`) avant le build de l'image

## Règles métier à ne pas casser

- Les **frais de notaire** ne peuvent **pas** être financés par le crédit → doivent venir de l'apport
- Les **frais d'agence** peuvent être financés par le crédit (prix FAI = prix net vendeur + agence)
- **Prix max du bien** = `min(C1, C2)` avec :
  - `C1 (budget)` = `(borrowingCapacity + apport) / (1 + notaryRate [+ agencyRate%])`
  - `C2 (apport)` = `apport / notaryRate`
- Taux notaire : **ancien = 8 %**, **neuf = 3 %**
- Les **frais de dossier** ne peuvent **pas** être financés par le crédit → apport, comme le notaire (`fundingGap = notaire + dossier − apport`)
- **Apport pour utiliser toute la capacité** (`minApportNeeded`) = point où C1 = C2 : `notaryRate × (capacité − agence€)` ou `notaryRate × capacité / (1 + agencyRate%)`. Ne pas le calculer comme `notaryRate × C1` (C1 dépend de l'apport)
- **Capacité avec assurance** : le budget mensuel couvre crédit + assurance → `capital = budget / (k + tauxAssurance/1200)`, `k` = mensualité par euro emprunté
- Tous les onglets sont sous `<KeepAlive>` : la saisie est conservée quand on change d'onglet

## Branches Git

- `main` — version stable (v2.6.0)

## PWA

- `vite-plugin-pwa` (stratégie `generateSW`, `registerType: 'autoUpdate'`) génère `sw.js`, `workbox-*.js` et `manifest.webmanifest`
- Icônes dans `frontend/public/icons/` : `favicon.svg` est la source ; les PNG (192/512/512-maskable/apple-touch-icon 180) et les 12 splash screens iOS `splash-WxH.png` sont générés par `frontend/scripts/generate-splash.mjs` (`npm i --no-save sharp` au préalable) et commités
- `theme-color` = fond de l'app (`#f4f6f7` clair, `#141b21` sombre), resynchronisé par `useTheme.js` quand le thème est forcé
- Le service worker précache la coquille (HTML/JS/CSS/icônes, hors splash iOS). `/api/*` et `/auth/*` sont **denylistés** → toujours réseau
- Backend (`backend/index.js`) expose `manifest.webmanifest`, `sw.js`, `workbox-*.js` et `/icons/*` **avant** le guard OIDC (sinon iOS ne peut pas récupérer le SW). `sw.js` est servi en `no-cache`
- Si `/auth/me` renvoie 401 (session expirée alors que la PWA est ouverte hors session), `App.vue` redirige vers `/auth/login`
- Mise à jour silencieuse : la nouvelle version s'applique au prochain reload complet de la PWA (pas de bandeau)
- Raccourcis Android (`shortcuts` dans le manifest) : appui long sur l'icône → onglets directs via `?tab=...`

## Authentification OIDC

- `backend/auth.js` — openid-client v5, Authorization Code + PKCE, discovery automatique
- Sessions **persistées dans SQLite** via `better-sqlite3-session-store` (table `sessions` dans `loan-calc.db`) → survivent au redémarrage du conteneur, GC auto toutes les 15 min
- Cookie httpOnly/secure, durée 8h
- Après login, retour vers `returnTo` **validé par `safeReturnTo`** (chemin interne uniquement, jamais `//hôte`) ; mémorisé seulement pour une navigation HTML
- `session.regenerate()` au callback (nouvel identifiant de session à l'authentification)
- Échec du callback → page d'erreur avec lien « Réessayer » (pas de redirection automatique vers `/auth/login`, qui bouclerait)
- L'image Docker fixe `NODE_ENV=production` (pas de stack trace dans les réponses d'erreur)
- Rate limit 10 req/min/IP sur `/auth/login` et `/auth/callback` (`express-rate-limit`)
- Fallback `userinfo` → ID token claims (compatibilité Pocket ID)
- `app.set('trust proxy', 1)` obligatoire (Traefik termine TLS, Express reçoit HTTP)
- Provider supportés : **Authentik** (`OIDC_ISSUER` = `.../application/o/loan-calc/`) ou **Pocket ID** (`OIDC_ISSUER` = racine du domaine)

## CI/CD

- **GitHub Actions** : `.github/workflows/docker-publish.yml`
- Déclenché au push d'un **tag Git** `v*` (ex: `git tag v2.4.3 && git push origin v2.4.3`)
- Build l'image Docker multi-stage et la publie sur **GHCR** : `ghcr.io/gritztj/loan-calc:<version>` + `:latest`
- Le `docker-compose-exemple.yml` utilise directement l'image GHCR (plus de `build: .`)

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
