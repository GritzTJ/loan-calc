/**
 * Seuils d'usure des prêts immobiliers à taux fixe, publiés chaque trimestre par la Banque de France.
 * Une banque ne peut pas prêter à un TAEG supérieur au seuil de la catégorie du prêt.
 *
 * À METTRE À JOUR CHAQUE TRIMESTRE (avis publié au Journal officiel fin mars, juin, septembre, décembre) :
 * remplacer la période et les trois taux ci-dessous. Passé `validUntil`, l'app signale la valeur comme périmée.
 */
export const USURY = {
  label: '4e trimestre 2026',
  validUntil: '2026-12-31',
  // Catégories par durée du prêt : moins de 10 ans, de 10 à moins de 20 ans, 20 ans et plus
  rates: [
    { maxMonths: 119, rate: 4.09 },
    { maxMonths: 239, rate: 4.68 },
    { maxMonths: Infinity, rate: 5.40 }
  ]
}

/**
 * Seuil d'usure applicable à un prêt de cette durée.
 * @param {number} months - Durée du prêt en mois
 * @returns {number} Seuil (TAEG maximal, en %)
 */
export function usuryRateFor(months) {
  return USURY.rates.find(category => months <= category.maxMonths).rate
}

/**
 * Les seuils embarqués sont-ils ceux d'un trimestre passé ?
 * @param {Date} [today]
 * @returns {boolean}
 */
export function isUsuryOutdated(today = new Date()) {
  return today > new Date(USURY.validUntil + 'T23:59:59')
}
