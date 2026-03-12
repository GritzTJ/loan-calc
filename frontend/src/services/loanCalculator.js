/**
 * Logique métier — Calculs de prêt immobilier
 * Fonctions pures, sans dépendance UI, réutilisables côté serveur en v2.
 */

/**
 * Calcule la mensualité d'un prêt à taux fixe (amortissement constant).
 * Formule : M = C × t / (1 − (1 + t)^(−n))
 * @param {number} principal - Montant emprunté (€)
 * @param {number} annualRate - Taux annuel (ex: 3.5 pour 3,5%)
 * @param {number} months - Nombre de mensualités
 * @returns {number} Mensualité arrondie au centime
 */
export function calculateMonthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0
  if (annualRate === 0) return Math.round(principal / months * 100) / 100

  const monthlyRate = annualRate / 100 / 12
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
  return Math.round(payment * 100) / 100
}

/**
 * Génère le tableau d'amortissement complet.
 * La 1re mensualité tombe le 1er du mois suivant la date de début.
 * @param {number} principal - Montant emprunté (€)
 * @param {number} annualRate - Taux annuel (%)
 * @param {number} months - Nombre de mensualités
 * @param {Date} startDate - Date de début du prêt
 * @returns {Array<Object>} Tableau d'amortissement
 */
export function generateAmortizationTable(principal, annualRate, months, startDate) {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months)
  if (monthlyPayment === 0) return []

  const monthlyRate = annualRate / 100 / 12
  let remainingPrincipal = principal
  const table = []

  // La 1re mensualité tombe le 1er du mois suivant la date de début
  const firstPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)

  for (let i = 0; i < months; i++) {
    const date = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth() + i, 1)
    const interestPart = Math.round(remainingPrincipal * monthlyRate * 100) / 100

    // Dernière mensualité : ajustement pour solder exactement le capital
    const isLast = i === months - 1
    const principalPart = isLast
      ? remainingPrincipal
      : Math.round((monthlyPayment - interestPart) * 100) / 100

    const actualPayment = isLast
      ? Math.round((principalPart + interestPart) * 100) / 100
      : monthlyPayment

    remainingPrincipal = isLast
      ? 0
      : Math.round((remainingPrincipal - principalPart) * 100) / 100

    table.push({
      number: i + 1,
      date,
      remainingPrincipal,
      principalPart,
      interestPart,
      payment: actualPayment
    })
  }

  return table
}

/**
 * Calcule la mensualité maximale selon le taux d'endettement.
 * @param {number} monthlyIncome - Revenus nets mensuels (€)
 * @param {number} monthlyCharges - Charges mensuelles existantes (€)
 * @param {number} debtRatio - Taux d'endettement cible (ex: 35 pour 35%)
 * @returns {number} Mensualité maximale (€)
 */
export function calculateMaxMonthlyPayment(monthlyIncome, monthlyCharges, debtRatio = 35) {
  const maxPayment = (monthlyIncome * debtRatio / 100) - monthlyCharges
  return Math.max(0, Math.round(maxPayment * 100) / 100)
}

/**
 * Calcule le capital empruntable à partir d'une mensualité donnée.
 * Formule inverse : C = M × (1 − (1 + t)^(−n)) / t
 * @param {number} monthlyPayment - Mensualité (€)
 * @param {number} annualRate - Taux annuel (%)
 * @param {number} months - Durée en mois
 * @returns {number} Capital empruntable (€)
 */
export function calculateBorrowingCapacity(monthlyPayment, annualRate, months) {
  if (monthlyPayment <= 0 || months <= 0) return 0
  if (annualRate === 0) return monthlyPayment * months

  const monthlyRate = annualRate / 100 / 12
  const capacity = monthlyPayment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate
  return Math.round(capacity * 100) / 100
}

// Taux de frais de notaire selon le type de bien
export const NOTARY_FEES = {
  ancien: 0.08, // 8%
  neuf: 0.03    // 3%
}

/**
 * Calcule le prix maximal du bien accessible.
 * Prix max = (capital empruntable + apport) / (1 + taux_frais_notaire)
 * @param {number} borrowingCapacity - Capital empruntable (€)
 * @param {number} personalContribution - Apport personnel (€)
 * @param {'ancien'|'neuf'} propertyType - Type de bien
 * @returns {{ maxPrice: number, notaryFees: number, totalBudget: number }}
 */
export function calculateMaxPropertyPrice(borrowingCapacity, personalContribution, propertyType) {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  const totalBudget = borrowingCapacity + personalContribution
  const maxPrice = Math.round(totalBudget / (1 + notaryRate) * 100) / 100
  const notaryFees = Math.round((maxPrice * notaryRate) * 100) / 100

  return { maxPrice, notaryFees, totalBudget }
}

/**
 * Retourne le 1er du mois prochain comme date de début par défaut.
 * @returns {Date}
 */
export function getDefaultStartDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

/**
 * Formate une date en chaîne lisible (ex: "01/04/2026").
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formate un nombre en euros (ex: "1 234,56 €").
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}
