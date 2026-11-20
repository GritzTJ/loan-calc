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
  // Taux pas encore saisi (null) : pas de mensualité, plutôt qu'un NaN qui se propagerait au tableau
  if (!Number.isFinite(annualRate)) return 0
  if (annualRate === 0) return Math.round(principal / months * 100) / 100

  const monthlyRate = annualRate / 100 / 12
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
  return Math.round(payment * 100) / 100
}

// Modes de calcul de l'assurance emprunteur
//   initial : cotisation fixe, sur le capital emprunté (contrat groupe de la banque)
//   crd     : cotisation sur le capital restant dû, donc dégressive (délégation d'assurance)
export const INSURANCE_MODES = [
  { value: 'initial', label: 'Capital initial' },
  { value: 'crd', label: 'Restant dû' }
]

/**
 * Taux d'assurance réellement payé : le taux du contrat appliqué à la quotité assurée.
 * La quotité vaut 100 % pour un emprunteur seul ; à deux, chacun est couvert sur une part du prêt
 * et le total va de 100 % (50/50) à 200 % (chacun couvert sur la totalité).
 * @param {number} insuranceRate - Taux annuel du contrat (%)
 * @param {number} [quota] - Quotité assurée (%), 100 par défaut
 * @returns {number} Taux annuel effectif (%)
 */
export function effectiveInsuranceRate(insuranceRate, quota) {
  return (insuranceRate || 0) * (quota ?? 100) / 100
}

/**
 * Génère le tableau d'amortissement complet.
 * La 1re mensualité tombe le 1er du mois suivant la date de début.
 *
 * La mensualité étant arrondie au centime, le prêt peut être soldé un peu avant ou un peu après
 * l'échéance théorique : la part de capital est plafonnée au restant dû, le tableau s'arrête dès que
 * le prêt est soldé, et la dernière échéance absorbe l'écart d'arrondi.
 *
 * @param {number} principal - Montant emprunté (€)
 * @param {number} annualRate - Taux annuel (%)
 * @param {number} months - Nombre de mensualités
 * @param {Date} startDate - Date de début du prêt
 * @param {{ insuranceRate?: number, insuranceMode?: 'initial'|'crd', insuranceQuota?: number }} [insurance] - Assurance emprunteur
 * @returns {Array<Object>} Lignes { number, date, remainingPrincipal, principalPart, interestPart,
 *   payment (crédit seul), insurancePart, totalPayment (crédit + assurance) }
 */
export function generateAmortizationTable(principal, annualRate, months, startDate, insurance = {}) {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months)
  if (monthlyPayment === 0) return []

  const monthlyRate = annualRate / 100 / 12
  const insuranceMonthlyRate = effectiveInsuranceRate(insurance.insuranceRate, insurance.insuranceQuota) / 100 / 12
  const insuranceOnRemaining = insurance.insuranceMode === 'crd'
  let remainingPrincipal = Math.round(principal * 100) / 100
  const table = []

  // La 1re mensualité tombe le 1er du mois suivant la date de début
  const firstPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)

  for (let i = 0; i < months; i++) {
    const date = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth() + i, 1)
    const interestPart = Math.round(remainingPrincipal * monthlyRate * 100) / 100
    const insuranceBase = insuranceOnRemaining ? remainingPrincipal : principal
    const insurancePart = Math.round(insuranceBase * insuranceMonthlyRate * 100) / 100

    // Part de capital de la mensualité constante (jamais négative, même si l'arrondi la rend inférieure aux intérêts)
    const regularPrincipalPart = Math.max(0, Math.round((monthlyPayment - interestPart) * 100) / 100)
    // Dernière échéance : la dernière prévue, ou celle qui solde le prêt en avance
    const isLast = i === months - 1 || regularPrincipalPart >= remainingPrincipal
    const principalPart = isLast ? remainingPrincipal : regularPrincipalPart
    const payment = isLast ? Math.round((principalPart + interestPart) * 100) / 100 : monthlyPayment

    remainingPrincipal = isLast ? 0 : Math.round((remainingPrincipal - principalPart) * 100) / 100

    table.push({
      number: i + 1,
      date,
      remainingPrincipal,
      principalPart,
      interestPart,
      payment,
      insurancePart,
      totalPayment: Math.round((payment + insurancePart) * 100) / 100
    })
    if (isLast) break
  }

  return table
}

/**
 * Regroupe le tableau d'amortissement par année de prêt (12 échéances).
 * @param {Array<Object>} rows - Lignes de generateAmortizationTable
 * @returns {Array<Object>} { year, principal, interest, insurance, total, remainingPrincipal (en fin d'année), rows }
 */
