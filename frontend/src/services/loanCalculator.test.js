import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyPayment,
  generateAmortizationTable,
  calculateMaxMonthlyPayment,
  calculateBorrowingCapacity,
  calculateMaxPropertyPrice,
  calculateLoanAmount,
  calculateInsuranceCost,
  formatDuration,
  formatPercent
} from './loanCalculator.js'

describe('calculateMonthlyPayment', () => {
  it('calcule la mensualité d\'un prêt à taux fixe', () => {
    expect(calculateMonthlyPayment(200000, 3.5, 240)).toBe(1159.92)
  })

  it('gère le taux zéro', () => {
    expect(calculateMonthlyPayment(200000, 0, 240)).toBe(833.33)
  })

  it('renvoie 0 pour un montant ou une durée invalides', () => {
    expect(calculateMonthlyPayment(0, 3.5, 240)).toBe(0)
    expect(calculateMonthlyPayment(200000, 3.5, 0)).toBe(0)
  })
})

describe('generateAmortizationTable', () => {
  const table = generateAmortizationTable(200000, 3.5, 240, new Date(2026, 9, 2))

  it('produit une ligne par mensualité et solde le capital', () => {
    expect(table).toHaveLength(240)
    expect(table.at(-1).remainingPrincipal).toBe(0)
    const repaid = table.reduce((sum, r) => sum + r.principalPart, 0)
    expect(repaid).toBeCloseTo(200000, 2)
  })

  it('place la 1re mensualité le 1er du mois suivant la date de début', () => {
    expect(table[0].date).toEqual(new Date(2026, 10, 1))
    expect(table[1].date).toEqual(new Date(2026, 11, 1))
  })

  it('décompose chaque mensualité en capital + intérêts', () => {
    for (const row of table) {
      expect(row.principalPart + row.interestPart).toBeCloseTo(row.payment, 2)
    }
  })
})

describe('calculateMaxMonthlyPayment', () => {
  it('applique le taux d\'endettement puis retire les charges', () => {
    expect(calculateMaxMonthlyPayment(4000, 500, 35)).toBe(900)
  })

  it('ne descend jamais sous zéro', () => {
    expect(calculateMaxMonthlyPayment(1000, 2000, 35)).toBe(0)
  })
})

describe('calculateBorrowingCapacity', () => {
  it('est l\'inverse de la mensualité', () => {
    const capacity = calculateBorrowingCapacity(1159.92, 3.5, 240)
    expect(calculateMonthlyPayment(capacity, 3.5, 240)).toBeCloseTo(1159.92, 2)
  })

  it('gère le taux zéro', () => {
    expect(calculateBorrowingCapacity(1000, 0, 240)).toBe(240000)
  })

  // L'assurance porte sur le capital réellement emprunté : crédit + assurance
  // doivent consommer tout le budget mensuel, pas seulement une partie.
  it('intègre l\'assurance dans le budget mensuel', () => {
    const capacity = calculateBorrowingCapacity(1400, 3.5, 240, 0.30)
    expect(capacity).toBe(231420.37)
    const total = calculateMonthlyPayment(capacity, 3.5, 240) + calculateInsuranceCost(capacity, 0.30)
    expect(total).toBeCloseTo(1400, 1)
  })

  it('intègre l\'assurance à taux zéro', () => {
    const capacity = calculateBorrowingCapacity(1000, 0, 240, 0.30)
    const total = calculateMonthlyPayment(capacity, 0, 240) + calculateInsuranceCost(capacity, 0.30)
    expect(total).toBeCloseTo(1000, 1)
  })
})

