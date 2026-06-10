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
// Order Confirmation = Confirms order received, shows what's ordered

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
    color: '#0891b2',
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: '#cffafe',
    padding: 4,
    paddingHorizontal: 10,
  },

  // Thank you banner (compact)
  thankYouBanner: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 2,
    borderLeftColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  thankYouTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 1,
  },
  thankYouText: {
    fontSize: 7.5,
    color: '#047857',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: '#0891b2',
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
    color: '#0891b2',
  },

  // Order summary section (compact)
  orderSummary: {
    backgroundColor: '#f0fdfa',
    borderLeftWidth: 2,
    borderLeftColor: '#0891b2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0891b2',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0e7490',
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
  colIdx: { width: 25, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 70, textAlign: 'center' },
  colUnitPrice: { width: 70, textAlign: 'right' },
  colTotal: { width: 70, textAlign: 'right' },

  // Totals section (simplified)
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  totalsBox: {
    width: '40%',
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: '#0891b2',
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
    borderTopColor: '#0891b2',
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // Next steps section (compact)
  nextSteps: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  nextStepsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  nextStepsText: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.4,
  },

  // Contact section
  contactSection: {
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    marginBottom: 6,
  },
  contactTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
  },
  contactLabel: {
    fontSize: 7.5,
    color: '#64748b',
    marginRight: 4,
  },
  contactValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#0891b2',
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
    color: '#0e7490',
  },
  footerCenter: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },
})

interface OrderConfirmationTemplateProps {
  data: InvoiceData
}

export function OrderConfirmationTemplate({ data }: OrderConfirmationTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email

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

  // Calculate total items
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0)

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

        {/* Thank You Banner */}
        <View style={styles.thankYouBanner}>
          <Text style={styles.thankYouTitle}>Bedankt voor uw bestelling!</Text>
          <Text style={styles.thankYouText}>
            Wij hebben uw bestelling in goede orde ontvangen en gaan deze zo spoedig mogelijk verwerken.
          </Text>
        </View>

        {/* Customer + Order Metadata */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>Klantgegevens</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ordernummer:</Text>
              <Text style={styles.metaValueHighlight}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Orderdatum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.order.orderDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bevestigingsdatum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Besteloverzicht</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Aantal artikelen:</Text>
            <Text style={styles.summaryValue}>{data.items.length} producten ({totalItems} stuks)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Totaalbedrag:</Text>
            <Text style={styles.summaryValue}>{formatPrice(data.grandTotal)} incl. BTW</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colIdx]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Product</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colUnitPrice]}>Stukprijs</Text>
            <Text style={[styles.th, styles.colTotal]}>Totaal</Text>
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
              <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
              <Text style={[styles.tdBold, styles.colTotal]}>{formatPrice(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Spacer: pin the totals + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* Totals */}
        <View style={styles.totalsSection} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotaal</Text>
              <Text style={styles.totalValue}>{formatPrice(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>BTW</Text>
              <Text style={styles.totalValue}>{formatPrice(data.totalVat)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Totaal</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(data.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>Wat kunt u verwachten?</Text>
          <Text style={styles.nextStepsText}>
            {`1. Wij verwerken uw bestelling binnen 1 werkdag\n`}
            {`2. U ontvangt bericht wanneer uw bestelling klaar is voor levering\n`}
            {`3. Levering vindt plaats op de afgesproken dag\n`}
            {`4. Na levering ontvangt u de factuur\n\n`}
            {`Wijzigingen? Neem zo snel mogelijk contact met ons op.`}
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Vragen over uw bestelling?</Text>
          <View style={styles.contactGrid}>
            {data.company.phone && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Telefoon:</Text>
                <Text style={styles.contactValue}>{data.company.phone}</Text>
              </View>
            )}
            {data.company.email && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>E-mail:</Text>
                <Text style={styles.contactValue}>{data.company.email}</Text>
              </View>
            )}
          </View>
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

export default OrderConfirmationTemplate
