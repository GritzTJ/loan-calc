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
  calculateEarlyRepaymentPenalty,
  effectiveInsuranceRate,
  formatEuros,
  MAX_LOAN_MONTHS
} from './loanCalculator.js'
import { calculateNotaryFees } from './notaryFees.js'

// Les règles du plan de financement (C1, C2, apport nécessaire…) se vérifient avec des frais de notaire
// proportionnels, dont les résultats se calculent à la main : 8 % dans l'ancien, 3 % dans le neuf.
// Le barème réel est testé dans notaryFees.test.js, et son branchement plus bas.
const FLAT_NOTARY = { ancien: 0.08, neuf: 0.03 }
const flat = (type) => ({ notaryFeesOf: (price) => Math.round(price * FLAT_NOTARY[type] * 100) / 100 })
const maxPriceFlat = (capacity, apport, type, fees = 0, mode = '€', options = {}) =>
  calculateMaxPropertyPrice(capacity, apport, type, fees, mode, { ...flat(type), ...options })
const loanAmountFlat = (price, type, fees = 0, mode = '€', apport = 0, dossier = 0, garantie = 0, options = {}) =>
  calculateLoanAmount(price, type, fees, mode, apport, dossier, garantie, { ...flat(type), ...options })

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
    const byBudget = maxPriceFlat(200000, 50000, 'ancien')
    // Prix arrondi à l'euro inférieur : 250 000 / 1,08 = 231 481,48
    expect(byBudget.c1).toBe(231481)
    expect(byBudget.maxPrice).toBe(byBudget.c1)
    expect(byBudget.isApportConstrained).toBe(false)

    // Apport faible : c'est l'apport (C2 = apport / taux notaire) qui limite
    const byApport = maxPriceFlat(200000, 8000, 'ancien')
    expect(byApport.c2).toBe(100000)
    expect(byApport.maxPrice).toBe(100000)
    expect(byApport.isApportConstrained).toBe(true)
  })

  it('applique 8 % de notaire dans l\'ancien et 3 % dans le neuf', () => {
    expect(maxPriceFlat(200000, 50000, 'ancien').notaryFees).toBeCloseTo(231481 * 0.08, 2)
    const neuf = maxPriceFlat(200000, 50000, 'neuf')
    expect(neuf.maxPrice).toBe(242718)
    expect(neuf.notaryFees).toBeCloseTo(242718 * 0.03, 2)
  })

  it('inclut les frais d\'agence en % dans C1', () => {
    const r = maxPriceFlat(200000, 50000, 'ancien', 5, '%')
    expect(r.c1).toBe(221238) // 250 000 / (1 + 0,08 + 0,05)
    expect(r.agencyFees).toBeCloseTo(221238 * 0.05, 2)
  })

  it('retire les frais d\'agence fixes du budget', () => {
    const r = maxPriceFlat(200000, 50000, 'ancien', 10000, '€')
    expect(r.c1).toBe(222222) // (250 000 − 10 000) / 1,08
  })

  // L'apport qui permet d'utiliser toute la capacité est un seuil fixe :
  // il ne doit pas dépendre de l'apport déjà saisi.
  it('annonce un apport nécessaire stable, quel que soit l\'apport saisi', () => {
    expect(maxPriceFlat(200000, 0, 'ancien').minApportNeeded).toBe(16000)
    expect(maxPriceFlat(200000, 14814.82, 'ancien').minApportNeeded).toBe(16000)
    expect(maxPriceFlat(200000, 16000, 'ancien').isApportConstrained).toBe(false)
  })

  // Quand l'apport limite le prix, le prêt ne finance que le prix FAI : le reste de la capacité est inutilisé
  it('indique le prêt réellement utilisé et la capacité restante', () => {
    const byBudget = maxPriceFlat(200000, 50000, 'ancien')
    expect(byBudget.loanUsed).toBe(200000)
    expect(byBudget.unusedCapacity).toBe(0)

    const byApport = maxPriceFlat(200000, 8000, 'ancien')
    expect(byApport.loanUsed).toBe(100000)
    expect(byApport.unusedCapacity).toBe(100000)

    const withAgency = maxPriceFlat(200000, 8000, 'ancien', 5, '%')
    expect(withAgency.loanUsed).toBe(105000) // prix 100 000 + agence 5 000
    expect(withAgency.unusedCapacity).toBe(95000)
  })

  it('tient compte des frais d\'agence dans l\'apport nécessaire', () => {
    expect(maxPriceFlat(200000, 0, 'ancien', 10000, '€').minApportNeeded).toBe(15200)
    expect(maxPriceFlat(200000, 0, 'ancien', 5, '%').minApportNeeded).toBe(15238.1)
  })
})

