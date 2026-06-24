/**
 * Generic Excel (.xlsx) reader. Lazy-loads ExcelJS the same way the rest of
 * the app does for writing.
 *
 * Verifies that all `expectedHeaders` exist in row 1 (case-insensitive,
 * trimmed), then returns each subsequent row as an object keyed by the
 * actual headers as they appear in the file.
 *
 * Reusable: Phase 1 uses this for product import; Phase 2 will use it for
 * price-list import.
 */

export interface ParsedExcelRow {
  [header: string]: unknown
  /** 1-based row number from the source workbook (row 2 = first data row). */
  __rowNumber: number
}

export interface ReadExcelResult {
  rows: ParsedExcelRow[]
  /** Structural errors that mean we can't trust the data at all. */
  parseErrors: string[]
  /** Headers as they actually appear in row 1 of the file. */
  actualHeaders: string[]
}

const normalize = (s: string): string => s.trim().toLowerCase()

export async function readExcelFile(
  file: File,
  expectedHeaders: string[],
): Promise<ReadExcelResult> {
  const parseErrors: string[] = []
  const rows: ParsedExcelRow[] = []

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  const buffer = await file.arrayBuffer()
  try {
    await workbook.xlsx.load(buffer)
  } catch (e) {
    parseErrors.push(`Could not read Excel file: ${(e as Error).message}`)
    return { rows, parseErrors, actualHeaders: [] }
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    parseErrors.push('Excel file contains no worksheets.')
    return { rows, parseErrors, actualHeaders: [] }
  }

  // Row 1 = headers
  const headerRow = sheet.getRow(1)
  const actualHeaders: string[] = []
  headerRow.eachCell({ includeEmpty: false }, cell => {
    const v = cell.value
    actualHeaders.push(typeof v === 'string' ? v : String(v ?? ''))
  })

  // Verify required headers are present (case-insensitive, trimmed)
  const normalizedActual = actualHeaders.map(normalize)
  const missing = expectedHeaders.filter(h => !normalizedActual.includes(normalize(h)))
  if (missing.length > 0) {
    parseErrors.push(`Missing required columns: ${missing.join(', ')}`)
    return { rows, parseErrors, actualHeaders }
  }

  // Read data rows
  const lastRow = sheet.actualRowCount
  for (let r = 2; r <= lastRow; r++) {
    const sourceRow = sheet.getRow(r)
    // Skip rows that are entirely empty
    let hasAny = false
    const obj: ParsedExcelRow = { __rowNumber: r }
    actualHeaders.forEach((header, idx) => {
      const cell = sourceRow.getCell(idx + 1)
      const v = cell.value
      if (v !== null && v !== undefined && v !== '') {
        hasAny = true
        // Resolve formula results to their computed value
        if (typeof v === 'object' && v !== null && 'result' in v) {
          obj[header] = (v as { result: unknown }).result
        } else if (typeof v === 'object' && v !== null && 'richText' in v) {
          // Rich text — flatten to plain string
          obj[header] = (v as { richText: Array<{ text: string }> }).richText
            .map(t => t.text).join('')
        } else {
          obj[header] = v
        }
      } else {
        obj[header] = null
      }
    })
    if (hasAny) rows.push(obj)
  }

  return { rows, parseErrors, actualHeaders }
}

/** Helper: get a value from a parsed row by template-spec header (case-insensitive). */
export function getValue(row: ParsedExcelRow, header: string): unknown {
  const want = normalize(header)
  for (const k of Object.keys(row)) {
    if (k === '__rowNumber') continue
    if (normalize(k) === want) return row[k]
  }
  return null
}

/**
 * CSV/XLSX formula-injection guard.
 *
 * Excel and Google Sheets interpret a cell whose value starts with =, +, -, @,
 * tab, or carriage return as a formula. An attacker who can write text into
 * a row (e.g. a product name) can craft a value like `=cmd|'/c calc'!A1` or
 * `=HYPERLINK(...)` that executes / phishes when the row round-trips through
 * a re-exported sheet. Prefixing with a single quote neutralises this without
 * affecting display in spreadsheet apps.
 *
 * Call this on every string field read from an Excel import before writing
 * to the DB. Returns non-string values unchanged.
 */
export function sanitizeCellValue(v: unknown): unknown {
  if (typeof v !== 'string') return v
  if (v.length === 0) return v
  const first = v.charCodeAt(0)
  // = (61), + (43), - (45), @ (64), \t (9), \r (13)
  if (first === 61 || first === 43 || first === 45 || first === 64 || first === 9 || first === 13) {
    return `'${v}`
  }
  return v
}
