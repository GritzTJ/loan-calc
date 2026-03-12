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

