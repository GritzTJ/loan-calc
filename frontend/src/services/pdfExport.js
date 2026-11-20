import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Les polices intégrées à un PDF (Helvetica) ne connaissent pas les espaces insécables que produit
// le formatage français des nombres (« 200 000 € »), ni « ≈ » : ils s'afficheraient en caractères parasites.
const clean = (value) => String(value ?? '').replace(/[  ]/g, ' ').replace(/≈\s*/g, 'env. ')

/**
 * Génère une synthèse en PDF (A4) et la télécharge : un titre, des sections « libellé : valeur »,
 * et éventuellement un tableau.
 *
 * @param {Object} doc
 * @param {string} doc.title
 * @param {string} [doc.subtitle]
 * @param {Array<{ heading: string, rows: Array<[string, string]> }>} doc.sections
 * @param {{ heading: string, head: string[], body: Array<string[]> }} [doc.table]
 * @param {string} [doc.note] - Mention en fin de document
 * @param {string} doc.filename
 */
export function exportSummaryPdf({ title, subtitle, sections, table, note, filename }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const ink = [29, 39, 49]
  const muted = [95, 108, 120]

  pdf.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...ink)
  pdf.text(clean(title), margin, 22)
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted)
  if (subtitle) pdf.text(clean(subtitle), margin, 29)

  let y = subtitle ? 36 : 30
  const tableStyle = {
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 10, textColor: ink, cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 } },
    headStyles: { fillColor: [232, 237, 240], textColor: ink, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 249, 250] }
  }

  for (const section of sections) {
    autoTable(pdf, {
      ...tableStyle,
      startY: y,
      head: [[{ content: clean(section.heading), colSpan: 2 }]],
      body: section.rows.map(([label, value]) => [clean(label), clean(value)]),
      columnStyles: { 0: { textColor: muted }, 1: { halign: 'right', fontStyle: 'bold' } }
    })
    y = pdf.lastAutoTable.finalY + 6
  }

  if (table) {
    autoTable(pdf, {
      ...tableStyle,
      startY: y,
      styles: { ...tableStyle.styles, fontSize: 9 },
      head: [[{ content: clean(table.heading), colSpan: table.head.length }], table.head.map(clean)],
      body: table.body.map(row => row.map(clean)),
      // Première colonne à gauche, montants à droite
      columnStyles: Object.fromEntries(table.head.map((_, i) => [i, { halign: i === 0 ? 'left' : 'right' }])),
      didParseCell: (data) => { if (data.section === 'head' && data.row.index === 1 && data.column.index > 0) data.cell.styles.halign = 'right' }
    })
    y = pdf.lastAutoTable.finalY + 6
  }

  // Pied de page : mention et numérotation
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted)
    if (note) pdf.text(pdf.splitTextToSize(clean(note), 150), margin, 287)
    pdf.text(`${page} / ${pages}`, 210 - margin, 287, { align: 'right' })
  }

  pdf.save(filename)
}
