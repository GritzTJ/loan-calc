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

Simulateur de prêt immobilier — usage personnel — **v2.7.1**

Application installable comme **PWA** sur mobile (icône écran d'accueil, plein écran, splash screen).

5 onglets : **Simulateur** · **Capacité** · **Projet** · **Comparer** (deux modes : prêts, louer ou acheter) · **Historique**

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | Vue 3 (Composition API) + Vite + Tailwind CSS + Chart.js + SheetJS et jsPDF (exports, chargés au clic) + police Archivo variable auto-hébergée (`@fontsource-variable/archivo`) |
| Backend | Node.js 22 + Express 4 + SQLite (better-sqlite3) |
| Build | Docker multi-stage (`node:22.23.5-alpine`, version épinglée) |
| Dev | Vite sur `:5173` proxy `/api/*` et `/auth/*` → Express sur `:3000` |

## Fichiers clés

```
backend/
  index.js                          — serveur Express (API + static + auth guard)
  auth.js                           — middleware OIDC
  db.js                             — init SQLite + migration du schéma (types de simulation)
  routes/simulations.js             — CRUD simulations (POST, PATCH nom/params, DELETE)

frontend/
  public/icons/                     — icônes PWA (svg + png 192/512/maskable/apple)
  src/
    main.js                        — montage Vue + enregistrement du service worker (autoUpdate)
    services/loanCalculator.js     — toutes les formules financières (+ formatage, bornes de saisie)
    services/loanCalculator.test.js — tests Vitest des formules et des règles métier
    services/notaryFees.js         — frais de notaire au barème
    services/usury.js              — seuils d'usure du trimestre (à mettre à jour chaque trimestre)
    services/multiLoan.js          — prêts complémentaires, lissage, tableau combiné
    services/rentVsBuy.js          — projection louer / acheter
    services/pdfExport.js          — synthèses PDF (jsPDF, chargé au clic)
    services/numberParsing.js      — analyse de la saisie numérique (« 200.000 », « 1.234,56 »…), testée à part
    services/storageService.js     — appels API REST (lève une `ApiError` en cas d'échec)
    composables/usePersistedState.js — saisie d'un onglet conservée dans `localStorage` (+ `reset`)
    composables/useSavedSimulation.js — lien onglet ↔ simulation de l'historique (enregistrer / mettre à jour)
    assets/main.css                — jetons de couleur clair/sombre, police, classes `.input-field` `.btn` `.sheet` `.figure` `.notice`
    components/                     — un composant Vue par onglet + utilitaires
      CalculatorLayout.vue         — mise en page commune : titre, bandeau de résultat collant, formulaire, feuille de résultat
      FundingBar.vue               — barre empilée + légende chiffrée (coût du crédit, besoins/ressources)
      PropertyPrice.vue            — résultat « prix du bien accessible » (sous Capacité ; la saisie est dans BorrowingCapacity)
      FormField.vue                — libellé relié à son champ (`for`/`id` via `useId`)
      NumberInput.vue              — saisie numérique formatée, bornée (`min`/`max`), unité dans le champ (`suffix`)
      DurationField.vue            — durée saisie en années ou en mois (le modèle reste en mois)
      InsuranceField.vue           — taux d'assurance + base de calcul (capital initial / restant dû) + quotité
      NotaryRateField.vue          — type de bien + droits de mutation
      CollapsibleSection.vue       — section de formulaire repliable (`<details>`), pour les réglages secondaires
      EarlyRepayment.vue, ExtraLoans.vue — sections du Simulateur (remboursement anticipé, modulation, prêts complémentaires)
      CompareTab.vue               — onglet Comparer : bascule entre LoanComparison (2 à 4 prêts) et RentVsBuy
      PdfButton.vue                — bouton d'export PDF (Simulateur, Projet)
      AmortizationTable.vue        — tableau par année, chaque année dépliable en mensualités
      SegmentedControl.vue         — groupe de boutons à choix unique
      SaveSimulation.vue           — bouton « Enregistrer » + modale `<dialog>` ; propose « Mettre à jour » si la saisie vient de l'historique
      InfoTooltip.vue              — tooltips sur les champs calculés (survol, tap et clavier)
```

## Interface (depuis v2.6.0)

- **Une seule source de couleurs** : les variables CSS de `main.css`, exposées à Tailwind par `tailwind.config.js` (`bg-surface`, `text-ink-2`, `bg-capital`…). Ne pas réintroduire de `gray-*`/`blue-*` ni de variantes `dark:` : le thème sombre redéfinit les variables
- **La couleur a un sens fixe** : `capital` (vert) = l'argent de la banque (capital, prêt, ce que le prêt peut financer) · `interest` (ocre) = intérêts · `insurance` (bleu) = assurance · `apport` (prune) = l'argent personnel (apport, ce qu'il doit payer) · `danger` = manque/erreur, jamais porté par la couleur seule (texte explicite ; dans une barre, hachures + icône + libellé). Ces 4 teintes sont validées deux à deux pour le daltonisme dans les deux thèmes : les re-valider si on les change
- **Chiffres** : classe `.figure` (Archivo condensé 75 %, graisse 600, tabulaire). Le texte reste en largeur normale. Pas de capitales, pas de `font-mono`
- **Mise en page** (`CalculatorLayout`) : < `lg` une colonne, bandeau de résultat collant **en haut** (visible au-dessus du clavier), barre d'onglets fixe en bas ; ≥ `lg` formulaire à gauche, feuille de résultat collante à droite, onglets dans l'en-tête
- **Champs à 16 px minimum** (`.input-field`) : en dessous, iOS zoome la page au focus
- **Montants** : `formatEuros` (à l'euro) pour capital, prix, totaux ; `formatCurrency` (centimes) pour les mensualités et les lignes mensuelles du tableau
- **Saisie conservée** : chaque onglet garde sa saisie dans `localStorage` (`loan-calc:<onglet>`) et démarre sur un exemple ; « Réinitialiser la saisie » y revient. Un nouveau champ d'onglet doit être ajouté aux valeurs de départ passées à `usePersistedState`
- **Onglet courant dans l'URL** (`?tab=`, `pushState`/`popstate` dans `App.vue`)
- « Simuler ce prêt » (Capacité, Projet) émet `simulate` → `App.vue` préremplit le Simulateur avec `merge: true` (la saisie non transmise est conservée)

## Tests

- `cd frontend && npm test` — Vitest sur tous les `services/*.test.js` (calculs de prêt, notaire, usure, prêts multiples, louer/acheter, saisie)
- `cd backend && npm test` — `node --test` : routeur simulations (base `:memory:`), migration du schéma (`db.test.js`) et `safeReturnTo`
- Les deux suites tournent dans GitHub Actions (job `test`) avant le build de l'image

## Règles métier à ne pas casser

- Les **frais de notaire** ne peuvent **pas** être financés par le crédit → doivent venir de l'apport
- Les **frais d'agence** peuvent être financés par le crédit (prix FAI = prix net vendeur + agence)
- **Frais de notaire au barème** (`services/notaryFees.js`, depuis v2.6.5) : droits de mutation (ancien : 6,32 % majoré par défaut, 5,81 % normal, 5,09 % réduit ; neuf : 0,715 %) + émoluments par tranches TTC + contribution de sécurité immobilière + 1 200 € de formalités estimées. Calculés sur le prix net vendeur. Recoupés avec le simulateur de service-public (250 000 € ancien majoré ≈ 20 120 €)
- **Prix max du bien** = `min(C1, C2)`, chaque contrainte étant résolue numériquement (`largestWhere`) car les frais ne sont plus proportionnels au prix, puis arrondie à l'euro inférieur :
  - `C1 (budget)` : `prix + agence + travaux + notaire(prix) ≤ capacité + apport`
  - `C2 (apport)` : `notaire(prix) ≤ apport`
- Les **travaux** sont finançables par le crédit, comme les frais d'agence
- Les **frais de dossier et de garantie** ne peuvent **pas** être financés par le crédit → apport, comme le notaire (`fundingGap = notaire + dossier + garantie − apport`)
- **Apport pour utiliser toute la capacité** (`minApportNeeded`) = frais de notaire du prix où le prêt finance exactement prix FAI + travaux (`fullCapacityPrice`). Ce seuil ne dépend pas de l'apport saisi
- **Capacité avec assurance** : le budget mensuel couvre crédit + assurance → `capital = budget / (k + tauxAssurance/1200)`, `k` = mensualité par euro emprunté
- **Assurance** : deux bases (`insuranceMode`) — `initial` (cotisation fixe sur le capital emprunté, contrat groupe) ou `crd` (sur le capital restant dû, dégressive, délégation). Le premier mois est identique dans les deux modes, donc la capacité d'emprunt ne dépend pas du mode. Absent d'une ancienne simulation = `initial`
- **Tableau d'amortissement** = source de tous les totaux (intérêts, assurance). La part de capital est plafonnée au restant dû et le tableau s'arrête quand le prêt est soldé : il peut compter moins de lignes que la durée saisie
- Honoraires d'agence supposés à la charge de l'acquéreur ; à la charge du vendeur, on saisit le prix affiché sans frais d'agence (dit dans l'aide du champ)
- **TAEG** (`calculateTAEG`) : méthode actuarielle sur les échéances du tableau, frais de dossier et de garantie déduits du capital reçu. **Seuils d'usure** dans `services/usury.js`, **à mettre à jour chaque trimestre** (l'app signale une valeur périmée)
- **Événements du prêt** (6e paramètre de `generateAmortizationTable`) : un remboursement anticipé (`effect` `duration` ou `payment`, indemnités au plafond légal = 6 mois d'intérêts sur le capital remboursé, 3 % du restant dû au plus) et une modulation de mensualité (la durée s'ajuste, bornée à `MAX_LOAN_MONTHS`). L'effet affiché compare au même prêt sans événement
- **Prêts multiples** (`services/multiLoan.js`) : un prêt principal + jusqu'à 3 prêts complémentaires ; `buildLoanPlan` renvoie un tableau par prêt et le tableau `combined` (somme mois par mois), source des totaux du Simulateur. **Lissage** : total mensuel de crédit constant résolu par dichotomie, le prêt principal payant ce total moins les autres mensualités (jamais moins que ses intérêts) ; appliqué seulement si les prêts complémentaires finissent au plus tard avec le principal, et il désactive remboursement anticipé et modulation. L'assurance s'applique à chaque prêt
- **Louer ou acheter** (`compareRentAndBuy`) : même budget mensuel dans les deux cas, le moins dépensier place la différence ; patrimoine acheteur = valeur du bien − restant dû + épargne, patrimoine locataire = apport placé + économies. Non comptés : frais de revente, fiscalité de l'épargne, gros travaux
- **Comparer** : 2 à 4 scénarios, alimentables depuis l'Historique (seul le prêt principal d'une simulation est repris)
- **Quotité d'assurance** : multiplie le taux (`effectiveInsuranceRate`), 100 % par défaut
- Taux plafonnés à 30 % (`MAX_RATE`)
- **Types de simulation** : `loan`, `capacity`, `project` (`SIMULATION_TYPES` dans `backend/db.js`). En ajouter un déclenche la reconstruction de la table au démarrage (SQLite ne modifie pas un `CHECK`)
- Tous les onglets sont sous `<KeepAlive>` : la saisie est conservée quand on change d'onglet

