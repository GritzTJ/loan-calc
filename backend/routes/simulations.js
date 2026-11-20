import { Router } from 'express'
import db from '../db.js'

const router = Router()

const MAX_NAME_LENGTH = 100

// SQLite stocke created_at en UTC sans fuseau ("2026-10-02 22:30:00").
// On l'expose en ISO 8601 avec le suffixe Z pour que le navigateur ne le lise pas en heure locale.
const COLUMNS = `id, name, type, params, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at`

// GET /api/simulations — liste toutes les simulations (ordre antéchronologique)
router.get('/', (req, res) => {
  // id DESC départage les simulations créées dans la même seconde
  const rows = db.prepare(
    `SELECT ${COLUMNS} FROM simulations ORDER BY created_at DESC, id DESC`
  ).all()

  // Désérialise le JSON des params. Une ligne illisible (base modifiée à la main, écriture tronquée)
  // est ignorée et journalisée : elle ne doit pas rendre tout l'historique inaccessible.
  const simulations = []
  for (const row of rows) {
    try {
      simulations.push({ ...row, params: JSON.parse(row.params) })
    } catch {
      console.error(`[simulations] params illisibles pour la simulation ${row.id}, ligne ignorée`)
    }
  }
  res.json(simulations)
})

// POST /api/simulations — crée une simulation
router.post('/', (req, res) => {
  const { name, type, params } = req.body

  if (typeof name !== 'string' || !name.trim() || name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: `name doit être un texte de 1 à ${MAX_NAME_LENGTH} caractères` })
  }
  if (!['loan', 'capacity'].includes(type)) {
    return res.status(400).json({ error: 'type doit être "loan" ou "capacity"' })
  }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return res.status(400).json({ error: 'params doit être un objet' })
  }

  const result = db.prepare(
    'INSERT INTO simulations (name, type, params) VALUES (?, ?, ?)'
  ).run(name.trim(), type, JSON.stringify(params))

  const simulation = db.prepare(`SELECT ${COLUMNS} FROM simulations WHERE id = ?`).get(result.lastInsertRowid)
  res.status(201).json({ ...simulation, params: JSON.parse(simulation.params) })
})

// DELETE /api/simulations/:id — supprime une simulation
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const result = Number.isInteger(id)
    ? db.prepare('DELETE FROM simulations WHERE id = ?').run(id)
    : { changes: 0 }

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Simulation introuvable' })
  }
  res.status(204).send()
})

export default router
