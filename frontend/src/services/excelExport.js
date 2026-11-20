import { utils, writeFileXLSX } from 'xlsx'
import { formatDate } from './loanCalculator.js'

/**
 * Exporte un ou plusieurs tableaux d'amortissement en fichier .xlsx, une feuille par tableau.
 * @param {Array<{ name: string, rows: Array }>} sheets - Nom de la feuille et lignes du tableau
 */
export function exportAmortizationToXlsx(sheets) {
  const wb = utils.book_new()
  const usedNames = new Set()

  for (const sheet of sheets) {
    const { rows } = sheet
    // Les colonnes Assurance et Remboursement anticipé n'apparaissent que si elles servent
    const hasInsurance = rows.some(row => row.insurancePart > 0)
    const hasExtra = rows.some(row => row.extraPayment > 0)
    const data = rows.map(row => ({
      'N°': row.number,
      'Date': formatDate(row.date),
      'Capital restant dû (€)': row.remainingPrincipal,
      'Part capital (€)': row.principalPart,
      'Part intérêts (€)': row.interestPart,
      'Mensualité de crédit (€)': row.payment,
      ...(hasInsurance ? { 'Assurance (€)': row.insurancePart, 'Total payé (€)': row.totalPayment } : {}),
      ...(hasExtra ? { 'Remboursement anticipé (€)': row.extraPayment, 'Indemnités (€)': row.penalty } : {})
    }))

    const ws = utils.json_to_sheet(data)
    // Largeurs de colonnes pour la lisibilité : N°, date, puis les montants
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, ...Array(8).fill({ wch: 24 })]

    // Excel refuse les noms de feuille de plus de 31 caractères, certains signes, et les doublons
    let name = sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28)
    while (usedNames.has(name)) name += ' 2'
    usedNames.add(name)
    utils.book_append_sheet(wb, ws, name)
  }

  writeFileXLSX(wb, 'tableau-amortissement.xlsx')
}
