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
// Credit Note = Refund/correction document, references original invoice

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
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
    color: '#7c3aed', // Purple for credit note
  },
  docNumber: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#ede9fe',
    padding: 6,
    paddingHorizontal: 12,
  },

  // Credit banner
  creditBanner: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#7c3aed',
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditBannerText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#5b21b6',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
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
  metaValueHighlight: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },

  // Reference section
  referenceBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    padding: 12,
    marginBottom: 15,
  },
  referenceTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  referenceText: {
    fontSize: 8,
    color: '#6b21a8',
  },

  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6d28d9',
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
    backgroundColor: '#faf5ff',
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
  tdCredit: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a', // Green for credit amounts
  },
  colDesc: { width: 180 },
  colUnitPrice: { width: 80, textAlign: 'right' },
  colQty: { width: 60, textAlign: 'right' },
  colExclVat: { width: 80, textAlign: 'right' },
  colVatAmt: { width: 60, textAlign: 'right' },
  colCredit: { width: 80, textAlign: 'right' },

  // Bottom section
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  // Reason box
  reasonBox: {
    width: '55%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  reasonTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.4,
  },

  // Totals
  totalsBox: {
    width: '40%',
    backgroundColor: '#f8fafc',
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
  totalValueCredit: {
    fontSize: 8,
    textAlign: 'right',
    color: '#16a34a',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#7c3aed',
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#16a34a',
  },

  // Processing info
  processingBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    padding: 12,
    marginBottom: 15,
  },
  processingTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    marginBottom: 6,
  },
  processingText: {
    fontSize: 8,
    color: '#166534',
    lineHeight: 1.5,
  },

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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface CreditNoteTemplateProps {
  data: InvoiceData
}

export function CreditNoteTemplate({ data }: CreditNoteTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email

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
        {/* Header */}
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

        {/* Credit Banner */}
        <View style={styles.creditBanner}>
          <Text style={styles.creditBannerText}>
            CREDITNOTA - Dit bedrag wordt verrekend met uw openstaande saldo
          </Text>
        </View>

        {/* Customer + Metadata */}
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
              <Text style={styles.metaLabel}>Creditnotadatum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{data.labels.customerNumber}:</Text>
              <Text style={styles.metaValue}>{data.customer.customerNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Betreft order:</Text>
              <Text style={styles.metaValueHighlight}>{data.order.orderNumber}</Text>
            </View>
          </View>
        </View>

        {/* Reference */}
        <View style={styles.referenceBox}>
          <Text style={styles.referenceTitle}>Referentie oorspronkelijke transactie</Text>
          <Text style={styles.referenceText}>
            Deze creditnota heeft betrekking op order {data.order.orderNumber} van {formatDate(data.order.orderDate)}.
          </Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colUnitPrice]}>Eenheidprijs</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colExclVat]}>Excl. BTW</Text>
            <Text style={[styles.th, styles.colVatAmt]}>BTW</Text>
            <Text style={[styles.th, styles.colCredit]}>Credit</Text>
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
                <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
                <Text style={[styles.td, styles.colExclVat]}>{formatPrice(priceExclVat)}</Text>
                <Text style={[styles.td, styles.colVatAmt]}>{formatPrice(vatAmount)}</Text>
                <Text style={[styles.tdCredit, styles.colCredit]}>-{formatPrice(priceInclVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* Bottom: Reason + Totals */}
        <View style={styles.bottomSection}>
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Reden creditering</Text>
            <Text style={styles.reasonText}>
              Annulering/retour van bestelling.
              {'\n\n'}
              Bij vragen over deze creditnota kunt u contact opnemen met onze administratie.
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotaal</Text>
              <Text style={styles.totalValueCredit}>-{formatPrice(data.subtotal)}</Text>
            </View>
            {data.vatBreakdown.map((vat, idx) => (
              <View key={idx} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{data.labels.vat} {vat.rate}%</Text>
                <Text style={styles.totalValueCredit}>-{formatPrice(vat.amount)}</Text>
              </View>
            ))}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Totaal credit</Text>
              <Text style={styles.grandTotalValue}>-{formatPrice(data.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Processing Info */}
        <View style={styles.processingBox}>
          <Text style={styles.processingTitle}>Verwerking van deze creditnota</Text>
          <Text style={styles.processingText}>
            {`Het creditbedrag van ${formatPrice(data.grandTotal)} wordt verrekend met uw openstaande facturen of uitbetaald naar uw bankrekening.\n\n`}
            {`Heeft u reeds betaald? Dan ontvangt u het bedrag binnen 14 werkdagen retour.`}
          </Text>
        </View>

        {/* Footer */}
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

export default CreditNoteTemplate
