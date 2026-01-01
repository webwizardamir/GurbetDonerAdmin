import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { InvoiceData } from '../../services/documents'

// A4: 595.28 x 841.89 points
// Using Helvetica (built-in) for all text

const styles = StyleSheet.create({
  // ===========================================
  // PAGE
  // ===========================================
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40,
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
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    width: 120,
    height: 'auto',
    maxHeight: 50,
    objectFit: 'contain',
    marginRight: 12,
  },
  companyInfo: {},
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    color: '#16a34a', // Brand green
  },
  docNumber: {
    fontSize: 10,
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: 6,
    paddingHorizontal: 12,
  },

  // ===========================================
  // INFO ROW (Customer + Metadata)
  // ===========================================
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    paddingLeft: 10,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  customerLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
  metaBox: {
    width: '40%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingVertical: 2,
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 9,
  },
  metaValueDue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },

  // ===========================================
  // ITEMS TABLE
  // ===========================================
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#166534', // Dark green
    paddingVertical: 6,
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
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  // Column widths for new layout
  colDesc: { width: 140 },
  colNote: { width: 60 },
  colUnitPrice: { width: 65, textAlign: 'right' },
  colQty: { width: 50, textAlign: 'right' },
  colExclVat: { width: 70, textAlign: 'right' },
  colVatAmt: { width: 55, textAlign: 'right' },
  colInclVat: { width: 70, textAlign: 'right' },

  // ===========================================
  // BOTTOM SECTION
  // ===========================================
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  // Left: Payment + Receipt
  leftColumn: {
    width: '55%',
    flexDirection: 'row',
    gap: 8,
  },
  actionBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 3,
    borderTopColor: '#16a34a', // Green accent top border
    padding: 8,
  },
  actionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    marginRight: 6,
  },
  paymentLabel: {
    fontSize: 8,
    color: '#1e293b',
  },
  sigField: {
    marginBottom: 6,
  },
  sigLabel: {
    fontSize: 7,
    color: '#64748b',
    marginBottom: 2,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderStyle: 'dashed',
    height: 12,
  },

  // Right: Totals
  rightColumn: {
    width: '40%',
  },
  totalsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 3,
    borderTopColor: '#16a34a', // Green accent top border
    padding: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 8,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#16a34a', // Brand green
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#16a34a', // Brand green
  },

  // ===========================================
  // PAYMENT TERMS
  // ===========================================
  paymentTerms: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#16a34a',
    padding: 8,
    marginBottom: 12,
  },
  paymentTermsText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    textAlign: 'center',
  },

  // ===========================================
  // BANK INFO
  // ===========================================
  bankSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginBottom: 10,
  },
  bankTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#166534',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bankItem: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 3,
  },
  bankLabel: {
    fontSize: 8,
    color: '#64748b',
    width: 45,
  },
  bankValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // ===========================================
  // FOOTER
  // ===========================================
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.4,
  },
})

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface InvoiceTemplateProps {
  data: InvoiceData
}

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const hasBankInfo = data.company.iban || data.company.bankName

  // Build customer address lines (avoiding duplicates)
  const customerLines: string[] = []
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson)
  if (data.customer.street) customerLines.push(data.customer.street)
  if (data.customer.postalCode && data.customer.city) {
    customerLines.push(`${data.customer.postalCode} ${data.customer.city}`)
  } else if (data.customer.city) {
    customerLines.push(data.customer.city)
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    customerLines.push(data.customer.country)
  }
  if (data.customer.vatNumber) customerLines.push(`BTW: ${data.customer.vatNumber}`)

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
                    data.company.email,
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
              <Text style={styles.metaLabel}>{data.labels.date}:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{data.labels.customerNumber}:</Text>
              <Text style={styles.metaValue}>{data.customer.customerNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order:</Text>
              <Text style={styles.metaValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{data.labels.dueDate}:</Text>
              <Text style={styles.metaValueDue}>{formatDate(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* ========== ITEMS TABLE ========== */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
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
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colNote]}></Text>
                <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
                <Text style={[styles.td, styles.colExclVat]}>{formatPrice(priceExclVat)}</Text>
                <Text style={[styles.td, styles.colVatAmt]}>{formatPrice(vatAmount)}</Text>
                <Text style={[styles.tdBold, styles.colInclVat]}>{formatPrice(priceInclVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* ========== BOTTOM: PAYMENT/RECEIPT + TOTALS ========== */}
        <View style={styles.bottomSection}>
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

        {/* ========== BANK INFO ========== */}
        {hasBankInfo && (
          <View style={styles.bankSection}>
            <Text style={styles.bankTitle}>Bankgegevens</Text>
            <View style={styles.bankGrid}>
              {data.company.bankName && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Bank:</Text>
                  <Text style={styles.bankValue}>{data.company.bankName}</Text>
                </View>
              )}
              {data.company.accountHolder && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>T.n.v.:</Text>
                  <Text style={styles.bankValue}>{data.company.accountHolder}</Text>
                </View>
              )}
              {data.company.iban && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>IBAN:</Text>
                  <Text style={styles.bankValue}>{data.company.iban}</Text>
                </View>
              )}
              {data.company.bic && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>BIC:</Text>
                  <Text style={styles.bankValue}>{data.company.bic}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========== FOOTER ========== */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {[
              data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
              data.company.vatNumber && `BTW: ${data.company.vatNumber}`,
            ].filter(Boolean).join(' | ')}
            {data.footerText && `\n${data.footerText}`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default InvoiceTemplate
