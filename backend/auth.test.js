import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnTo } from './auth.js'

test('safeReturnTo conserve un chemin interne', () => {
  assert.equal(safeReturnTo('/'), '/')
  assert.equal(safeReturnTo('/?tab=history'), '/?tab=history')
})

test('safeReturnTo refuse toute destination externe', () => {
  assert.equal(safeReturnTo('//evil.com'), '/')
  assert.equal(safeReturnTo('/\\evil.com'), '/')
  assert.equal(safeReturnTo('https://evil.com'), '/')
  assert.equal(safeReturnTo('evil.com'), '/')
})

test('safeReturnTo retombe sur la racine sans valeur', () => {
  assert.equal(safeReturnTo(undefined), '/')
  assert.equal(safeReturnTo(''), '/')
})
