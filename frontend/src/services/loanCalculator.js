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
 * Les frais d'agence (FAA) peuvent être financés par le crédit — le prêt peut couvrir
 * prix net vendeur + frais d'agence (= prix FAI).
 * Seuls les frais de notaire doivent être couverts par l'apport (non finançables).
 *
 * Deux contraintes indépendantes s'appliquent :
 *   C1 (budget) : (crédit + apport) / (1 + frais)
 *   C2 (apport/notaire) : prix ≤ apport / tauxNotaire
 *   → prix = min(C1, C2)
 *
 * @param {number} borrowingCapacity      - Capital empruntable (€)
 * @param {number} personalContribution   - Apport personnel (€)
 * @param {'ancien'|'neuf'} propertyType  - Type de bien
 * @param {number} agencyFees             - Frais d'agence : montant € ou taux %
 * @param {'€'|'%'} agencyFeesMode        - Mode de saisie des frais d'agence
 * @returns {{ maxPrice, notaryFees, totalBudget, agencyFees, isApportConstrained, minApportNeeded, c1, c2 }}
 *   c1 / c2 : valeurs des deux contraintes (exposées pour les tooltips)
 */
export function calculateMaxPropertyPrice(borrowingCapacity, personalContribution, propertyType, agencyFees = 0, agencyFeesMode = '€') {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  const totalBudget = borrowingCapacity + personalContribution
  const c1Base = totalBudget

  let maxPrice, agencyFeesAmount, c1, c2

  if (agencyFeesMode === '%') {
    const agencyRate = (agencyFees || 0) / 100
    // C1 (budget) : prix × (1 + notaryRate + agencyRate) ≤ c1Base
    c1 = c1Base / (1 + notaryRate + agencyRate)
    // C2 (apport) : l'apport couvre au minimum les frais de notaire (non finançables)
    c2 = personalContribution / notaryRate
    maxPrice = Math.max(0, Math.min(c1, c2))
    agencyFeesAmount = Math.round(maxPrice * agencyRate * 100) / 100
  } else {
    agencyFeesAmount = agencyFees || 0
    // C1 (budget) : prix × (1 + notaryRate) ≤ c1Base − frais d'agence fixes
    c1 = Math.max(0, (c1Base - agencyFeesAmount) / (1 + notaryRate))
    // C2 (apport) : l'apport couvre au minimum les frais de notaire (non finançables)
    c2 = personalContribution / notaryRate
    maxPrice = Math.max(0, Math.min(c1, c2))
  }

  maxPrice = Math.round(maxPrice * 100) / 100
  c1 = Math.round(c1 * 100) / 100
  c2 = Math.round(c2 * 100) / 100

  const notaryFees = Math.round(maxPrice * notaryRate * 100) / 100
  // Apport minimum = frais de notaire sur le prix C1 (plafond par le budget total)
  const minApportNeeded = Math.round(c1 * notaryRate * 100) / 100
  const isApportConstrained = personalContribution < minApportNeeded

  return { maxPrice, notaryFees, totalBudget, agencyFees: agencyFeesAmount, isApportConstrained, minApportNeeded, c1, c2 }
}

/**
 * Calcule le montant à emprunter à partir d'un prix de bien connu.
 * "Prix du bien" = prix net vendeur (hors frais d'agence).
 * coûtTotal = prixNetVendeur + fraisNotaire + fraisAgence
 *
 * Les frais d'agence (FAA) peuvent être financés par le crédit (règle bancaire française).
 * Le prêt est donc plafonné au prix FAI = prix net vendeur + frais d'agence.
 * Seuls les frais de notaire ne peuvent pas être financés.
 *   montantEmprunt = max(0, min(prixFAI, coûtTotal − apport))
 *
 * fundingGap indique le manque d'apport pour couvrir les frais de notaire uniquement.
 *
 * @param {number} propertyPrice        - Prix net vendeur (€), hors frais d'agence
 * @param {'ancien'|'neuf'} propertyType - Type de bien
 * @param {number} agencyFees           - Frais d'agence : montant € ou taux %
 * @param {'€'|'%'} agencyFeesMode      - Mode de saisie des frais d'agence
 * @param {number} personalContribution  - Apport personnel (€)
 * @param {number} applicationFees       - Frais de dossier bancaire (€), optionnel
 * @returns {{ loanAmount, notaryFees, agencyFees, applicationFees, totalCost, fundingGap }}
 */
export function calculateLoanAmount(propertyPrice, propertyType, agencyFees = 0, agencyFeesMode = '€', personalContribution = 0, applicationFees = 0) {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  // Les frais de notaire se calculent sur le prix net vendeur (hors agence FAA)
  const notaryFees = Math.round(propertyPrice * notaryRate * 100) / 100

  const agencyFeesAmount = agencyFeesMode === '%'
    ? Math.round(propertyPrice * (agencyFees || 0) / 100 * 100) / 100
    : (agencyFees || 0)

  const appFees = applicationFees || 0
  const totalCost = Math.round((propertyPrice + notaryFees + agencyFeesAmount + appFees) * 100) / 100

  // Le prêt peut couvrir prix net vendeur + frais d'agence (= prix FAI)
  // Seuls les frais de notaire (et de dossier) ne sont pas finançables
  const prixFAI = propertyPrice + agencyFeesAmount
  const loanAmount = Math.max(0, Math.round(Math.min(prixFAI, totalCost - personalContribution) * 100) / 100)

  // Apport manquant pour couvrir les frais de notaire (seule partie non finançable)
  const fundingGap = Math.max(0, Math.round((notaryFees - personalContribution) * 100) / 100)

  return { loanAmount, notaryFees, agencyFees: agencyFeesAmount, applicationFees: appFees, totalCost, fundingGap }
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
