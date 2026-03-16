import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const DB_PATH = process.env.DATABASE_PATH || './data/loan-calc.db'

// Crée le répertoire de données si nécessaire
mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

// Active le WAL pour de meilleures performances en lecture
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS simulations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('loan', 'capacity')),
    params     TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export default db
