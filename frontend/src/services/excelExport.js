import { utils, writeFileXLSX } from 'xlsx'
import { formatDate } from './loanCalculator.js'

/**
 * Exporte le tableau d'amortissement en fichier .xlsx
 * @param {Array} rows - Lignes du tableau d'amortissement
 */
export function exportAmortizationToXlsx(rows) {
  // La colonne Assurance n'apparaît que si le prêt est assuré
  const hasInsurance = rows.some(row => row.insurancePart > 0)
  const data = rows.map(row => ({
    'N°': row.number,
    'Date': formatDate(row.date),
    'Capital restant dû (€)': row.remainingPrincipal,
    'Part capital (€)': row.principalPart,
    'Part intérêts (€)': row.interestPart,
    'Mensualité de crédit (€)': row.payment,
    ...(hasInsurance ? { 'Assurance (€)': row.insurancePart, 'Total payé (€)': row.totalPayment } : {})
  }))

  const ws = utils.json_to_sheet(data)

  // Largeurs de colonnes pour la lisibilité
  ws['!cols'] = [
    { wch: 5 },   // N°
    { wch: 12 },  // Date
    { wch: 22 },  // Capital restant dû
    { wch: 18 },  // Part capital
    { wch: 18 },  // Part intérêts
    { wch: 22 },  // Mensualité de crédit
    { wch: 14 },  // Assurance
    { wch: 16 }   // Total payé
  ]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Amortissement')
  writeFileXLSX(wb, 'tableau-amortissement.xlsx')
}