export function summarizeByYear(rows) {
  const years = []
  for (const row of rows) {
    const year = Math.ceil(row.number / 12)
    if (!years[year - 1]) {
      years[year - 1] = { year, principal: 0, interest: 0, insurance: 0, total: 0, remainingPrincipal: 0, rows: [] }
    }
    const y = years[year - 1]
    y.principal += row.principalPart
    y.interest += row.interestPart
    y.insurance += row.insurancePart
    y.total += row.totalPayment
    y.remainingPrincipal = row.remainingPrincipal
    y.rows.push(row)
  }
  const round = (x) => Math.round(x * 100) / 100
  return years.map(y => ({ ...y, principal: round(y.principal), interest: round(y.interest), insurance: round(y.insurance), total: round(y.total) }))
}

/**
 * TAEG (taux annuel effectif global) : le taux qui égalise ce que l'emprunteur reçoit réellement
 * (capital moins les frais payés au départ) et la valeur actualisée de tout ce qu'il verse ensuite
 * (mensualités de crédit et d'assurance). Méthode actuarielle réglementaire : taux mensuel i résolu
 * par dichotomie, puis annualisé par (1 + i)^12 − 1.
 *
 * @param {number} principal - Capital emprunté (€)
 * @param {number} upfrontFees - Frais payés au départ : dossier, garantie (€)
 * @param {number[]} payments - Versement de chaque mois, assurance comprise (€)
 * @returns {number|null} TAEG en %, arrondi à 2 décimales ; null s'il n'est pas calculable
 */
