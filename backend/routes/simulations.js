import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/simulations — liste toutes les simulations (ordre antéchronologique)
router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, name, type, params, created_at FROM simulations ORDER BY created_at DESC'
  ).all()

  // Désérialise le JSON des params
  const simulations = rows.map(r => ({ ...r, params: JSON.parse(r.params) }))
  res.json(simulations)
})

// POST /api/simulations — crée une simulation
router.post('/', (req, res) => {
  const { name, type, params } = req.body

  if (!name || !type || !params) {
    return res.status(400).json({ error: 'Champs requis : name, type, params' })
  }
  if (!['loan', 'capacity'].includes(type)) {
    return res.status(400).json({ error: 'type doit être "loan" ou "capacity"' })
  }

  const result = db.prepare(
    'INSERT INTO simulations (name, type, params) VALUES (?, ?, ?)'
  ).run(name, type, JSON.stringify(params))

  const simulation = db.prepare('SELECT * FROM simulations WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ ...simulation, params: JSON.parse(simulation.params) })
})

// DELETE /api/simulations/:id — supprime une simulation
router.delete('/:id', (req, res) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM simulations WHERE id = ?').run(id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Simulation introuvable' })
  }
  res.status(204).send()
})

export default router
