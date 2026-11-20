import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const DB_PATH = process.env.DATABASE_PATH || './data/loan-calc.db'

// Crée le répertoire de données si nécessaire
mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

// Active le WAL pour de meilleures performances en lecture
db.pragma('journal_mode = WAL')

// Types de simulation : un par onglet enregistrable (Simulateur, Capacité, Projet)
export const SIMULATION_TYPES = ['loan', 'capacity', 'project']
const typeList = SIMULATION_TYPES.map(t => `'${t}'`).join(', ')

const createSimulations = (table) => `
  CREATE TABLE ${table} (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN (${typeList})),
    params     TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`

// Migration du schéma. SQLite ne sait pas modifier une contrainte CHECK : quand la table existante
// n'accepte pas tous les types actuels (base créée avant l'enregistrement des projets, v2.6.3),
// on la reconstruit — nouvelle table, copie des lignes (ids et dates conservés), remplacement.
// Dans une transaction : en cas d'échec, la base reste telle qu'elle était.
db.transaction(() => {
  const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'simulations'").get()
  if (!existing) {
    db.exec(createSimulations('simulations'))
  } else if (!SIMULATION_TYPES.every(t => existing.sql.includes(`'${t}'`))) {
    db.exec(createSimulations('simulations_new'))
    db.exec('INSERT INTO simulations_new (id, name, type, params, created_at) SELECT id, name, type, params, created_at FROM simulations')
    db.exec('DROP TABLE simulations')
    db.exec('ALTER TABLE simulations_new RENAME TO simulations')
    console.log('[db] table simulations migrée (nouveaux types de simulation)')
  }
})()

export default db
