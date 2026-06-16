import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { InvoiceData } from '../../services/documents'
import { formatPrice, formatDate } from '../../utils/format'

// A4: 595.28 x 841.89 points
// Using Helvetica (built-in) for all text

const styles = StyleSheet.create({
  // ===========================================
  // PAGE
  // ===========================================
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // ===========================================
  // HEADER
  // ===========================================
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
    color: '#16a34a',
  },

  // ===========================================
  // INFO ROW (Customer + Metadata)
  // ===========================================
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: '#22c55e',
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
  metaValueDue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },

  // ===========================================
  // REVERSE-CHARGE NOTICE (single-line, professional)
  // ===========================================
  verlegdBox: {
    borderLeftWidth: 2,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  verlegdText: {
    fontSize: 7.5,
    color: '#78350f',
    lineHeight: 1.35,
  },
  verlegdLabel: {
    fontFamily: 'Helvetica-Bold',
  },

  // ===========================================
  // ITEMS TABLE
  // ===========================================
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#166534',
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowEven: {
    backgroundColor: '#f8fafc',
  },
  rowOdd: {
    backgroundColor: '#ffffff',
  },
  td: {
    fontSize: 7.5,
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Column widths
  colNum: { width: 18, textAlign: 'right', paddingRight: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colNote: { width: 62, paddingRight: 6 },
  colUnitPrice: { width: 62, textAlign: 'right', paddingRight: 6 },
  colQty: { width: 52, textAlign: 'left', paddingLeft: 4 },
  colExclVat: { width: 66, textAlign: 'right', paddingRight: 6 },
  colVatAmt: { width: 50, textAlign: 'right', paddingRight: 6 },
  colInclVat: { width: 66, textAlign: 'right' },

  // ===========================================
  // BOTTOM SECTION
  // ===========================================
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Left: Payment + Receipt
  leftColumn: {
    width: '55%',
    flexDirection: 'row',
    gap: 6,
  },
  actionBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderTopWidth: 2,
    borderTopColor: '#16a34a',
    padding: 6,
  },
  actionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: '#94a3b8',
    marginRight: 5,
  },
  paymentLabel: {
    fontSize: 7.5,
    color: '#1e293b',
  },
  sigField: {
    marginBottom: 4,
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
    height: 10,
  },

  // Right: Totals
  rightColumn: {
    width: '40%',
  },
  totalsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderTopWidth: 2,
    borderTopColor: '#16a34a',
    padding: 7,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 7.5,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 7.5,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: '#16a34a',
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#16a34a',
  },

  // ===========================================
  // PAYMENT TERMS
  // ===========================================
  paymentTerms: {
    backgroundColor: '#dcfce7',
    borderWidth: 0.5,
    borderColor: '#16a34a',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  paymentTermsText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    textAlign: 'center',
  },

  // ===========================================
  // FOOTER
  // ===========================================
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#16a34a',
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
  footerIban: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  footerSeparator: {
    fontSize: 7,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  footerCenter: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },
})

interface InvoiceTemplateProps {
  data: InvoiceData
}