describe('calculateLoanAmount', () => {
  it('finance les frais d\'agence mais pas les frais de notaire', () => {
    const r = loanAmountFlat(300000, 'ancien', 15000, '€', 24000)
    expect(r.notaryFees).toBe(24000)
    expect(r.loanAmount).toBe(315000) // prix FAI
    expect(r.fundingGap).toBe(0)
  })

  it('signale l\'apport manquant pour les frais de notaire', () => {
    const r = loanAmountFlat(300000, 'ancien', 0, '€', 20000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(4000)
  })

  it('traite les frais de dossier comme non finançables', () => {
    const r = loanAmountFlat(300000, 'ancien', 0, '€', 24500, 1000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(500)
  })

  it('réduit le prêt quand l\'apport dépasse les frais', () => {
    const r = loanAmountFlat(300000, 'ancien', 0, '€', 74000)
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
    const r = maxPriceFlat(80000, 5000, 'ancien', 500000, '€')
    expect(r.maxPrice).toBe(0)
    expect(r.loanUsed).toBe(0)
    expect(r.agencyFees).toBe(0)
    expect(r.feesExceedBudget).toBe(true)
  })

  it('capacité : fullCapacityPrice est le prix atteint quand l\'apport vaut minApportNeeded', () => {
    for (const [fees, mode] of [[0, '€'], [9000, '€'], [4, '%']]) {
      const r = maxPriceFlat(200000, 0, 'ancien', fees, mode)
      const atThreshold = maxPriceFlat(200000, r.minApportNeeded, 'ancien', fees, mode)
      expect(Math.abs(atThreshold.maxPrice - r.fullCapacityPrice)).toBeLessThan(1.5)
    }
  })

  it('projet : un apport supérieur au coût total laisse un excédent', () => {
    const r = loanAmountFlat(150000, 'ancien', 0, '€', 400000, 0)
    expect(r.loanAmount).toBe(0)
    expect(r.totalCost).toBe(162000)
    expect(r.surplus).toBe(238000)
    expect(r.contributionUsed).toBe(162000)
  })

  it('projet : pas d\'excédent quand l\'apport est entièrement utilisé', () => {
    const r = loanAmountFlat(300000, 'ancien', 0, '€', 30000, 0)
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
    const r = loanAmountFlat(300000, 'ancien', 0, '€', 24000, 1000, 3000)
    expect(r.totalCost).toBe(328000)
    expect(r.loanAmount).toBe(300000)
    expect(r.fundingGap).toBe(4000)
    expect(r.guaranteeFees).toBe(3000)
  })
})

describe('plan de financement au barème réel et travaux', () => {
  it('capacité : le prix maximal respecte les deux contraintes avec le barème', () => {
    for (const apport of [0, 5000, 16000, 25000, 80000]) {
      for (const [type, dmto] of [['ancien', 'majore'], ['ancien', 'normal'], ['neuf', undefined]]) {
        const r = calculateMaxPropertyPrice(240000, apport, type, 9000, '€', { dmtoRate: dmto, works: 15000 })
        const notary = calculateNotaryFees(r.maxPrice, type, dmto).total
        expect(r.notaryFees).toBe(notary)
        expect(notary).toBeLessThanOrEqual(apport + 0.01)
        const needs = r.maxPrice + r.agencyFees + r.works + notary
        expect(needs).toBeLessThanOrEqual(240000 + apport + 0.01)
        // Budget entièrement utilisé quand l'apport ne limite pas
        // (à l'euro près : le prix est arrondi à l'euro inférieur)
        if (!r.isApportConstrained && r.maxPrice > 0) expect(240000 + apport - needs).toBeLessThan(2)
        expect(r.loanUsed).toBeLessThanOrEqual(240000)
      }
    }
  })

  it('capacité : au seuil d\'apport nécessaire, toute la capacité est utilisée', () => {
    const r = calculateMaxPropertyPrice(240000, 0, 'ancien', 5, '%', { works: 10000 })
    const atThreshold = calculateMaxPropertyPrice(240000, r.minApportNeeded, 'ancien', 5, '%', { works: 10000 })
    expect(atThreshold.isApportConstrained).toBe(false)
    expect(Math.abs(atThreshold.maxPrice - r.fullCapacityPrice)).toBeLessThan(1)
    expect(atThreshold.unusedCapacity).toBe(0)
  })

  it('capacité : sans apport, aucun bien n\'est accessible (les frais de notaire ne sont jamais nuls)', () => {
    const r = calculateMaxPropertyPrice(240000, 0, 'ancien')
    expect(r.maxPrice).toBe(0)
    expect(r.loanUsed).toBe(0)
  })

  it('capacité : les travaux réduisent le prix accessible', () => {
    const without = calculateMaxPropertyPrice(240000, 40000, 'ancien')
    const withWorks = calculateMaxPropertyPrice(240000, 40000, 'ancien', 0, '€', { works: 30000 })
    expect(withWorks.maxPrice).toBeLessThan(without.maxPrice - 25000)
    expect(withWorks.works).toBe(30000)
  })

  it('projet : les travaux sont finançables par le prêt, pas les frais de notaire', () => {
    const notary = calculateNotaryFees(250000, 'ancien').total
    const r = calculateLoanAmount(250000, 'ancien', 10000, '€', notary, 0, 0, { works: 30000 })
    expect(r.notaryFees).toBe(notary)
    expect(r.loanAmount).toBe(290000) // prix + agence + travaux
    expect(r.fundingGap).toBe(0)
    expect(r.totalCost).toBe(Math.round((290000 + notary) * 100) / 100)
  })

  it('projet : le taux de mutation choisi change les frais', () => {
    const majore = calculateLoanAmount(250000, 'ancien', 0, '€', 0, 0, 0, { dmtoRate: 'majore' })
    const normal = calculateLoanAmount(250000, 'ancien', 0, '€', 0, 0, 0, { dmtoRate: 'normal' })
    expect(majore.notaryFees - normal.notaryFees).toBeCloseTo(250000 * (6.3185 - 5.80665) / 100, 1)
  })
})

describe('remboursement anticipé et modulation', () => {
  const start = new Date(2026, 9, 2)
  const sum = (table, key) => Math.round(table.reduce((total, r) => total + r[key], 0) * 100) / 100
  const base = generateAmortizationTable(200000, 3.5, 240, start)

  it('plafonne les indemnités à 6 mois d\'intérêts ou 3 % du restant dû', () => {
    // 20 000 € à 3,5 % : 6 mois d'intérêts = 350 € ; 3 % de 150 000 € = 4 500 € → 350 €
    expect(calculateEarlyRepaymentPenalty(20000, 150000, 3.5)).toBe(350)
    // À 8 %, sur un prêt soldé : 6 mois = 4 000 € ; 3 % de 100 000 € = 3 000 € → 3 000 €
    expect(calculateEarlyRepaymentPenalty(100000, 100000, 8)).toBe(3000)
  })

  it('réduire la durée : même mensualité, prêt soldé plus tôt, intérêts économisés', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, {
      earlyRepayment: { amount: 20000, afterMonth: 60, effect: 'duration', withPenalty: true }
    })
    expect(table.length).toBeLessThan(240)
    expect(table[100].payment).toBe(base[0].payment)
    expect(table[59].extraPayment).toBe(20000)
    expect(table[59].penalty).toBe(350)
    expect(table[59].remainingPrincipal).toBe(Math.round((base[59].remainingPrincipal - 20000) * 100) / 100)
    expect(table.at(-1).remainingPrincipal).toBe(0)
    // Tout le capital est remboursé, par les échéances et par le versement anticipé
    expect(Math.round((sum(table, 'principalPart') + sum(table, 'extraPayment')) * 100) / 100).toBe(200000)
    expect(sum(table, 'interestPart')).toBeLessThan(sum(base, 'interestPart'))
  })

  it('réduire la mensualité : même fin de prêt, mensualité plus basse', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, {
      earlyRepayment: { amount: 20000, afterMonth: 60, effect: 'payment', withPenalty: false }
    })
    expect(table.length).toBe(240)
    expect(table[59].payment).toBe(base[0].payment)
    expect(table[60].payment).toBeLessThan(base[0].payment)
    expect(table[59].penalty).toBe(0)
    expect(table.at(-1).remainingPrincipal).toBe(0)
    expect(Math.round((sum(table, 'principalPart') + sum(table, 'extraPayment')) * 100) / 100).toBe(200000)
  })

  it('un remboursement supérieur au restant dû solde le prêt', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, {
      earlyRepayment: { amount: 999999, afterMonth: 120, effect: 'duration', withPenalty: false }
    })
    expect(table.length).toBe(120)
    expect(table.at(-1).extraPayment).toBe(base[119].remainingPrincipal)
    expect(table.at(-1).remainingPrincipal).toBe(0)
  })

  it('l\'assurance sur capital initial baisse en proportion du remboursement', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, { insuranceRate: 0.3 }, {
      earlyRepayment: { amount: 50000, afterMonth: 12, effect: 'payment', withPenalty: false }
    })
    expect(table[11].insurancePart).toBe(50)
    expect(table[12].insurancePart).toBe(37.5)
  })

  it('modulation à la hausse : la durée raccourcit ; à la baisse : elle s\'allonge', () => {
    const higher = generateAmortizationTable(200000, 3.5, 240, start, {}, { modulation: { payment: 1400, fromMonth: 25 } })
    expect(higher[23].payment).toBe(base[0].payment)
    expect(higher[24].payment).toBe(1400)
    expect(higher.length).toBeLessThan(240)
    expect(higher.at(-1).remainingPrincipal).toBe(0)

    const lower = generateAmortizationTable(200000, 3.5, 240, start, {}, { modulation: { payment: 1000, fromMonth: 25 } })
    expect(lower.length).toBeGreaterThan(240)
    expect(lower.at(-1).remainingPrincipal).toBe(0)
    expect(sum(lower, 'principalPart')).toBe(200000)
  })

  it('une mensualité qui ne couvre pas les intérêts s\'arrête à la durée maximale, capital soldé', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, { modulation: { payment: 100, fromMonth: 2 } })
    expect(table.length).toBe(MAX_LOAN_MONTHS)
    expect(table.every(r => r.principalPart >= 0)).toBe(true)
    expect(table.at(-1).remainingPrincipal).toBe(0)
  })

  it('sans événement, le tableau est inchangé', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, { earlyRepayment: { amount: 0, afterMonth: 60 }, modulation: null })
    expect(table).toEqual(base)
  })

  it('summarizeByYear compte le remboursement anticipé dans le capital et les indemnités dans le payé', () => {
    const table = generateAmortizationTable(200000, 3.5, 240, start, {}, {
      earlyRepayment: { amount: 20000, afterMonth: 6, effect: 'duration', withPenalty: true }
    })
    const [first] = summarizeByYear(table)
    expect(first.extra).toBe(20350)
    expect(first.remainingPrincipal).toBe(table[11].remainingPrincipal)
    expect(Math.round((200000 - first.principal) * 100) / 100).toBe(first.remainingPrincipal)
  })
})
