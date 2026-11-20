import { describe, it, expect } from 'vitest'
import { usuryRateFor, isUsuryOutdated, USURY } from './usury.js'

describe('seuil d\'usure', () => {
  it('choisit la catégorie selon la durée', () => {
    expect(usuryRateFor(84)).toBe(USURY.rates[0].rate)
    expect(usuryRateFor(119)).toBe(USURY.rates[0].rate)
    expect(usuryRateFor(120)).toBe(USURY.rates[1].rate)
    expect(usuryRateFor(239)).toBe(USURY.rates[1].rate)
    expect(usuryRateFor(240)).toBe(USURY.rates[2].rate)
    expect(usuryRateFor(600)).toBe(USURY.rates[2].rate)
  })

  it('devient périmé après la fin du trimestre', () => {
    expect(isUsuryOutdated(new Date(USURY.validUntil + 'T12:00:00'))).toBe(false)
    const after = new Date(USURY.validUntil + 'T12:00:00')
    after.setDate(after.getDate() + 1)
    expect(isUsuryOutdated(after)).toBe(true)
  })
})