## Branches Git

- `main` — version stable (v2.7.1)

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
- `express.json({ inflate: false })` : les corps compressés sont refusés (415), le parseur tournant avant le guard
- Rate limit 10 req/min/IP sur `/auth/login` et `/auth/callback` (`express-rate-limit`)
- Fallback `userinfo` → ID token claims (compatibilité Pocket ID)
- `app.set('trust proxy', 1)` obligatoire (Traefik termine TLS, Express reçoit HTTP)
- Provider supportés : **Authentik** (`OIDC_ISSUER` = `.../application/o/loan-calc/`) ou **Pocket ID** (`OIDC_ISSUER` = racine du domaine)

## Version de Node

- Épinglée au patch près à **trois endroits à garder alignés** : les deux `FROM` du `Dockerfile` et `node-version` du workflow. Plancher dans `backend/package.json` (`engines`)
- Minimum **22.23.4** (correctif Node2Shell, CVE-2026-111497 — décodeur Brotli de Node). Un correctif de sécurité Node n'arrive en production qu'en relevant ces versions puis en poussant un tag
- `xlsx` vient de la distribution officielle SheetJS (`cdn.sheetjs.com`), pas de npm où la version est figée en 0.18.5 vulnérable
- `html2canvas` et `purify` (modules optionnels de jsPDF, jamais chargés) sont exclus du précache du service worker (`globIgnores`)
- `npm audit` frontend : il reste 4 alertes modérées (`glob`/`minimatch` via `workbox-build`), outillage de build uniquement, sans correctif tant que `vite-plugin-pwa` ne monte pas `workbox-build`

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
