import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { InvoiceData } from '../../services/documents'
import { getDocText } from '../../services/documentLabels'
import { buildAddressLines } from '../../utils/address'
import { docBrand } from './brandPalette'

// A4: 595.28 x 841.89 points
// Using Helvetica (built-in) for all text

const styles = StyleSheet.create({
  // PAGE
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
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
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: 4,
    paddingHorizontal: 10,
  },

  // INFO ROW
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: docBrand.packingSlip.accent,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  customerDetail: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.35,
  },
  metaBox: {
    width: '40%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    paddingVertical: 1,
  },
  metaLabel: {
    fontSize: 7.5,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 8,
  },

  // ITEMS TABLE
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: '#f8fafc',
  },
  rowOdd: {
    backgroundColor: '#ffffff',
  },
  td: {
    fontSize: 8,
  },
  tdBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  // Column widths
  colIdx: { width: 28, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 70, textAlign: 'center' },
  colCheck: { width: 40, textAlign: 'center' },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: '#94a3b8',
    marginHorizontal: 'auto',
  },

  // TOTAL (quantity summary, per unit type)
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  totalsBox: {
    minWidth: '45%',
    maxWidth: '70%',
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
    backgroundColor: '#f8fafc',
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textAlign: 'right',
    marginLeft: 10,
  },

  // DELIVERY NOTES (compact)
  notesSection: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 2,
    borderLeftColor: '#fcd34d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 7.5,
    color: '#92400e',
  },

  // SIGNATURE SECTION
  signatureSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  signatureBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
    padding: 7,
  },
  signatureTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sigField: {
    marginBottom: 5,
  },
  sigLabel: {
    fontSize: 6.5,
    color: '#64748b',
    marginBottom: 1,
  },
  sigLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#94a3b8',
    borderStyle: 'dashed',
    height: 11,
  },

  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 1,
  },
  footerDetail: {
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.4,
  },
})

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface PackingSlipTemplateProps {
  data: InvoiceData
}

