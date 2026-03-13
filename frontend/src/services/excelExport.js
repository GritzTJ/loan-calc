import { utils, writeFileXLSX } from 'xlsx'
import { formatDate } from './loanCalculator.js'

/**
 * Exporte le tableau d'amortissement en fichier .xlsx
 * @param {Array} rows - Lignes du tableau d'amortissement
 */
export function exportAmortizationToXlsx(rows) {
  const data = rows.map(row => ({
    'N°': row.number,
    'Date': formatDate(row.date),
    'Capital restant dû (€)': Math.round(row.remainingPrincipal * 100) / 100,
    'Part capital (€)': Math.round(row.principalPart * 100) / 100,
    'Part intérêts (€)': Math.round(row.interestPart * 100) / 100,
    'Mensualité (€)': Math.round(row.payment * 100) / 100
  }))

  const ws = utils.json_to_sheet(data)

  // Largeurs de colonnes pour la lisibilité
  ws['!cols'] = [
    { wch: 5 },   // N°
    { wch: 12 },  // Date
    { wch: 22 },  // Capital restant dû
    { wch: 18 },  // Part capital
    { wch: 18 },  // Part intérêts
    { wch: 16 }   // Mensualité
  ]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Amortissement')
  writeFileXLSX(wb, 'tableau-amortissement.xlsx')
}
