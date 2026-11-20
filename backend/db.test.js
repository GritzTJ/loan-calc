import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'

test('une base antérieure à la v2.6.3 est migrée sans perte et accepte les projets', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'loan-calc-'))
  const path = join(dir, 'old.db')

  // Base au format d'origine : le CHECK ne connaît que loan et capacity
  const old = new Database(path)
  old.exec(`
    CREATE TABLE simulations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('loan', 'capacity')),
      params     TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  old.prepare("INSERT INTO simulations (id, name, type, params, created_at) VALUES (7, 'Appart', 'loan', '{\"principal\":1}', '2026-01-02 03:04:05')").run()
  old.prepare("INSERT INTO simulations (name, type, params) VALUES ('Capa', 'capacity', '{}')").run()
  old.close()

  process.env.DATABASE_PATH = path
  const { default: db } = await import('./db.js')
  try {
    const rows = db.prepare('SELECT id, name, type, params, created_at FROM simulations ORDER BY id').all()
    assert.equal(rows.length, 2)
    assert.deepEqual({ ...rows[0] }, { id: 7, name: 'Appart', type: 'loan', params: '{"principal":1}', created_at: '2026-01-02 03:04:05' })
    assert.equal(rows[1].id, 8)

    // Le nouveau type est accepté, et la numérotation continue après le dernier id
    const result = db.prepare("INSERT INTO simulations (name, type, params) VALUES ('Maison', 'project', '{}')").run()
    assert.equal(result.lastInsertRowid, 9)
    assert.throws(() => db.prepare("INSERT INTO simulations (name, type, params) VALUES ('x', 'autre', '{}')").run())
    assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'simulations_new'").get().n, 0)
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
