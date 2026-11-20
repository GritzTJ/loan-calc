import { Router } from 'express'
import db, { SIMULATION_TYPES } from '../db.js'

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

// Validation commune à la création et à la modification. Renvoie le message d'erreur, ou null.
function nameError(name) {
  return typeof name !== 'string' || !name.trim() || name.length > MAX_NAME_LENGTH
    ? `name doit être un texte de 1 à ${MAX_NAME_LENGTH} caractères`
    : null
}
function paramsError(params) {
  return params === null || typeof params !== 'object' || Array.isArray(params)
    ? 'params doit être un objet'
    : null
}

function findSimulation(id) {
  const row = db.prepare(`SELECT ${COLUMNS} FROM simulations WHERE id = ?`).get(id)
  return row && { ...row, params: JSON.parse(row.params) }
}

// POST /api/simulations — crée une simulation
router.post('/', (req, res) => {
  const { name, type, params } = req.body

  if (!SIMULATION_TYPES.includes(type)) {
    return res.status(400).json({ error: `type doit être l'un de : ${SIMULATION_TYPES.join(', ')}` })
  }
  const error = nameError(name) || paramsError(params)
  if (error) return res.status(400).json({ error })

  const result = db.prepare(
    'INSERT INTO simulations (name, type, params) VALUES (?, ?, ?)'
  ).run(name.trim(), type, JSON.stringify(params))

  res.status(201).json(findSimulation(result.lastInsertRowid))
})

// PATCH /api/simulations/:id — renomme une simulation et/ou remplace ses paramètres.
// Le type ne change pas : il désigne l'onglet qui sait relire les paramètres.
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const { name, params } = req.body

  if (name === undefined && params === undefined) {
    return res.status(400).json({ error: 'name ou params attendu' })
  }
  const error = (name !== undefined && nameError(name)) || (params !== undefined && paramsError(params))
  if (error) return res.status(400).json({ error })

  // COALESCE : un champ non transmis (NULL) garde sa valeur
  const result = Number.isInteger(id)
    ? db.prepare('UPDATE simulations SET name = COALESCE(?, name), params = COALESCE(?, params) WHERE id = ?')
      .run(name === undefined ? null : name.trim(), params === undefined ? null : JSON.stringify(params), id)
    : { changes: 0 }

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Simulation introuvable' })
  }
  res.json(findSimulation(id))
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
