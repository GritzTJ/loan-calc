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
  formatPercent,
  sanitizeMonths,
  summarizeByYear,
  calculateTAEG,
  effectiveInsuranceRate,
  formatEuros,
  MAX_LOAN_MONTHS
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

  it('renvoie 0 tant que le taux n\'est pas un nombre (champ vide)', () => {
    expect(calculateMonthlyPayment(200000, null, 240)).toBe(0)
    expect(calculateMonthlyPayment(200000, undefined, 240)).toBe(0)
    expect(generateAmortizationTable(200000, null, 240, new Date(2026, 9, 2))).toEqual([])
  })
})

describe('sanitizeMonths', () => {
  it('conserve une durée valide', () => {
    expect(sanitizeMonths(240)).toBe(240)
  })

  it('borne une durée aberrante et arrondit au mois', () => {
    expect(sanitizeMonths(1e9)).toBe(MAX_LOAN_MONTHS)
    expect(sanitizeMonths(-5)).toBe(0)
    expect(sanitizeMonths(12.4)).toBe(12)
  })

  it('renvoie null pour ce qui n\'est pas un nombre', () => {
    expect(sanitizeMonths(null)).toBe(null)
    expect(sanitizeMonths('240')).toBe(null)
    expect(sanitizeMonths(NaN)).toBe(null)
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

describe('tableau d\'amortissement : cas limites et assurance', () => {
  const start = new Date(2026, 9, 2)

  it('s\'arrête quand le prêt est soldé, sans échéance négative', () => {
    // 1 000 € sur 50 ans : la mensualité arrondie solde le prêt avant la 600e échéance
    const table = generateAmortizationTable(1000, 4.85, 600, start)
    expect(table.length).toBeLessThan(600)
    expect(table.every(r => r.principalPart >= 0 && r.payment > 0)).toBe(true)
    expect(table.at(-1).remainingPrincipal).toBe(0)
    const repaid = table.reduce((sum, r) => sum + r.principalPart, 0)
    expect(Math.round(repaid * 100) / 100).toBe(1000)
  })

  it('assurance sur capital initial : cotisation constante', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, { insuranceRate: 0.3, insuranceMode: 'initial' })
    expect(table[0].insurancePart).toBe(50)
    expect(table.at(-1).insurancePart).toBe(50)
    expect(table[0].totalPayment).toBe(1209.92)
  })

  it('assurance sur capital restant dû : même première cotisation, puis dégressive', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, { insuranceRate: 0.3, insuranceMode: 'crd' })
    expect(table[0].insurancePart).toBe(50)
    expect(table[1].insurancePart).toBeLessThan(50)
    expect(table.at(-1).insurancePart).toBeLessThan(1)
    const total = table.reduce((sum, r) => sum + r.insurancePart, 0)
    expect(total).toBeLessThan(50 * 240)
  })

  it('sans assurance, le total de la ligne est la mensualité de crédit', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start)
    expect(table[0].insurancePart).toBe(0)
    expect(table[0].totalPayment).toBe(table[0].payment)
  })

  it('summarizeByYear regroupe 12 échéances par année', () => {
    const table = generateAmortizationTable(200000, 3.5, 246, start, { insuranceRate: 0.3 })
    const years = summarizeByYear(table)
    expect(years).toHaveLength(21)
    expect(years[0].rows).toHaveLength(12)
    expect(years[20].rows).toHaveLength(6)
    expect(years[0].remainingPrincipal).toBe(table[11].remainingPrincipal)
    expect(years[20].remainingPrincipal).toBe(0)
    const principal = years.reduce((sum, y) => sum + y.principal, 0)
    expect(Math.round(principal * 100) / 100).toBe(200000)
    expect(years[0].insurance).toBe(600)
  })
})

