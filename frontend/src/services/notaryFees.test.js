import { describe, it, expect } from 'vitest'
import { calculateNotaryFees } from './notaryFees.js'

describe('calculateNotaryFees', () => {
  // Valeurs de référence : simulateur de frais de notaire de service-public (novembre 2026)
  it('retrouve le simulateur officiel pour 250 000 € dans l\'ancien', () => {
    const majore = calculateNotaryFees(250000, 'ancien', 'majore')
    expect(Math.round(majore.emoluments)).toBe(2874)
    expect(majore.csi).toBe(250)
    expect(Math.abs(majore.total - 20124)).toBeLessThan(10)

    const normal = calculateNotaryFees(250000, 'ancien', 'normal')
    expect(Math.abs(normal.total - 18849)).toBeLessThan(15)
  })

  it('retrouve le simulateur officiel pour 400 000 € dans le neuf', () => {
    const neuf = calculateNotaryFees(400000, 'neuf')
    expect(Math.round(neuf.emoluments)).toBe(4312)
    // Le simulateur arrondit la taxe à 0,71 % ; le taux exact est 0,715 %
    expect(Math.abs(neuf.total - 8752)).toBeLessThan(25)
  })

  it('détaille les émoluments par tranches', () => {
    // 6 500 × 3,870 % = 251,55 € HT, soit 301,86 € TTC
    expect(calculateNotaryFees(6500, 'ancien').emoluments).toBe(301.86)
    // + 10 500 × 1,596 % = 167,58 € HT
    expect(calculateNotaryFees(17000, 'ancien').emoluments).toBe(502.96)
  })

  it('ignore le taux de mutation dans le neuf', () => {
    expect(calculateNotaryFees(300000, 'neuf', 'majore').total).toBe(calculateNotaryFees(300000, 'neuf', 'reduit').total)
  })

  it('croît avec le prix et vaut 0 sans prix', () => {
    expect(calculateNotaryFees(0, 'ancien').total).toBe(0)
    expect(calculateNotaryFees(null, 'ancien').total).toBe(0)
    let previous = 0
    for (const price of [1, 5000, 6500, 17000, 60000, 150000, 400000, 1500000]) {
      const { total } = calculateNotaryFees(price, 'ancien')
      expect(total).toBeGreaterThan(previous)
      previous = total
    }
  })

  it('reste autour de 8 % dans l\'ancien et de 2 à 3 % dans le neuf', () => {
    expect(calculateNotaryFees(250000, 'ancien').effectiveRate).toBeCloseTo(8.05, 1)
    expect(calculateNotaryFees(250000, 'neuf').effectiveRate).toBeGreaterThan(2)
    expect(calculateNotaryFees(250000, 'neuf').effectiveRate).toBeLessThan(3)
  })
})
