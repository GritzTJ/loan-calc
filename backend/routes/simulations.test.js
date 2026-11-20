import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'

// Base en mémoire : doit être définie avant l'import de db.js
process.env.DATABASE_PATH = ':memory:'
const { default: router } = await import('./simulations.js')

let server
let baseUrl

before(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/simulations', router)
  await new Promise(resolve => { server = app.listen(0, resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}/api/simulations`
})

after(() => server.close())

function post(body) {
  return fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const loanParams = { principal: 200000, annualRate: 3.5, months: 240 }

test('POST crée une simulation et renvoie une date ISO en UTC', async () => {
  const res = await post({ name: 'Appart Lyon', type: 'loan', params: loanParams })
  assert.equal(res.status, 201)
  const sim = await res.json()
  assert.equal(sim.name, 'Appart Lyon')
  assert.deepEqual(sim.params, loanParams)
  assert.match(sim.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
})

test('POST refuse un nom qui n\'est pas une chaîne', async () => {
  const res = await post({ name: { a: 1 }, type: 'loan', params: loanParams })
  assert.equal(res.status, 400)
})

test('POST refuse un nom vide ou trop long', async () => {
  assert.equal((await post({ name: '   ', type: 'loan', params: loanParams })).status, 400)
  assert.equal((await post({ name: 'x'.repeat(101), type: 'loan', params: loanParams })).status, 400)
})

test('POST refuse des params qui ne sont pas un objet', async () => {
  assert.equal((await post({ name: 'A', type: 'loan', params: 'texte' })).status, 400)
  assert.equal((await post({ name: 'A', type: 'loan', params: [1, 2] })).status, 400)
})

test('POST refuse un type inconnu', async () => {
  assert.equal((await post({ name: 'A', type: 'autre', params: loanParams })).status, 400)
})

test('GET liste la plus récente en premier, même créées dans la même seconde', async () => {
  await post({ name: 'première', type: 'loan', params: loanParams })
  await post({ name: 'seconde', type: 'loan', params: loanParams })
  const list = await (await fetch(baseUrl)).json()
  assert.equal(list[0].name, 'seconde')
  assert.equal(list[1].name, 'première')
  assert.match(list[0].created_at, /Z$/)
})

test('DELETE supprime puis répond 404', async () => {
  const sim = await (await post({ name: 'à supprimer', type: 'capacity', params: { months: 240 } })).json()
  assert.equal((await fetch(`${baseUrl}/${sim.id}`, { method: 'DELETE' })).status, 204)
  assert.equal((await fetch(`${baseUrl}/${sim.id}`, { method: 'DELETE' })).status, 404)
})

test('GET ignore une ligne dont les params sont illisibles au lieu d\'échouer', async () => {
  const { default: db } = await import('../db.js')
  db.prepare('INSERT INTO simulations (name, type, params) VALUES (?, ?, ?)').run('corrompue', 'loan', '{pas du json')
  await post({ name: 'saine', type: 'loan', params: loanParams })

  const res = await fetch(baseUrl)
  assert.equal(res.status, 200)
  const names = (await res.json()).map(sim => sim.name)
  assert.ok(names.includes('saine'))
  assert.ok(!names.includes('corrompue'))
})

function patch(id, body) {
  return fetch(`${baseUrl}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

test('POST accepte une simulation de type project', async () => {
  const res = await post({ name: 'Maison', type: 'project', params: { propertyPrice: 300000 } })
  assert.equal(res.status, 201)
  assert.equal((await res.json()).type, 'project')
})

test('PATCH renomme sans toucher aux params', async () => {
  const sim = await (await post({ name: 'avant', type: 'loan', params: loanParams })).json()
  const res = await patch(sim.id, { name: '  après  ' })
  assert.equal(res.status, 200)
  const updated = await res.json()
  assert.equal(updated.name, 'après')
  assert.deepEqual(updated.params, loanParams)
  assert.equal(updated.created_at, sim.created_at)
})

test('PATCH remplace les params sans toucher au nom', async () => {
  const sim = await (await post({ name: 'stable', type: 'loan', params: loanParams })).json()
  const updated = await (await patch(sim.id, { params: { principal: 1 } })).json()
  assert.equal(updated.name, 'stable')
  assert.deepEqual(updated.params, { principal: 1 })
})

test('PATCH refuse un corps vide ou invalide, et répond 404 sur un id inconnu', async () => {
  const sim = await (await post({ name: 'x', type: 'loan', params: loanParams })).json()
  assert.equal((await patch(sim.id, {})).status, 400)
  assert.equal((await patch(sim.id, { name: '' })).status, 400)
  assert.equal((await patch(sim.id, { params: [1] })).status, 400)
  assert.equal((await patch(999999, { name: 'y' })).status, 404)
  assert.equal((await patch('abc', { name: 'y' })).status, 404)
})