// The invoice page body WITHOUT the <Document> wrapper, so it can be composed
// into a multi-invoice document (CombinedInvoicesTemplate) as well as the
// single-invoice InvoiceTemplate below.
export function InvoicePage({ data }: InvoiceTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== 'NL'

  // Build customer address lines (avoiding duplicates, country merged into city line)
  const customerLines: string[] = []
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson)
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
  if (data.customer.vatNumber) customerLines.push(`BTW: ${data.customer.vatNumber}`)

  return (
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
                    data.company.email,
                  ].filter(Boolean).join('\n')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>{data.labels.documentTitle}</Text>
          </View>
        </View>

        {/* ========== CUSTOMER + METADATA ========== */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>{data.labels.invoiceAddress}</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Factuurnummer:</Text>
              <Text style={styles.metaValue}>{data.documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Factuurdatum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Leverdatum:</Text>
              <Text style={styles.metaValueDue}>{formatDate(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* ========== BTW VERLEGD NOTICE (non-NL customer) ========== */}
        {isReverseCharge && (
          <View style={styles.verlegdBox}>
            <Text style={styles.verlegdText}>
              <Text style={styles.verlegdLabel}>BTW verlegd — intracommunautaire levering</Text>
              {' (Art. 138 EU BTW-richtlijn 2006/112/EG). 0% BTW. BTW-nummer afnemer: '}
              {data.customer.vatNumber || '—'}
            </Text>
          </View>
        )}

        {/* ========== ITEMS TABLE ========== */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colNote]}>Notitie</Text>
            <Text style={[styles.th, styles.colUnitPrice]}>Eenheidprijs</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colExclVat]}>Excl. BTW</Text>
            <Text style={[styles.th, styles.colVatAmt]}>BTW</Text>
            <Text style={[styles.th, styles.colInclVat]}>Incl. BTW</Text>
          </View>
          {data.items.map((item, idx) => {
            const priceExclVat = item.unitPrice * item.quantity
            const vatAmount = Math.round(priceExclVat * (item.vatRate / 100))
            const priceInclVat = priceExclVat + vatAmount

            return (
              <View
                key={idx}
                wrap={false}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                <Text style={[styles.tdBold, styles.colNum]}>{idx + 1}</Text>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colNote]}>{item.note || ''}</Text>
                <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
                <Text style={[styles.td, styles.colExclVat]}>{formatPrice(priceExclVat)}</Text>
                <Text style={[styles.td, styles.colVatAmt]}>{formatPrice(vatAmount)}</Text>
                <Text style={[styles.tdBold, styles.colInclVat]}>{formatPrice(priceInclVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* Spacer: pin the payment block + totals + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* ========== BOTTOM: PAYMENT/RECEIPT + TOTALS ========== */}
        <View style={styles.bottomSection} wrap={false}>
          {/* Left: Payment Method + Receipt */}
          <View style={styles.leftColumn}>
            <View style={styles.actionBox}>
              <Text style={styles.actionTitle}>Betaalmethode</Text>
              <View style={styles.paymentRow}>
                <View style={styles.checkbox} />
                <Text style={styles.paymentLabel}>Contant</Text>
              </View>
              <View style={styles.paymentRow}>
                <View style={styles.checkbox} />
                <Text style={styles.paymentLabel}>PIN</Text>
              </View>
              <View style={styles.paymentRow}>
                <View style={styles.checkbox} />
                <Text style={styles.paymentLabel}>Open/Bank</Text>
              </View>
              <View style={styles.paymentRow}>
                <View style={styles.checkbox} />
                <Text style={styles.paymentLabel}>Oude Facturen</Text>
              </View>
            </View>
            <View style={styles.actionBox}>
              <Text style={styles.actionTitle}>Ontvangst</Text>
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

          {/* Right: Totals */}
          <View style={styles.rightColumn}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{data.labels.subtotal}</Text>
                <Text style={styles.totalValue}>{formatPrice(data.subtotal)}</Text>
              </View>
              {data.vatBreakdown.map((vat, idx) => (
                <View key={idx} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{data.labels.vat} {vat.rate}%</Text>
                  <Text style={styles.totalValue}>{formatPrice(vat.amount)}</Text>
                </View>
              ))}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>{data.labels.grandTotal}</Text>
                <Text style={styles.grandTotalValue}>{formatPrice(data.grandTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========== PAYMENT TERMS ========== */}
        {data.paymentTerms && (
          <View style={styles.paymentTerms}>
            <Text style={styles.paymentTermsText}>{data.paymentTerms}</Text>
          </View>
        )}

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
                  data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
                  data.company.vatNumber && `BTW: ${data.company.vatNumber}`,
                ].filter(Boolean).join('  |  ')}
              </Text>
              {data.company.iban && (
                <Text style={styles.footerIban}>IBAN: {data.company.iban}{data.company.bic ? `  |  BIC: ${data.company.bic}` : ''}</Text>
              )}
            </View>
          </View>
          {data.footerText && (
            <Text style={styles.footerCenter}>{data.footerText}</Text>
          )}
        </View>
    </Page>
  )
}

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  return (
    <Document>
      <InvoicePage data={data} />
    </Document>
  )
}

export default InvoiceTemplate
