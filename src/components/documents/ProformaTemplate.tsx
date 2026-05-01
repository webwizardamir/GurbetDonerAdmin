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
// Proforma = Quote/Offerte - NOT an invoice, has validity period

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
    color: '#3b82f6', // Blue for proforma
  },
  docNumber: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#dbeafe',
    padding: 6,
    paddingHorizontal: 12,
  },

  // Disclaimer banner
  disclaimer: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#3b82f6',
    padding: 10,
    marginBottom: 15,
  },
  disclaimerText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
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
    borderLeftColor: '#3b82f6',
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
    color: '#3b82f6',
  },

  // BTW verlegd notice (non-NL customer)
  verlegdBox: {
    borderWidth: 1,
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 8,
    marginBottom: 12,
  },
  verlegdTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  verlegdText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },

  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
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
  colNum: { width: 22, textAlign: 'right', paddingRight: 6 },
  colDesc: { width: 158 },
  colUnitPrice: { width: 80, textAlign: 'right' },
  colQty: { width: 60, textAlign: 'right' },
  colExclVat: { width: 80, textAlign: 'right' },
  colVatAmt: { width: 60, textAlign: 'right' },
  colInclVat: { width: 80, textAlign: 'right' },

  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: '45%',
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
    borderTopColor: '#1e40af',
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

  // Conditions section
  conditionsSection: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    marginBottom: 15,
  },
  conditionsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  conditionsText: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.5,
  },

  footer: {
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
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
    color: '#1e40af',
  },
  footerCenter: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
})

// Calculate validity date (30 days from document date)
function getValidityDate(dateString: string): string {
  const date = new Date(dateString)
  date.setDate(date.getDate() + 30)
  return formatDate(date.toISOString())
}

interface ProformaTemplateProps {
  data: InvoiceData
}

export function ProformaTemplate({ data }: ProformaTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== 'NL'

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

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Dit is een prijsopgave/offerte en geen factuur. Prijzen zijn onder voorbehoud.
          </Text>
        </View>

        {/* Customer + Metadata */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>Geadresseerde</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Referentie:</Text>
              <Text style={styles.metaValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Geldig tot:</Text>
              <Text style={styles.metaValueHighlight}>{getValidityDate(data.documentDate)}</Text>
            </View>
          </View>
        </View>

        {/* BTW verlegd notice */}
        {isReverseCharge && (
          <View style={styles.verlegdBox}>
            <Text style={styles.verlegdTitle}>BTW verlegd — intracommunautaire levering</Text>
            <Text style={styles.verlegdText}>
              0% BTW. De BTW is verlegd naar de afnemer.{'\n'}
              BTW-nummer afnemer: {data.customer.vatNumber || '—'}
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
                <Text style={[styles.tdBold, styles.colNum]}>{idx + 1}</Text>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
                <Text style={[styles.td, styles.colExclVat]}>{formatPrice(priceExclVat)}</Text>
                <Text style={[styles.td, styles.colVatAmt]}>{formatPrice(vatAmount)}</Text>
                <Text style={[styles.tdBold, styles.colInclVat]}>{formatPrice(priceInclVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotaal excl. BTW</Text>
              <Text style={styles.totalValue}>{formatPrice(data.subtotal)}</Text>
            </View>
            {data.vatBreakdown.map((vat, idx) => (
              <View key={idx} style={styles.totalRow}>
                <Text style={styles.totalLabel}>BTW {vat.rate}%</Text>
                <Text style={styles.totalValue}>{formatPrice(vat.amount)}</Text>
              </View>
            ))}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Totaal incl. BTW</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(data.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.conditionsSection}>
          <Text style={styles.conditionsTitle}>Voorwaarden</Text>
          <Text style={styles.conditionsText}>
            {`• Deze offerte is geldig tot ${getValidityDate(data.documentDate)}\n`}
            {`• Prijzen zijn onder voorbehoud van prijswijzigingen\n`}
            {`• Levertijd in overleg\n`}
            {`• Op al onze leveringen zijn onze algemene voorwaarden van toepassing`}
          </Text>
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
          <Text style={styles.footerCenter}>
            Vragen? Neem contact met ons op: {data.company.phone || data.company.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default ProformaTemplate
