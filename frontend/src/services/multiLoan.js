/**
 * Plan de financement à plusieurs prêts : un prêt principal et des prêts complémentaires
 * (PTZ, prêt employeur…), avec lissage optionnel des mensualités.
 */
import { generateAmortizationTable, MAX_LOAN_MONTHS } from './loanCalculator.js'

export const MAX_EXTRA_LOANS = 3

// Types proposés pour un prêt complémentaire (le libellé sert de nom au prêt)
export const EXTRA_LOAN_TYPES = [
  { value: 'ptz', label: 'PTZ', name: 'PTZ', annualRate: 0 },
  { value: 'employer', label: 'Employeur', name: 'Prêt employeur', annualRate: 1 },
  { value: 'other', label: 'Autre', name: 'Autre prêt', annualRate: null }
]

/** Nom affiché d'un prêt complémentaire, d'après son type. */
export function extraLoanName(loan) {
  return (EXTRA_LOAN_TYPES.find(type => type.value === loan.type) ?? EXTRA_LOAN_TYPES[2]).name
}

const round = (x) => Math.round(x * 100) / 100

/** Un prêt complémentaire est pris en compte dès qu'il a un montant et une durée. */
export function isUsableLoan(loan) {
  return loan?.principal > 0 && loan.months > 0 && typeof loan.annualRate === 'number' && loan.annualRate >= 0
}

/**
 * Mensualité totale de crédit (hors assurance) qui reste constante pendant toute la durée du prêt
 * principal : chaque mois, le prêt principal paie ce total moins les mensualités des autres prêts.
 * Il rembourse donc peu tant que les autres prêts courent, davantage ensuite.
 *
 * Le total est résolu par dichotomie : c'est celui qui solde le prêt principal à son terme.
 *
 * @param {{ principal: number, annualRate: number, months: number }} main
 * @param {number[]} sidePayments - Somme des mensualités des autres prêts, mois par mois (index 0 = 1re échéance)
 * @returns {number} Mensualité totale lissée (€)
 */
export function calculateSmoothedPayment(main, sidePayments) {
  const rate = main.annualRate / 100 / 12
  // Capital restant au terme, pour un total mensuel donné. Le prêt principal paie au moins ses intérêts.
  const remainingAtTerm = (total) => {
    let balance = main.principal
    for (let k = 0; k < main.months; k++) {
      const interest = balance * rate
      balance -= Math.max(interest, total - (sidePayments[k] || 0)) - interest
    }
    return balance
  }
  let low = 0
  let high = main.principal * (1 + rate) + Math.max(0, ...sidePayments)
  for (let step = 0; step < 80; step++) {
    const mid = (low + high) / 2
    if (remainingAtTerm(mid) > 0) low = mid
    else high = mid
  }
  return round(high)
}

/**
 * Calcule l'ensemble des prêts.
 *
 * @param {Object} plan
 * @param {{ principal, annualRate, months }} plan.main - Prêt principal
 * @param {Array<{ label, principal, annualRate, months }>} [plan.extraLoans] - Prêts complémentaires
 * @param {boolean} [plan.smoothing] - Lisser le total des mensualités sur la durée du prêt principal
 * @param {Date} plan.startDate
 * @param {Object} [plan.insurance] - Assurance, appliquée à chaque prêt
 * @param {Object} [plan.events] - Remboursement anticipé et modulation du prêt principal (ignorés si lissage)
 * @returns {{ loans: Array<{ label, principal, table }>, combined: Array<Object>, smoothed: boolean, smoothedPayment: number|null }}
 *   loans[0] est le prêt principal ; combined additionne les prêts mois par mois, au même format
 *   qu'un tableau d'amortissement
 */
export function buildLoanPlan({ main, extraLoans = [], smoothing = false, startDate, insurance = {}, events = {} }) {
  const sides = extraLoans.filter(isUsableLoan).slice(0, MAX_EXTRA_LOANS).map(loan => ({
    label: loan.label || extraLoanName(loan),
    principal: loan.principal,
    table: generateAmortizationTable(loan.principal, loan.annualRate, Math.min(loan.months, MAX_LOAN_MONTHS), startDate, insurance)
  }))

  // Le lissage n'a de sens que si les autres prêts se terminent au plus tard avec le prêt principal
  const smoothed = Boolean(smoothing && sides.length && sides.every(side => side.table.length <= main.months))
  let mainTable
  let smoothedPayment = null
  if (smoothed) {
    const sidePayments = Array.from({ length: main.months }, (_, k) => sides.reduce((sum, side) => sum + (side.table[k]?.payment || 0), 0))
    smoothedPayment = calculateSmoothedPayment(main, sidePayments)
    mainTable = generateAmortizationTable(main.principal, main.annualRate, main.months, startDate, insurance, {
      paymentOf: (number) => smoothedPayment - sidePayments[number - 1]
    })
  } else {
    mainTable = generateAmortizationTable(main.principal, main.annualRate, main.months, startDate, insurance, events)
  }

  const loans = [{ label: 'Prêt principal', principal: main.principal, table: mainTable }, ...sides]
  return { loans, combined: combineTables(loans.map(loan => loan.table)), smoothed, smoothedPayment }
}

const SUMMED = ['remainingPrincipal', 'principalPart', 'interestPart', 'payment', 'insurancePart', 'totalPayment', 'extraPayment', 'penalty']

/** Additionne plusieurs tableaux d'amortissement mois par mois (un prêt terminé ne compte plus). */
export function combineTables(tables) {
  const length = Math.max(0, ...tables.map(table => table.length))
  const combined = []
  for (let k = 0; k < length; k++) {
    const rows = tables.map(table => table[k]).filter(Boolean)
    const row = { number: k + 1, date: rows[0].date }
    for (const key of SUMMED) row[key] = round(rows.reduce((sum, r) => sum + r[key], 0))
    combined.push(row)
  }
  return combined
}

/**
 * Paliers de mensualité : les périodes pendant lesquelles le total mensuel reste le même
 * (il baisse quand un prêt se termine). Les écarts de quelques euros (arrondis, dernière échéance)
 * ne créent pas de palier.
 * @param {Array<Object>} combined
 * @param {'totalPayment'|'payment'} [key]
 * @returns {Array<{ fromNumber, date, months, amount }>}
 */
export function paymentSteps(combined, key = 'payment') {
  const steps = []
  for (const row of combined) {
    const last = steps.at(-1)
    if (last && Math.abs(row[key] - last.amount) <= Math.max(2, last.amount * 0.005)) last.months++
    else steps.push({ fromNumber: row.number, date: row.date, months: 1, amount: row[key] })
  }
  // Une toute dernière échéance d'ajustement n'est pas un palier
  if (steps.length > 1 && steps.at(-1).months === 1) {
    steps.at(-2).months++
    steps.pop()
  }
  return steps
}
