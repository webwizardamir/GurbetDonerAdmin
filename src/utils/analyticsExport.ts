// Analytics overview export: the whole tab as a PDF (charts included, captured
// from the rendered DOM) and a data-only Excel workbook.

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

/**
 * Capture a DOM node (the rendered overview, charts and all) and save it as a
 * multi-page A4 PDF. Uses html-to-image (renders via the browser, so it copes
 * with SVG charts and Tailwind v4 oklch colors) then slices the tall image
 * across pages with jsPDF.
 */
export async function exportOverviewPdf(
  node: HTMLElement,
  filename: string,
  opts: { backgroundColor?: string } = {},
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: opts.backgroundColor ?? '#ffffff',
  })

  const img = new Image()
  img.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('image load failed'))
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (img.height * pageW) / img.width // scaled to full page width

  // Draw the full-height image once per page, shifted up, so each page shows
  // the next slice (jsPDF clips drawing to the page bounds).
  let heightLeft = imgH
  let position = 0
  pdf.addImage(dataUrl, 'PNG', 0, position, pageW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(dataUrl, 'PNG', 0, position, pageW, imgH)
    heightLeft -= pageH
  }
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export interface OverviewExcelSection {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

/**
 * One styled .xlsx with the overview's KPI summary and table sections stacked
 * on a single sheet (charts are not representable in a spreadsheet).
 */
export async function exportOverviewExcel(
  filename: string,
  sheetName: string,
  sections: OverviewExcelSection[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  let maxCols = 1

  for (const section of sections) {
    maxCols = Math.max(maxCols, section.headers.length)
    const titleRow = sheet.addRow([section.title])
    titleRow.getCell(1).font = { bold: true, size: 12 }

    const headerRow = sheet.addRow(section.headers)
    headerRow.eachCell((cell, col) => {
      if (col > section.headers.length) return
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
      cell.alignment = { vertical: 'middle' }
    })

    for (const row of section.rows) sheet.addRow(row)
    sheet.addRow([]) // spacer between sections
  }

  // Reasonable column widths.
  for (let c = 1; c <= maxCols; c++) {
    sheet.getColumn(c).width = c === 1 ? 32 : 16
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
