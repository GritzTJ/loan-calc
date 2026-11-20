/**
 * Analyse d'une saisie numérique libre (frappe ou collage).
 *
 * Accepte la virgule ou le point comme séparateur décimal, et les séparateurs de milliers usuels :
 * « 200 000 », « 200.000 », « 1.234,56 », « 1,234.56 ». Sans cela, « 200.000 » était lu 200.
 *
 * @param {string} text - Texte du champ
 * @param {number} decimals - Décimales autorisées (0 = champ entier)
 * @returns {{ value: number|null, rewritten: boolean }}
 *   value : nombre retenu, ou null si le texte n'est pas un nombre
 *   rewritten : true si des décimales ont été écartées (le champ doit alors afficher la valeur retenue)
 */
export function parseNumberInput(text, decimals = 0) {
  // Espaces (y compris insécables) et apostrophes : séparateurs de milliers
  let cleaned = String(text ?? '').replace(/[\s  ']/g, '')
  if (!cleaned) return { value: null, rewritten: false }

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let decimalSeparator = null

  if (lastComma !== -1 && lastDot !== -1) {
    // Les deux présents : le dernier est le séparateur décimal, l'autre groupe les milliers
    decimalSeparator = lastComma > lastDot ? ',' : '.'
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? ',' : '.'
    const count = cleaned.split(separator).length - 1
    // Un point suivi d'exactement trois chiffres dans un champ entier (« 200.000 ») groupe les milliers.
    // Dans un champ décimal, « 3.500 » reste un taux : 3,5.
    const dotGroupsThousands = separator === '.' && decimals === 0 && /^\d{1,3}\.\d{3}$/.test(cleaned)
    // Répété (« 1.234.567 »), il ne peut être que séparateur de milliers
    if (count === 1 && !dotGroupsThousands) decimalSeparator = separator
  }

  const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
  cleaned = cleaned.split(decimalSeparator === null ? /[.,]/ : thousandsSeparator).join('')
  if (decimalSeparator === ',') cleaned = cleaned.replace(',', '.')

  if (!/^-?\d*\.?\d*$/.test(cleaned) || !/\d/.test(cleaned)) return { value: null, rewritten: false }

  const number = parseFloat(cleaned)
  if (decimals === 0) {
    // Champ entier : la partie décimale est écartée (et non arrondie en silence)
    return { value: Math.trunc(number), rewritten: cleaned.includes('.') }
  }
  const factor = Math.pow(10, decimals)
  return { value: Math.round(number * factor) / factor, rewritten: false }
}
