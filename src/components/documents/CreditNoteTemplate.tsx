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
// Credit Note = Refund/correction document, references original invoice

const styles = StyleSheet.create({
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
    color: '#7c3aed',
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: '#ede9fe',
    padding: 4,
    paddingHorizontal: 10,
  },

  // Credit banner (compact)
  creditBanner: {
    backgroundColor: '#ede9fe',
    borderLeftWidth: 2,
    borderLeftColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  creditBannerText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#5b21b6',
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: '#7c3aed',
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
  metaValueHighlight: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },

  // Reference section (compact, single line)
  referenceBox: {
    backgroundColor: '#faf5ff',
    borderLeftWidth: 2,
    borderLeftColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  referenceTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  referenceText: {
    fontSize: 7.5,
    color: '#6b21a8',
  },

  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6d28d9',
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
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowEven: {
    backgroundColor: '#faf5ff',
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
  tdCredit: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  colNum: { width: 20, textAlign: 'right', paddingRight: 5 },
  colDesc: { width: 165 },
  colUnitPrice: { width: 70, textAlign: 'right' },
  colQty: { width: 55, textAlign: 'right' },
  colExclVat: { width: 70, textAlign: 'right' },
  colVatAmt: { width: 55, textAlign: 'right' },
  colCredit: { width: 70, textAlign: 'right' },

  // Bottom section
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Reason box
  reasonBox: {
    width: '55%',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 7,
  },
  reasonTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  reasonText: {
    fontSize: 7.5,
    color: '#64748b',
    lineHeight: 1.35,
  },

  // Totals
  totalsBox: {
    width: '40%',
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: '#7c3aed',
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
  totalValueCredit: {
    fontSize: 7.5,
    textAlign: 'right',
    color: '#16a34a',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: '#7c3aed',
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#16a34a',
  },

  // Processing info (compact)
  processingBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 2,
    borderLeftColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  processingTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    marginBottom: 3,
  },
  processingText: {
    fontSize: 7.5,
    color: '#166534',
    lineHeight: 1.4,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#7c3aed',
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
    color: '#5b21b6',
  },
  footerCenter: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },

  // BTW verlegd notice (single-line, professional)
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
})

interface CreditNoteTemplateProps {
  data: InvoiceData
}

export function CreditNoteTemplate({ data }: CreditNoteTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== 'NL'

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

        {/* BTW verlegd notice */}
        {isReverseCharge && (
          <View style={styles.verlegdBox}>
            <Text style={styles.verlegdText}>
              <Text style={styles.verlegdLabel}>BTW verlegd — intracommunautaire levering</Text>
              {' (Art. 138 EU BTW-richtlijn 2006/112/EG). 0% BTW. BTW-nummer afnemer: '}
              {data.customer.vatNumber || '—'}
            </Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
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
                wrap={false}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                <Text style={[styles.tdBold, styles.colNum]}>{idx + 1}</Text>
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

        {/* Spacer: pin the block below + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* Bottom: Reason + Totals */}
        <View style={styles.bottomSection} wrap={false}>
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
    </Document>
  )
}

export default CreditNoteTemplate
