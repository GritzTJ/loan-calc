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
 * Ni les frais de notaire ni les frais d'agence ne peuvent être financés par le crédit
 * (règle bancaire standard en France) — ils doivent être couverts par l'apport.
 *
 * Deux contraintes s'appliquent simultanément :
 *   C1 (budget total)  : prix ≤ (crédit + apport − fraisAgence€) / (1 + tauxNotaire)
 *   C2 (apport/frais)  : prix ≤ (apport − fraisAgence€) / tauxNotaire
 *   → prix = min(C1, C2)
 *
 * En mode % les deux contraintes sont résolues analytiquement avec tauxFrais = tauxNotaire + tauxAgence.
 *
 * @param {number} borrowingCapacity    - Capital empruntable (€)
 * @param {number} personalContribution - Apport personnel (€)
 * @param {'ancien'|'neuf'} propertyType - Type de bien
 * @param {number} agencyFees           - Frais d'agence : montant € ou taux %
 * @param {'€'|'%'} agencyFeesMode      - Mode de saisie des frais d'agence
 * @returns {{ maxPrice, notaryFees, totalBudget, agencyFees, isApportConstrained, minApportNeeded }}
 *   isApportConstrained : vrai si C2 est la contrainte active (apport trop faible)
 *   minApportNeeded     : apport minimum pour couvrir les frais sur un bien au prix = capacité d'emprunt
 */
export function calculateMaxPropertyPrice(borrowingCapacity, personalContribution, propertyType, agencyFees = 0, agencyFeesMode = '€') {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  const totalBudget = borrowingCapacity + personalContribution

  let maxPrice, agencyFeesAmount, minApportNeeded

  if (agencyFeesMode === '%') {
    const agencyRate = (agencyFees || 0) / 100
    const feesRate = notaryRate + agencyRate
    // C1 : prix = budget total / (1 + tauxFrais)
    const c1 = totalBudget / (1 + feesRate)
    // C2 : apport doit couvrir tous les frais → prix = apport / tauxFrais
    const c2 = feesRate > 0 ? personalContribution / feesRate : Infinity
    maxPrice = Math.max(0, Math.min(c1, c2))
    agencyFeesAmount = Math.round(maxPrice * agencyRate * 100) / 100
    // Apport min pour lever la contrainte C2 (couvrir les frais sur un bien = capacité d'emprunt)
    minApportNeeded = Math.round(feesRate * borrowingCapacity * 100) / 100
  } else {
    agencyFeesAmount = agencyFees || 0
    const apportAfterAgency = Math.max(0, personalContribution - agencyFeesAmount)
    // C1 : prix = (budget − fraisAgence€) / (1 + tauxNotaire)
    const c1 = (totalBudget - agencyFeesAmount) / (1 + notaryRate)
    // C2 : apport (après agence) doit couvrir les frais notaire → prix = apportRestant / tauxNotaire
    const c2 = notaryRate > 0 ? apportAfterAgency / notaryRate : Infinity
    maxPrice = Math.max(0, Math.min(c1, c2))
    // Apport min = frais notaire sur un bien = capacité d'emprunt + frais agence fixes
    minApportNeeded = Math.round((notaryRate * borrowingCapacity + agencyFeesAmount) * 100) / 100
  }

  maxPrice = Math.round(maxPrice * 100) / 100
  const notaryFees = Math.round(maxPrice * notaryRate * 100) / 100
  const isApportConstrained = personalContribution < minApportNeeded

  return { maxPrice, notaryFees, totalBudget, agencyFees: agencyFeesAmount, isApportConstrained, minApportNeeded }
}

/**
 * Calcule le montant à emprunter à partir d'un prix de bien connu.
 * coûtTotal = prix + fraisNotaire + fraisAgence
 *
 * Les frais (notaire + agence) ne pouvant pas être financés par le crédit,
 * le montant du prêt est plafonné au prix du bien :
 *   montantEmprunt = max(0, min(prixBien, coûtTotal − apport))
 *
 * Si l'apport est insuffisant pour couvrir tous les frais, fundingGap indique
 * le montant manquant (frais non couverts par l'apport).
 *
 * @param {number} propertyPrice        - Prix du bien (€)
 * @param {'ancien'|'neuf'} propertyType - Type de bien
 * @param {number} agencyFees           - Frais d'agence : montant € ou taux %
 * @param {'€'|'%'} agencyFeesMode      - Mode de saisie des frais d'agence
 * @param {number} personalContribution  - Apport personnel (€)
 * @returns {{ loanAmount: number, notaryFees: number, agencyFees: number, totalCost: number, fundingGap: number }}
 */
export function calculateLoanAmount(propertyPrice, propertyType, agencyFees = 0, agencyFeesMode = '€', personalContribution = 0) {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  const notaryFees = Math.round(propertyPrice * notaryRate * 100) / 100

  const agencyFeesAmount = agencyFeesMode === '%'
    ? Math.round(propertyPrice * (agencyFees || 0) / 100 * 100) / 100
    : (agencyFees || 0)

  const totalCost = Math.round((propertyPrice + notaryFees + agencyFeesAmount) * 100) / 100

  // Le prêt ne peut pas dépasser le prix du bien (les frais ne sont pas finançables)
  const loanAmount = Math.max(0, Math.round(Math.min(propertyPrice, totalCost - personalContribution) * 100) / 100)

  // Apport manquant pour couvrir les frais d'acquisition
  const feesTotal = notaryFees + agencyFeesAmount
  const fundingGap = Math.max(0, Math.round((feesTotal - personalContribution) * 100) / 100)

  return { loanAmount, notaryFees, agencyFees: agencyFeesAmount, totalCost, fundingGap }
}

/**
 * Calcule la mensualité d'assurance emprunteur.
 * Formule : mensualité = capital × taux_annuel / 100 / 12
 * @param {number} principal - Capital emprunté (€)
 * @param {number} insuranceRate - Taux annuel assurance (ex: 0.30 pour 0,30%)
 * @returns {number} Mensualité assurance arrondie au centime
 */
export function calculateInsuranceCost(principal, insuranceRate) {
  if (!principal || !insuranceRate) return 0
  return Math.round(principal * insuranceRate / 100 / 12 * 100) / 100
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