describe('cas limites du plan de financement', () => {
  it('capacité : des frais d\'agence fixes supérieurs au budget ne laissent rien à emprunter', () => {
    const r = calculateMaxPropertyPrice(80000, 5000, 'ancien', 500000, '€')
    expect(r.maxPrice).toBe(0)
    expect(r.loanUsed).toBe(0)
    expect(r.agencyFees).toBe(0)
    expect(r.feesExceedBudget).toBe(true)
  })

  it('capacité : fullCapacityPrice est le prix atteint quand l\'apport vaut minApportNeeded', () => {
    for (const [fees, mode] of [[0, '€'], [9000, '€'], [4, '%']]) {
      const r = calculateMaxPropertyPrice(200000, 0, 'ancien', fees, mode)
      const atThreshold = calculateMaxPropertyPrice(200000, r.minApportNeeded, 'ancien', fees, mode)
      expect(Math.abs(atThreshold.maxPrice - r.fullCapacityPrice)).toBeLessThan(0.5)
    }
  })

  it('projet : un apport supérieur au coût total laisse un excédent', () => {
    const r = calculateLoanAmount(150000, 'ancien', 0, '€', 400000, 0)
    expect(r.loanAmount).toBe(0)
    expect(r.totalCost).toBe(162000)
    expect(r.surplus).toBe(238000)
    expect(r.contributionUsed).toBe(162000)
  })

  it('projet : pas d\'excédent quand l\'apport est entièrement utilisé', () => {
    const r = calculateLoanAmount(300000, 'ancien', 0, '€', 30000, 0)
    expect(r.surplus).toBe(0)
    expect(r.contributionUsed).toBe(30000)
  })
})

describe('formatEuros', () => {
  it('arrondit à l\'euro', () => {
    expect(formatEuros(241396.08).replace(/\s/g, ' ')).toBe('241 396 €')
  })
})

describe('calculateTAEG', () => {
  const start = new Date(2026, 9, 2)
  const paymentsOf = (table) => table.map(r => r.totalPayment)

  it('sans frais ni assurance, vaut le taux nominal capitalisé mensuellement', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start)
    // (1 + 3,5 % / 12)^12 − 1 = 3,557 %
    expect(calculateTAEG(200000, 0, paymentsOf(table))).toBe(3.56)
  })

  it('augmente avec les frais et avec l\'assurance', () => {
    const bare = calculateTAEG(200000, 0, paymentsOf(generateAmortizationTable(200000, 3.5, 240, start)))
    const withFees = calculateTAEG(200000, 3000, paymentsOf(generateAmortizationTable(200000, 3.5, 240, start)))
    const withInsurance = calculateTAEG(200000, 3000, paymentsOf(generateAmortizationTable(200000, 3.5, 240, start, { insuranceRate: 0.34 })))
    expect(withFees).toBeGreaterThan(bare)
    expect(withInsurance).toBeGreaterThan(withFees)
  })

  it('actualisées au TAEG, les échéances redonnent le capital net de frais', () => {
    const payments = paymentsOf(generateAmortizationTable(250000, 3.45, 300, start, { insuranceRate: 0.34 }))
    const taeg = calculateTAEG(250000, 4200, payments)
    const i = Math.pow(1 + taeg / 100, 1 / 12) - 1
    const presentValue = payments.reduce((sum, p, k) => sum + p / Math.pow(1 + i, k + 1), 0)
    // Le TAEG est arrondi à 0,01 % : l'écart reste inférieur à 0,1 % du capital
    expect(Math.abs(presentValue - (250000 - 4200))).toBeLessThan(250)
  })

  it('vaut 0 à taux nul et sans frais, null sans capital net', () => {
    expect(calculateTAEG(12000, 0, Array(12).fill(1000))).toBe(0)
    expect(calculateTAEG(1000, 1000, [500, 500])).toBe(null)
    expect(calculateTAEG(1000, 0, [])).toBe(null)
  })
})

describe('quotité d\'assurance', () => {
  it('multiplie la cotisation', () => {
    expect(effectiveInsuranceRate(0.3)).toBe(0.3)
    expect(effectiveInsuranceRate(0.3, 200)).toBe(0.6)
    expect(effectiveInsuranceRate(null, 150)).toBe(0)
    const table = generateAmortizationTable(200000, 3.5, 240, new Date(2026, 9, 2), { insuranceRate: 0.3, insuranceQuota: 150 })
    expect(table[0].insurancePart).toBe(75)
  })
})

describe('projet : frais de garantie', () => {
  it('s\'ajoutent au coût et se paient avec l\'apport', () => {
    const r = calculateLoanAmount(300000, 'ancien', 0, '€', 24000, 1000, 3000)
    expect(r.totalCost).toBe(328000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(4000)
    expect(r.guaranteeFees).toBe(3000)
  })
})
