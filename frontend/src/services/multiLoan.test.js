import { describe, it, expect } from 'vitest'
import { buildLoanPlan, calculateSmoothedPayment, combineTables, paymentSteps, isUsableLoan } from './multiLoan.js'
import { generateAmortizationTable, calculateMonthlyPayment } from './loanCalculator.js'

const start = new Date(2026, 9, 2)
const main = { principal: 180000, annualRate: 3.5, months: 300 }
const ptz = { label: 'PTZ', principal: 60000, annualRate: 0, months: 180 }
const sum = (table, key) => Math.round(table.reduce((total, r) => total + r[key], 0) * 100) / 100

describe('buildLoanPlan sans lissage', () => {
  const plan = buildLoanPlan({ main, extraLoans: [ptz], startDate: start })

  it('calcule chaque prêt séparément', () => {
    expect(plan.loans).toHaveLength(2)
    expect(plan.loans[0].table).toEqual(generateAmortizationTable(180000, 3.5, 300, start))
    expect(plan.loans[1].table[0].payment).toBe(333.33)
    expect(plan.smoothed).toBe(false)
  })

  it('additionne les prêts mois par mois', () => {
    expect(plan.combined).toHaveLength(300)
    const mainPayment = calculateMonthlyPayment(180000, 3.5, 300)
    expect(plan.combined[0].payment).toBe(Math.round((mainPayment + 333.33) * 100) / 100)
    // Une fois le PTZ terminé, il ne reste que le prêt principal
    expect(plan.combined[200].payment).toBe(mainPayment)
    expect(sum(plan.combined, 'principalPart')).toBe(240000)
    expect(plan.combined[0].remainingPrincipal).toBe(
      Math.round((plan.loans[0].table[0].remainingPrincipal + plan.loans[1].table[0].remainingPrincipal) * 100) / 100
    )
  })

  it('décrit les paliers de mensualité', () => {
    const steps = paymentSteps(plan.combined)
    expect(steps).toHaveLength(2)
    expect(steps[0].months).toBe(180)
    expect(steps[1].fromNumber).toBe(181)
    expect(steps[1].months).toBe(120)
  })

  it('ignore un prêt complémentaire incomplet', () => {
    expect(isUsableLoan({ principal: 1000, annualRate: 0, months: 12 })).toBe(true)
    expect(isUsableLoan({ principal: null, annualRate: 0, months: 12 })).toBe(false)
    expect(isUsableLoan({ principal: 1000, annualRate: null, months: 12 })).toBe(false)
    const alone = buildLoanPlan({ main, extraLoans: [{ principal: null, annualRate: 1, months: 120 }], startDate: start })
    expect(alone.loans).toHaveLength(1)
    expect(alone.combined).toEqual(combineTables([generateAmortizationTable(180000, 3.5, 300, start)]))
  })
})

describe('lissage', () => {
  const plan = buildLoanPlan({ main, extraLoans: [ptz], smoothing: true, startDate: start })

  it('garde un total mensuel constant au centime', () => {
    expect(plan.smoothed).toBe(true)
    // Toutes les échéances sauf la dernière (qui absorbe les arrondis)
    const payments = plan.combined.slice(0, -1).map(r => r.payment)
    expect(Math.max(...payments) - Math.min(...payments)).toBeLessThanOrEqual(0.011)
    expect(Math.abs(plan.combined.at(-1).payment - plan.smoothedPayment)).toBeLessThan(5)
    expect(paymentSteps(plan.combined)).toHaveLength(1)
  })

  it('solde chaque prêt à son terme', () => {
    expect(plan.loans[0].table).toHaveLength(300)
    expect(plan.loans[0].table.at(-1).remainingPrincipal).toBe(0)
    expect(plan.loans[1].table).toHaveLength(180)
    expect(sum(plan.loans[0].table, 'principalPart')).toBe(180000)
    expect(sum(plan.combined, 'principalPart')).toBe(240000)
  })

  it('le total lissé se situe entre le palier haut et le palier bas du plan non lissé', () => {
    const mainPayment = calculateMonthlyPayment(180000, 3.5, 300)
    expect(plan.smoothedPayment).toBeLessThan(mainPayment + 333.33)
    expect(plan.smoothedPayment).toBeGreaterThan(mainPayment)
  })

  it('coûte plus d\'intérêts que sans lissage (le prêt principal s\'amortit plus tard)', () => {
    const unsmoothed = buildLoanPlan({ main, extraLoans: [ptz], startDate: start })
    expect(sum(plan.combined, 'interestPart')).toBeGreaterThan(sum(unsmoothed.combined, 'interestPart'))
  })

  it('sans autre prêt, le total lissé est la mensualité ordinaire', () => {
    expect(calculateSmoothedPayment(main, [])).toBeCloseTo(calculateMonthlyPayment(180000, 3.5, 300), 1)
  })

  it('n\'est pas appliqué si un prêt complémentaire dure plus longtemps que le prêt principal', () => {
    const longer = buildLoanPlan({ main: { ...main, months: 120 }, extraLoans: [ptz], smoothing: true, startDate: start })
    expect(longer.smoothed).toBe(false)
    expect(longer.combined).toHaveLength(180)
  })

  it('applique l\'assurance à chaque prêt', () => {
    const insured = buildLoanPlan({ main, extraLoans: [ptz], startDate: start, insurance: { insuranceRate: 0.3 } })
    expect(insured.combined[0].insurancePart).toBe(60) // 240 000 € × 0,30 % / 12
  })
})
