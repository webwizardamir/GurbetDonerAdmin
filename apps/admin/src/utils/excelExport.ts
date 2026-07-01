// Excel Export utility using exceljs
// Produces styled .xlsx files with green headers, auto-width columns, alternating rows
//
// exceljs (~270 KB gzip) is imported dynamically inside the export function so it
// only loads when the user actually exports — it must never sit in the initial bundle.

interface ExcelColumn<T> {
  header: string
  accessor: (row: T, index: number) => string | number
  /** Optional footer cell. If ANY column defines `total`, a bold "Totaal" row
   *  is appended; columns without it render blank in that row. */
  total?: (rows: T[]) => string | number
}

export async function exportToExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  data: T[]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Data')

  // Add header row
  const headerRow = sheet.addRow(columns.map(c => c.header))
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' },
    }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
    cell.alignment = { vertical: 'middle' }
  })

  // Track max content width per column (start with header lengths)
  const colWidths = columns.map(c => c.header.length)

  // Add data rows
  data.forEach((row, idx) => {
    const values = columns.map(c => c.accessor(row, idx))
    const dataRow = sheet.addRow(values)

    // Alternating row fill
    const isEven = idx % 2 === 0
    dataRow.eachCell((cell, colNumber) => {
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }

      // Right-align currency values
      const val = String(values[colNumber - 1])
      if (val.includes(',') && /\d/.test(val) && !val.includes('@')) {
        cell.alignment = { horizontal: 'right' }
      }

      // Track width
      const len = val.length
      if (len > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = len
      }
    })
  })

  // Totals row (bold, top border) — only when at least one column defines total
  if (columns.some(c => c.total)) {
    const totals = columns.map(c => (c.total ? c.total(data) : ''))
    const totalRow = sheet.addRow(totals)
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true }
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
      const val = String(totals[colNumber - 1])
      if (val.includes(',') && /\d/.test(val) && !val.includes('@')) {
        cell.alignment = { horizontal: 'right' }
      }
      if (val.length > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = val.length
      }
    })
  }

  // Auto-fit column widths (add padding)
  colWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = Math.min(width + 4, 50)
  })

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Re-export format helpers from csvExport for use in column definitions
export { formatCentsToCsvCurrency, formatCsvPercentage } from './csvExport'