export function PackingSlipTemplate({ data }: PackingSlipTemplateProps) {
  const T = getDocText(data.lang)
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email

  // Build the address lines (country merged into city line). This box is
  // labelled "Afleveradres" and travels with the goods, so it must show the
  // DELIVERY address when the customer has a separate one (e.g. invoicing to a
  // Postbus) — falling back to billing, which is all we had before.
  const customerLines: string[] = []
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson)
  const shipTo = data.customer.deliveryAddress
  if (shipTo) {
    customerLines.push(...buildAddressLines(shipTo))
  } else {
    if (data.customer.street) customerLines.push(data.customer.street)
    const cityParts: string[] = []
    if (data.customer.postalCode && data.customer.city) {
      cityParts.push(`${data.customer.postalCode} ${data.customer.city}`)
    } else if (data.customer.city) {
      cityParts.push(data.customer.city)
    }
    if (data.customer.country && data.customer.country !== data.customer.city) {
      cityParts.push(data.customer.country)
    }
    if (cityParts.length) customerLines.push(cityParts.join(', '))
  }

  // Quantity total, grouped by unit type. A packing slip carries no prices, so
  // the "total" is the summed quantity per unit (kg / doos / stuks / ...). Only
  // the unit types actually present are listed — a box-only slip shows just
  // boxes, a kg-only slip just kg, mixed slips list each. First-seen order.
  const isEn = data.lang === 'en'
  const formatUnit = (unitType: string, quantity: number): string => {
    const one = quantity === 1
    switch (unitType?.toLowerCase()) {
      case 'kg':
        return 'kg'
      case 'piece':
        return isEn ? (one ? 'pc' : 'pcs') : one ? 'stuk' : 'stuks'
      case 'zak':
        return isEn ? (one ? 'bag' : 'bags') : one ? 'zak' : 'zakken'
      case 'doos':
        return isEn ? (one ? 'box' : 'boxes') : one ? 'doos' : 'dozen'
      case 'package':
        return isEn ? (one ? 'pack' : 'packs') : one ? 'pak' : 'pakken'
      default:
        return unitType
    }
  }
  const fmtQty = (n: number): string =>
    Number.isInteger(n)
      ? String(n)
      : n.toLocaleString(isEn ? 'en-US' : 'nl-NL', { maximumFractionDigits: 3 })

  const unitOrder: string[] = []
  const qtyByUnit = new Map<string, number>()
  for (const it of data.items) {
    const key = (it.unitType || it.unit || '').toLowerCase()
    if (!qtyByUnit.has(key)) {
      qtyByUnit.set(key, 0)
      unitOrder.push(key)
    }
    qtyByUnit.set(key, (qtyByUnit.get(key) ?? 0) + (Number(it.quantity) || 0))
  }
  const totalParts = unitOrder.map((u) => {
    const qty = qtyByUnit.get(u) ?? 0
    return `${fmtQty(qty)} ${formatUnit(u, qty)}`
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.company.logoUrl && (
              <Image src={data.company.logoUrl} style={styles.logo} />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{data.company.name}</Text>
              {hasCompanyDetails && (
                <Text style={styles.companyDetail}>
                  {[
                    data.company.address,
                    data.company.postalCode && data.company.city
                      ? `${data.company.postalCode} ${data.company.city}`
                      : null,
                    data.company.phone ? `Tel: ${data.company.phone}` : null,
                  ].filter(Boolean).join('\n')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>{data.labels.documentTitle}</Text>
            <Text style={styles.docNumber}>{data.documentNumber}</Text>
          </View>
        </View>

        {/* ========== DELIVERY ADDRESS + METADATA ========== */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>{T.addrDelivery}</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.metaOrderNumberShort}</Text>
              <Text style={styles.metaValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{data.labels.date}:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.metaArticles}</Text>
              <Text style={styles.metaValue}>{data.items.length}</Text>
            </View>
          </View>
        </View>

        {/* ========== ITEMS TABLE (No prices) ========== */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colIdx]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>{T.thDescription}</Text>
            <Text style={[styles.th, styles.colQty]}>{T.thQty}</Text>
            <Text style={[styles.th, styles.colCheck]}>{T.thCheck}</Text>
          </View>
          {data.items.map((item, idx) => (
            <View
              key={idx}
              wrap={false}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
              ]}
            >
              <Text style={[styles.td, styles.colIdx]}>{item.index}</Text>
              <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tdBold, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
              <View style={styles.colCheck}>
                <View style={styles.checkbox} />
              </View>
            </View>
          ))}
        </View>

        {/* ========== TOTAL (quantity per unit type) ========== */}
        {totalParts.length > 0 && (
          <View style={styles.totalsWrap} wrap={false}>
            <View style={styles.totalsBox}>
              <Text style={styles.totalsLabel}>{T.psTotalLabel}</Text>
              <Text style={styles.totalsValue}>{totalParts.join(',  ')}</Text>
            </View>
          </View>
        )}

        {/* ========== DELIVERY NOTES ========== */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>{T.psNotesTitle}</Text>
          <Text style={styles.notesText}>
            {T.psNotesText}
          </Text>
        </View>

        {/* Spacer: pin the signatures + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* ========== SIGNATURES ========== */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>{T.psSender}</Text>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.name}</Text>
              <View style={styles.sigLine} />
            </View>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.signature}</Text>
              <View style={styles.sigLine} />
            </View>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>{T.psReceiver}</Text>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.name}</Text>
              <View style={styles.sigLine} />
            </View>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.signature}</Text>
              <View style={styles.sigLine} />
            </View>
          </View>
        </View>

        {/* ========== FOOTER ========== */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerCompany}>{data.company.name}</Text>
              <Text style={styles.footerDetail}>
                {[
                  data.company.address,
                  data.company.postalCode && data.company.city
                    ? `${data.company.postalCode} ${data.company.city}`
                    : null,
                ].filter(Boolean).join(', ')}
              </Text>
            </View>
            <View>
              <Text style={styles.footerDetail}>
                {[
                  data.company.phone && `Tel: ${data.company.phone}`,
                  data.company.email,
                ].filter(Boolean).join('  |  ')}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default PackingSlipTemplate
