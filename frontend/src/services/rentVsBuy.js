/**
 * Louer ou acheter : compare le patrimoine net dans les deux cas, année après année.
 *
 * Principe : les deux scénarios disposent du même budget mensuel, celui du plus coûteux des deux ce mois-là.
 * Celui qui dépense moins place la différence. Le locataire place aussi, dès le départ, l'argent que
 * l'acheteur consacre à son achat (apport).
 *
 *   Patrimoine de l'acheteur  = valeur du bien − capital restant dû + épargne éventuelle
 *   Patrimoine du locataire   = épargne (apport placé + économies mensuelles)
 *
 * Ne sont pas comptés : les frais de revente, la fiscalité de l'épargne et les gros travaux.
 */
import { generateAmortizationTable } from './loanCalculator.js'
import { calculateNotaryFees } from './notaryFees.js'

export const MAX_HORIZON_YEARS = 40

const round = (x) => Math.round(x * 100) / 100

/**
 * @param {Object} input
 * @param {number} input.price - Prix du bien (€)
 * @param {number} input.contribution - Apport (€)
 * @param {'ancien'|'neuf'} [input.propertyType]
 * @param {string} [input.dmtoRate] - Droits de mutation (ancien)
 * @param {number} input.annualRate - Taux du prêt (%)
 * @param {number} input.months - Durée du prêt (mois)
 * @param {number} [input.insuranceRate] - Assurance emprunteur (% / an, sur le capital initial)
 * @param {number} [input.ownerCharges] - Charges de propriétaire : taxe foncière, copropriété, entretien (€ / an)
 * @param {number} input.rent - Loyer actuel, charges comprises (€ / mois)
 * @param {number} [input.rentGrowth] - Hausse annuelle du loyer et des charges (%)
 * @param {number} [input.appreciation] - Valorisation annuelle du bien (%)
 * @param {number} [input.savingsReturn] - Rendement annuel de l'épargne (%)
 * @param {number} [input.horizonYears] - Nombre d'années projetées
 * @param {(price: number) => number} [input.notaryFeesOf] - Frais de notaire de remplacement (tests)
 * @returns {{ notaryFees, loanAmount, monthlyPayment, years: Array<{ year, buy, rent, propertyValue, remainingLoan }>,
 *   breakEvenYear: number|null }}
 *   breakEvenYear : première année à partir de laquelle acheter reste plus avantageux jusqu'à l'horizon
 */
export function compareRentAndBuy(input) {
  const {
    price, contribution = 0, propertyType = 'ancien', dmtoRate, annualRate, months,
    insuranceRate = 0, ownerCharges = 0, rent = 0, rentGrowth = 0, appreciation = 0, savingsReturn = 0
  } = input
  const horizonYears = Math.min(MAX_HORIZON_YEARS, Math.max(1, Math.round(input.horizonYears || 25)))

  const notaryFees = input.notaryFeesOf ? input.notaryFeesOf(price) : calculateNotaryFees(price, propertyType, dmtoRate).total
  // L'apport paie d'abord les frais de notaire ; ce qui manque pour le prix est emprunté.
  // Un apport supérieur au coût total laisse un reste, que l'acheteur place.
  const loanAmount = Math.max(0, round(price + notaryFees - contribution))
  const table = generateAmortizationTable(loanAmount, annualRate, months, new Date(), { insuranceRate })

  const monthlyReturn = Math.pow(1 + savingsReturn / 100, 1 / 12) - 1
  let buyerSavings = Math.max(0, contribution - price - notaryFees)
  // Le locataire garde l'argent que l'acheteur met dans son achat
  let renterSavings = Math.min(contribution, price + notaryFees)

  const years = []
  for (let year = 1; year <= horizonYears; year++) {
    const inflation = Math.pow(1 + rentGrowth / 100, year - 1)
    const monthlyRent = rent * inflation
    const monthlyCharges = ownerCharges * inflation / 12
    for (let month = 0; month < 12; month++) {
      const row = table[(year - 1) * 12 + month]
      const buyOutflow = (row?.totalPayment || 0) + monthlyCharges
      // Même budget pour les deux : le moins dépensier place la différence
      const budget = Math.max(buyOutflow, monthlyRent)
      buyerSavings = buyerSavings * (1 + monthlyReturn) + (budget - buyOutflow)
      renterSavings = renterSavings * (1 + monthlyReturn) + (budget - monthlyRent)
    }
    const propertyValue = price * Math.pow(1 + appreciation / 100, year)
    const remainingLoan = table[year * 12 - 1]?.remainingPrincipal ?? 0
    years.push({
      year,
      buy: round(propertyValue - remainingLoan + buyerSavings),
      rent: round(renterSavings),
      propertyValue: round(propertyValue),
      remainingLoan
    })
  }

  // Acheter devient plus avantageux… et le reste : on cherche la dernière année où louer gagne encore
  const lastRentWin = years.findLastIndex(y => y.rent > y.buy)
  const breakEvenYear = lastRentWin === years.length - 1 ? null : years[lastRentWin + 1].year

  return { notaryFees, loanAmount, monthlyPayment: table[0]?.totalPayment ?? 0, years, breakEvenYear }
}
