import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { DocumentSettings } from '../../types'
import { computeTotalsRow } from '../../utils/export'

// A4: 595.28 x 841.89 points
// Compact ruleset per CLAUDE.md — designed to fit ~15-16 rows per page.

export interface DataExportColumn<T> {
  key: keyof T | string
  header: string
  format?: (value: unknown, row: T) => string
  /** When true, this column is summed in the "Totaal" footer row. */
  summable?: boolean
  /** PDF column width in points. If omitted, columns share remaining width equally. */
  width?: number
  /** Text alignment for the column. */
  align?: 'left' | 'right' | 'center'
}

export interface DataExportTemplateProps<T> {
  title: string
  data: T[]
  columns: DataExportColumn<T>[]
  company: DocumentSettings | null
  filterSummary?: string
  brandColor?: string
  brandColorDark?: string
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, obj as unknown)
}

function resolveCell<T>(row: T, col: DataExportColumn<T>): string {
  const raw = typeof col.key === 'string' && col.key.includes('.')
    ? getNestedValue(row as Record<string, unknown>, col.key)
    : (row as Record<string, unknown>)[col.key as string]
  const out = col.format ? col.format(raw, row) : raw
  if (out === null || out === undefined) return ''
  return String(out)
}

function formatGeneratedAt(): string {
  return new Date().toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const buildStyles = (brand: string, brandDark: string) => StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: {
    width: 80,
    height: 'auto',
    maxHeight: 36,
    objectFit: 'contain',
    marginRight: 10,
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7,
    color: '#64748b',
    lineHeight: 1.35,
  },
  headerRight: { alignItems: 'flex-end' },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: brand,
  },
  docMeta: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 3,
  },

  filterBox: {
    borderLeftWidth: 2,
    borderLeftColor: brand,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  filterLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#475569',
  },
  filterText: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.35,
  },

  table: { marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: brandDark,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowEven: { backgroundColor: '#f8fafc' },
  rowOdd: { backgroundColor: '#ffffff' },
  td: {
    fontSize: 7.5,
    paddingHorizontal: 2,
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderTopWidth: 1.5,
    borderTopColor: brand,
  },
  tdTotal: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 2,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: brand,
    paddingTop: 6,
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  footerDetail: {
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.4,
  },
  pageNumber: {
    fontSize: 6.5,
    color: '#64748b',
  },
})

export function DataExportTemplate<T>({
  title,
  data,
  columns,
  company,
  filterSummary,
  brandColor = '#16a34a',
  brandColorDark = '#166534',
}: DataExportTemplateProps<T>) {
  const styles = buildStyles(brandColor, brandColorDark)

  const companyName = company?.company_name || ''
  const companyLines = [
    company?.company_address,
    company?.company_postal_code && company?.company_city
      ? `${company.company_postal_code} ${company.company_city}`
      : null,
    company?.company_phone ? `Tel: ${company.company_phone}` : null,
    company?.company_email,
  ].filter(Boolean).join('\n')

  const footerDetailLines = [
    company?.company_vat_number ? `BTW: ${company.company_vat_number}` : null,
    company?.company_kvk_number ? `KvK: ${company.company_kvk_number}` : null,
    company?.company_website,
  ].filter(Boolean).join(' · ')

  // Default column width: divide remaining width evenly among columns without explicit width
  const PAGE_WIDTH = 595.28 - 28 * 2 // ~539
  const fixedWidth = columns.reduce((sum, c) => sum + (c.width ?? 0), 0)
  const flexCount = columns.filter(c => c.width === undefined).length
  const flexWidth = flexCount > 0 ? Math.max(20, (PAGE_WIDTH - fixedWidth) / flexCount) : 0

  // Footer "Totaal" row (null when no column is summable)
  const totalsRow = computeTotalsRow(data as Record<string, unknown>[], columns as never)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {company?.company_logo_url && (
              <Image src={company.company_logo_url} style={styles.logo} />
            )}
            <View style={styles.companyInfo}>
              {companyName && <Text style={styles.companyName}>{companyName}</Text>}
              {companyLines && (
                <Text style={styles.companyDetail}>{companyLines}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docMeta}>{`Gegenereerd op ${formatGeneratedAt()}`}</Text>
          </View>
        </View>

        {/* FILTER SUMMARY (optional) */}
        {filterSummary ? (
          <View style={styles.filterBox}>
            <Text style={styles.filterText}>
              <Text style={styles.filterLabel}>Filters: </Text>
              {filterSummary}
            </Text>
          </View>
        ) : null}

        {/* TABLE HEADER */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            {columns.map((col, i) => (
              <Text
                key={i}
                style={[
                  styles.th,
                  {
                    width: col.width ?? flexWidth,
                    textAlign: col.align ?? 'left',
                  },
                ]}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {/* ROWS */}
          {data.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[styles.tableRow, rowIdx % 2 === 0 ? styles.rowEven : styles.rowOdd]}
              wrap={false}
            >
              {columns.map((col, colIdx) => (
                <Text
                  key={colIdx}
                  style={[
                    styles.td,
                    {
                      width: col.width ?? flexWidth,
                      textAlign: col.align ?? 'left',
                    },
                  ]}
                >
                  {resolveCell(row, col)}
                </Text>
              ))}
            </View>
          ))}

          {/* TOTALS ROW (only when a column is summable) */}
          {totalsRow && (
            <View style={styles.totalRow} wrap={false}>
              {columns.map((col, colIdx) => (
                <Text
                  key={colIdx}
                  style={[
                    styles.tdTotal,
                    {
                      width: col.width ?? flexWidth,
                      textAlign: col.align ?? 'left',
                    },
                  ]}
                >
                  {totalsRow[colIdx]}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <View>
            {companyName && <Text style={styles.footerCompany}>{companyName}</Text>}
            {footerDetailLines && (
              <Text style={styles.footerDetail}>{footerDetailLines}</Text>
            )}
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export default DataExportTemplate
