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
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    color: '#0891b2', // Cyan for order confirmation
  },
  docNumber: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#cffafe',
    padding: 6,
    paddingHorizontal: 12,
  },

  // Thank you banner
  thankYouBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  thankYouTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 4,
  },
  thankYouText: {
    fontSize: 9,
    color: '#047857',
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 3,
    borderLeftColor: '#0891b2',
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
    color: '#0891b2',
  },

  // Order summary section
  orderSummary: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: 12,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0891b2',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0e7490',
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
  colIdx: { width: 30, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 10 },
  colQty: { width: 80, textAlign: 'center' },
  colUnitPrice: { width: 80, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },

  // Totals section (simplified)
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
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
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#0891b2',
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // Next steps section
  nextSteps: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    marginBottom: 15,
  },
  nextStepsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.5,
  },

  // Contact section
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginBottom: 15,
  },
  contactTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  contactItem: {
    flexDirection: 'row',
  },
  contactLabel: {
    fontSize: 8,
    color: '#64748b',
    marginRight: 4,
  },
  contactValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  footer: {
    borderTopWidth: 2,
    borderTopColor: '#0891b2',
    paddingTop: 10,
    marginTop: 'auto',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footerCompany: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  footerDetail: {
    fontSize: 7,
    color: '#64748b',
    lineHeight: 1.5,
  },
  footerIban: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0e7490',
  },
  footerCenter: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
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
  if (data.customer.postalCode && data.customer.city) {
    customerLines.push(`${data.customer.postalCode} ${data.customer.city}`)
  } else if (data.customer.city) {
    customerLines.push(data.customer.city)
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    customerLines.push(data.customer.country)
  }

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

        {/* Totals */}
        <View style={styles.totalsSection}>
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
        <View style={styles.footer}>
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
