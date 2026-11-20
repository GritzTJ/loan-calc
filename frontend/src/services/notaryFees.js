/**
 * Frais de notaire (frais d'acquisition) au barème détaillé.
 *
 * Quatre composantes :
 *   - droits de mutation, versés à l'État et aux collectivités : l'essentiel des frais dans l'ancien ;
 *   - émoluments du notaire, barème dégressif par tranches (art. A444-91 du Code de commerce), + TVA ;
 *   - contribution de sécurité immobilière ;
 *   - formalités et débours, variables selon le dossier : estimation forfaitaire.
 *
 * C'est une estimation : seul le décompte du notaire fait foi (il peut aussi consentir une remise
 * sur ses émoluments au-delà de 100 000 €).
 */

// Émoluments proportionnels : taux appliqué à la part du prix comprise dans chaque tranche
const EMOLUMENT_BRACKETS = [
  { upTo: 6500, rate: 0.0387 },
  { upTo: 17000, rate: 0.01596 },
  { upTo: 60000, rate: 0.01064 },
  { upTo: Infinity, rate: 0.00799 }
]
const VAT = 0.20

// Droits de mutation dans l'ancien, en % du prix. Total = taxe départementale + taxe communale (1,20 %)
// + frais d'assiette (2,37 % de la taxe départementale).
//   majoré : taxe départementale à 5 %, votée par la plupart des départements (loi de finances 2025,
//            actes signés jusqu'au printemps 2028). Les primo-accédants en sont exemptés.
//   normal : taxe départementale à 4,5 %.
//   réduit : taxe départementale à 3,8 %, dans quelques départements.
export const DMTO_RATES = [
  { value: 'majore', label: '6,32 %', rate: 6.3185 },
  { value: 'normal', label: '5,81 %', rate: 5.80665 },
  { value: 'reduit', label: '5,09 %', rate: 5.09006 }
]
export const DEFAULT_DMTO = 'majore'

// Neuf (vente par un professionnel, soumise à TVA) : taxe de publicité foncière à taux réduit
const NEW_BUILD_DUTY_RATE = 0.71498

// Contribution de sécurité immobilière : 0,10 % du prix, 15 € au minimum
const CSI_RATE = 0.001
const CSI_MINIMUM = 15

// Formalités et débours (cadastre, états hypothécaires, copies…) : ordre de grandeur usuel
const DISBURSEMENTS = 1200

const round = (x) => Math.round(x * 100) / 100

/**
 * @param {number} price - Prix sur lequel portent les frais (prix net vendeur) (€)
 * @param {'ancien'|'neuf'} propertyType
 * @param {'majore'|'normal'|'reduit'} [dmtoRate] - Droits de mutation appliqués (ancien uniquement)
 * @returns {{ total, duties, dutyRate, emoluments, csi, disbursements, effectiveRate }}
 *   montants en €, dutyRate et effectiveRate (total / prix) en %
 */
export function calculateNotaryFees(price, propertyType, dmtoRate = DEFAULT_DMTO) {
  if (!(price > 0)) {
    return { total: 0, duties: 0, dutyRate: 0, emoluments: 0, csi: 0, disbursements: 0, effectiveRate: 0 }
  }

  const dutyRate = propertyType === 'neuf'
    ? NEW_BUILD_DUTY_RATE
    : (DMTO_RATES.find(r => r.value === dmtoRate) ?? DMTO_RATES[0]).rate
  const duties = round(price * dutyRate / 100)

  let emolumentsBeforeTax = 0
  let lowerBound = 0
  for (const bracket of EMOLUMENT_BRACKETS) {
    if (price <= lowerBound) break
    emolumentsBeforeTax += (Math.min(price, bracket.upTo) - lowerBound) * bracket.rate
    lowerBound = bracket.upTo
  }
  const emoluments = round(emolumentsBeforeTax * (1 + VAT))

  const csi = round(Math.max(CSI_MINIMUM, price * CSI_RATE))
  const total = round(duties + emoluments + csi + DISBURSEMENTS)

  return { total, duties, dutyRate, emoluments, csi, disbursements: DISBURSEMENTS, effectiveRate: round(total / price * 100) }
}

const euros = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)

/**
 * Détail des frais en une phrase, pour les info-bulles.
 * @param {ReturnType<typeof calculateNotaryFees>} fees
 * @returns {string}
 */
export function describeNotaryFees(fees) {
  if (!fees.total) return 'Aucun frais sans prix'
  const rate = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(fees.dutyRate)
  return `Droits de mutation ${euros(fees.duties)} (${rate} %) + émoluments ${euros(fees.emoluments)} `
    + `+ sécurité immobilière ${euros(fees.csi)} + formalités ${euros(fees.disbursements)} (estimation)`
}