describe('calculateMaxPropertyPrice', () => {
  it('retient min(C1, C2)', () => {
    // Apport confortable : c'est le budget (C1) qui limite
    const byBudget = calculateMaxPropertyPrice(200000, 50000, 'ancien')
    expect(byBudget.c1).toBe(231481.48)
    expect(byBudget.maxPrice).toBe(byBudget.c1)
    expect(byBudget.isApportConstrained).toBe(false)

    // Apport faible : c'est l'apport (C2 = apport / taux notaire) qui limite
    const byApport = calculateMaxPropertyPrice(200000, 8000, 'ancien')
    expect(byApport.c2).toBe(100000)
    expect(byApport.maxPrice).toBe(100000)
    expect(byApport.isApportConstrained).toBe(true)
  })

  it('applique 8 % de notaire dans l\'ancien et 3 % dans le neuf', () => {
    expect(calculateMaxPropertyPrice(200000, 50000, 'ancien').notaryFees).toBeCloseTo(231481.48 * 0.08, 2)
    const neuf = calculateMaxPropertyPrice(200000, 50000, 'neuf')
    expect(neuf.maxPrice).toBe(242718.45)
    expect(neuf.notaryFees).toBeCloseTo(242718.45 * 0.03, 2)
  })

  it('inclut les frais d\'agence en % dans C1', () => {
    const r = calculateMaxPropertyPrice(200000, 50000, 'ancien', 5, '%')
    expect(r.c1).toBe(221238.94) // 250 000 / (1 + 0,08 + 0,05)
    expect(r.agencyFees).toBeCloseTo(221238.94 * 0.05, 2)
  })

  it('retire les frais d\'agence fixes du budget', () => {
    const r = calculateMaxPropertyPrice(200000, 50000, 'ancien', 10000, '€')
    expect(r.c1).toBe(222222.22) // (250 000 − 10 000) / 1,08
  })

  // L'apport qui permet d'utiliser toute la capacité est un seuil fixe :
  // il ne doit pas dépendre de l'apport déjà saisi.
  it('annonce un apport nécessaire stable, quel que soit l\'apport saisi', () => {
    expect(calculateMaxPropertyPrice(200000, 0, 'ancien').minApportNeeded).toBe(16000)
    expect(calculateMaxPropertyPrice(200000, 14814.82, 'ancien').minApportNeeded).toBe(16000)
    expect(calculateMaxPropertyPrice(200000, 16000, 'ancien').isApportConstrained).toBe(false)
  })

  // Quand l'apport limite le prix, le prêt ne finance que le prix FAI : le reste de la capacité est inutilisé
  it('indique le prêt réellement utilisé et la capacité restante', () => {
    const byBudget = calculateMaxPropertyPrice(200000, 50000, 'ancien')
    expect(byBudget.loanUsed).toBe(200000)
    expect(byBudget.unusedCapacity).toBe(0)

    const byApport = calculateMaxPropertyPrice(200000, 8000, 'ancien')
    expect(byApport.loanUsed).toBe(100000)
    expect(byApport.unusedCapacity).toBe(100000)

    const withAgency = calculateMaxPropertyPrice(200000, 8000, 'ancien', 5, '%')
    expect(withAgency.loanUsed).toBe(105000) // prix 100 000 + agence 5 000
    expect(withAgency.unusedCapacity).toBe(95000)
  })

  it('tient compte des frais d\'agence dans l\'apport nécessaire', () => {
    expect(calculateMaxPropertyPrice(200000, 0, 'ancien', 10000, '€').minApportNeeded).toBe(15200)
    expect(calculateMaxPropertyPrice(200000, 0, 'ancien', 5, '%').minApportNeeded).toBe(15238.1)
  })
})

describe('calculateLoanAmount', () => {
  it('finance les frais d\'agence mais pas les frais de notaire', () => {
    const r = calculateLoanAmount(300000, 'ancien', 15000, '€', 24000)
    expect(r.notaryFees).toBe(24000)
    expect(r.loanAmount).toBe(315000) // prix FAI
    expect(r.fundingGap).toBe(0)
  })

  it('signale l\'apport manquant pour les frais de notaire', () => {
    const r = calculateLoanAmount(300000, 'ancien', 0, '€', 20000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(4000)
  })

  it('traite les frais de dossier comme non finançables', () => {
    const r = calculateLoanAmount(300000, 'ancien', 0, '€', 24500, 1000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(500)
  })

  it('réduit le prêt quand l\'apport dépasse les frais', () => {
    const r = calculateLoanAmount(300000, 'ancien', 0, '€', 74000)
    expect(r.loanAmount).toBe(250000)
    expect(r.fundingGap).toBe(0)
  })
})

describe('formatDuration', () => {
  it('exprime une durée en années et mois', () => {
    expect(formatDuration(6)).toBe('6 mois')
    expect(formatDuration(12)).toBe('1 an')
    expect(formatDuration(240)).toBe('20 ans')
    expect(formatDuration(246)).toBe('20 ans et 6 mois')
  })
})

describe('formatPercent', () => {
  it('utilise la virgule décimale française', () => {
    expect(formatPercent(3.5)).toMatch(/^3,5\s%$/)
    expect(formatPercent(35)).toMatch(/^35\s%$/)
  })
})