export function calculateTAEG(principal, upfrontFees, payments) {
  const received = principal - (upfrontFees || 0)
  const totalPaid = payments.reduce((sum, p) => sum + p, 0)
  if (!(received > 0) || payments.length === 0 || totalPaid <= 0) return null
  // Tout ce qui est versé ne couvre même pas ce qui est reçu : pas de taux positif
  if (totalPaid <= received) return 0

  const presentValue = (i) => payments.reduce((sum, p, k) => sum + p / Math.pow(1 + i, k + 1), 0)
  // La valeur actualisée décroît quand le taux monte : on encadre le taux mensuel entre 0 et 100 %
  let low = 0
  let high = 1
  for (let step = 0; step < 100; step++) {
    const mid = (low + high) / 2
    if (presentValue(mid) > received) low = mid
    else high = mid
  }
  const annual = (Math.pow(1 + (low + high) / 2, 12) - 1) * 100
  return Math.round(annual * 100) / 100
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
 * Calcule le capital empruntable à partir d'un budget mensuel donné.
 * Formule inverse : C = M / k, avec k = t / (1 − (1 + t)^(−n)) la mensualité par euro emprunté.
 *
 * Avec assurance, le budget couvre crédit + assurance, et l'assurance dépend elle-même
 * du capital (C × a / 12). On résout donc directement : C = M / (k + a / 12).
 *
 * @param {number} monthlyPayment - Budget mensuel, assurance comprise (€)
 * @param {number} annualRate - Taux annuel (%)
 * @param {number} months - Durée en mois
 * @param {number} insuranceRate - Taux annuel d'assurance (%), optionnel
 * @returns {number} Capital empruntable (€)
 */
export function calculateBorrowingCapacity(monthlyPayment, annualRate, months, insuranceRate = 0) {
  if (monthlyPayment <= 0 || months <= 0 || !Number.isFinite(annualRate)) return 0

  const monthlyRate = annualRate / 100 / 12
  const paymentPerEuro = annualRate === 0
    ? 1 / months
    : monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
  const insurancePerEuro = (insuranceRate || 0) / 100 / 12

  const capacity = monthlyPayment / (paymentPerEuro + insurancePerEuro)
  return Math.round(capacity * 100) / 100
}

// Bornes de saisie. Sans plafond de durée, un montant tapé par erreur dans le champ « durée »
// génère un tableau d'amortissement de centaines de milliers de lignes et fige le navigateur.
export const MAX_LOAN_MONTHS = 600 // 50 ans
// 30 % : très au-dessus de tout taux réel. Au-delà, la mensualité arrondie ne couvre plus que les intérêts
// et le tableau d'amortissement dégénère (tout le capital sur la dernière échéance).
export const MAX_RATE = 30         // %

/**
 * Ramène une durée venue d'ailleurs que du formulaire (simulation de l'historique) dans les bornes
 * de saisie : le champ durée ne borne que ce qui est tapé, pas ce qui est chargé.
 * @param {*} months
 * @returns {number|null} Nombre entier de mois entre 0 et MAX_LOAN_MONTHS, ou null si ce n'est pas un nombre
 */
export function sanitizeMonths(months) {
  if (typeof months !== 'number' || !Number.isFinite(months)) return null
  return Math.min(MAX_LOAN_MONTHS, Math.max(0, Math.round(months)))
}

// Taux de frais de notaire selon le type de bien
export const NOTARY_FEES = {
  ancien: 0.08, // 8%
  neuf: 0.03    // 3%
}

// Choix proposés dans les formulaires (Capacité et Projet)
export const PROPERTY_TYPES = [
  { value: 'ancien', label: 'Ancien (8 %)' },
  { value: 'neuf', label: 'Neuf (3 %)' }
]
// Hypothèse de calcul des frais de notaire, à dire à l'utilisateur : ils portent sur le prix net vendeur
// quand les honoraires d'agence sont à la charge de l'acquéreur. À la charge du vendeur, ils portent sur
// le prix affiché, qui les contient déjà : il suffit alors de saisir ce prix sans frais d'agence.
export const AGENCY_FEES_HELP = 'S\'ils sont à la charge de l\'acquéreur. À la charge du vendeur, ils sont déjà dans le prix : laissez vide.'
export const AGENCY_FEES_MODES = [
  { value: '€', label: '€ fixe' },
  { value: '%', label: '% du prix' }
]

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
 *   minApportNeeded : apport à partir duquel toute la capacité d'emprunt est utilisable
 *   loanUsed / unusedCapacity : part de la capacité réellement empruntée, et le reste
 *   fullCapacityPrice : prix accessible si l'apport atteignait minApportNeeded
 *   feesExceedBudget : les frais d'agence fixes dépassent tout le budget
 */
export function calculateMaxPropertyPrice(borrowingCapacity, personalContribution, propertyType, agencyFees = 0, agencyFeesMode = '€') {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  const totalBudget = borrowingCapacity + personalContribution
  const c1Base = totalBudget

  let maxPrice, agencyFeesAmount, c1, c2, minApportNeeded

  // Apport nécessaire pour utiliser toute la capacité : c'est le point où C1 = C2,
  // c.-à-d. où le prêt finance exactement le prix FAI et l'apport exactement le notaire.
  // (Calculer « taux notaire × C1 » serait faux : C1 augmente lui-même avec l'apport.)
  if (agencyFeesMode === '%') {
    const agencyRate = (agencyFees || 0) / 100
    // C1 (budget) : prix × (1 + notaryRate + agencyRate) ≤ c1Base
    c1 = c1Base / (1 + notaryRate + agencyRate)
    // C2 (apport) : l'apport couvre au minimum les frais de notaire (non finançables)
    c2 = personalContribution / notaryRate
    maxPrice = Math.max(0, Math.min(c1, c2))
    agencyFeesAmount = Math.round(maxPrice * agencyRate * 100) / 100
    minApportNeeded = notaryRate * borrowingCapacity / (1 + agencyRate)
  } else {
    agencyFeesAmount = agencyFees || 0
    // C1 (budget) : prix × (1 + notaryRate) ≤ c1Base − frais d'agence fixes
    c1 = Math.max(0, (c1Base - agencyFeesAmount) / (1 + notaryRate))
    // C2 (apport) : l'apport couvre au minimum les frais de notaire (non finançables)
    c2 = personalContribution / notaryRate
    maxPrice = Math.max(0, Math.min(c1, c2))
    minApportNeeded = Math.max(0, notaryRate * (borrowingCapacity - agencyFeesAmount))
  }

  maxPrice = Math.round(maxPrice * 100) / 100
  c1 = Math.round(c1 * 100) / 100
  c2 = Math.round(c2 * 100) / 100
  minApportNeeded = Math.round(minApportNeeded * 100) / 100

  const notaryFees = Math.round(maxPrice * notaryRate * 100) / 100
  const isApportConstrained = personalContribution < minApportNeeded

  // Prêt réellement mobilisé : quand l'apport limite le prix, il ne couvre que les frais de notaire
  // et le prêt finance exactement le prix FAI. Sinon toute la capacité est utilisée.
  // Aucun bien accessible (ex. frais d'agence fixes supérieurs au budget) : rien n'est emprunté.
  let loanUsed = isApportConstrained
    ? Math.round((maxPrice + agencyFeesAmount) * 100) / 100
    : borrowingCapacity
  if (maxPrice === 0) loanUsed = 0
  const unusedCapacity = Math.round((borrowingCapacity - loanUsed) * 100) / 100

  // Des frais d'agence fixes qui absorbent tout le budget : à signaler, ce n'est pas un manque d'apport
  const feesExceedBudget = agencyFeesMode !== '%' && agencyFeesAmount > 0 && totalBudget - agencyFeesAmount <= 0

  // Prix atteignable avec l'apport « minApportNeeded » : le prêt finance alors tout le prix FAI
  const fullCapacityPrice = agencyFeesMode === '%'
    ? Math.round(borrowingCapacity / (1 + (agencyFees || 0) / 100) * 100) / 100
    : Math.max(0, Math.round((borrowingCapacity - agencyFeesAmount) * 100) / 100)

  return { maxPrice, notaryFees, totalBudget, agencyFees: maxPrice === 0 ? 0 : agencyFeesAmount, isApportConstrained, minApportNeeded, c1, c2, loanUsed, unusedCapacity, feesExceedBudget, fullCapacityPrice }
}

/**
 * Calcule le montant à emprunter à partir d'un prix de bien connu.
 * "Prix du bien" = prix net vendeur (hors frais d'agence).
 * coûtTotal = prixNetVendeur + fraisNotaire + fraisAgence
 *
 * Les frais d'agence (FAA) peuvent être financés par le crédit (règle bancaire française).
 * Le prêt est donc plafonné au prix FAI = prix net vendeur + frais d'agence.
 * Les frais de notaire, de dossier et de garantie ne sont pas finançables : ils viennent de l'apport.
 *   montantEmprunt = max(0, min(prixFAI, coûtTotal − apport))
 *
 * fundingGap indique le manque d'apport pour couvrir les frais de notaire et de dossier.
 *
 * @param {number} propertyPrice        - Prix net vendeur (€), hors frais d'agence
 * @param {'ancien'|'neuf'} propertyType - Type de bien
 * @param {number} agencyFees           - Frais d'agence : montant € ou taux %
 * @param {'€'|'%'} agencyFeesMode      - Mode de saisie des frais d'agence
 * @param {number} personalContribution  - Apport personnel (€)
 * @param {number} applicationFees       - Frais de dossier bancaire (€), optionnel
 * @param {number} guaranteeFees         - Frais de garantie, caution ou hypothèque (€), optionnel
 * @returns {{ loanAmount, notaryFees, agencyFees, applicationFees, totalCost, fundingGap, surplus, contributionUsed }}
 *   surplus : part de l'apport qui dépasse le coût total ; contributionUsed : apport réellement mobilisé
 */
export function calculateLoanAmount(propertyPrice, propertyType, agencyFees = 0, agencyFeesMode = '€', personalContribution = 0, applicationFees = 0, guaranteeFees = 0) {
  const notaryRate = NOTARY_FEES[propertyType] || NOTARY_FEES.ancien
  // Les frais de notaire se calculent sur le prix net vendeur (hors agence FAA)
  const notaryFees = Math.round(propertyPrice * notaryRate * 100) / 100

  const agencyFeesAmount = agencyFeesMode === '%'
    ? Math.round(propertyPrice * (agencyFees || 0) / 100 * 100) / 100
    : (agencyFees || 0)

  const appFees = applicationFees || 0
  const guarantee = guaranteeFees || 0
  const totalCost = Math.round((propertyPrice + notaryFees + agencyFeesAmount + appFees + guarantee) * 100) / 100

  // Le prêt peut couvrir prix net vendeur + frais d'agence (= prix FAI)
  // Les frais de notaire et de dossier ne sont pas finançables
  const prixFAI = propertyPrice + agencyFeesAmount
  const loanAmount = Math.max(0, Math.round(Math.min(prixFAI, totalCost - personalContribution) * 100) / 100)

  // Apport manquant pour couvrir la partie non finançable (notaire + dossier + garantie)
  const fundingGap = Math.max(0, Math.round((notaryFees + appFees + guarantee - personalContribution) * 100) / 100)

  // Apport supérieur au coût total : rien à emprunter, et une partie de l'apport reste disponible
  const surplus = Math.max(0, Math.round((personalContribution - totalCost) * 100) / 100)
  const contributionUsed = Math.round((personalContribution - surplus) * 100) / 100

  return { loanAmount, notaryFees, agencyFees: agencyFeesAmount, applicationFees: appFees, guaranteeFees: guarantee, totalCost, fundingGap, surplus, contributionUsed }
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

/**
 * Formate un montant à l'euro près (ex: "241 396 €"). Pour les grands montants (capital, prix, totaux),
 * où les centimes n'apportent rien ; les mensualités gardent formatCurrency.
 * @param {number} amount
 * @returns {string}
 */
export function formatEuros(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formate un taux saisi en pourcentage (ex: 3.5 → "3,5 %").
 * @param {number} value - Taux déjà exprimé en % (3.5 pour 3,5 %)
 * @returns {string}
 */
export function formatPercent(value) {
  const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value)
  return `${number} %`
}

/**
 * Exprime une durée en années et mois (ex: 246 → "20 ans et 6 mois").
 * @param {number} months
 * @returns {string}
 */
export function formatDuration(months) {
  const years = Math.floor(months / 12)
  const rem = months % 12
  const yearsLabel = `${years} an${years > 1 ? 's' : ''}`
  if (years === 0) return `${rem} mois`
  if (rem === 0) return yearsLabel
  return `${yearsLabel} et ${rem} mois`
}
