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
import { formatPrice, formatDate } from '../../utils/format'
import { buildAddressLines } from '../../utils/address'
import { docBrand } from './brandPalette'

// A4: 595.28 x 841.89 points
// Proforma = Quote/Offerte - NOT an invoice, has validity period

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
    color: docBrand.proforma.primary,
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: docBrand.proforma.tint,
    padding: 4,
    paddingHorizontal: 10,
  },

  // Disclaimer banner (compact)
  disclaimer: {
    backgroundColor: docBrand.proforma.tint,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.proforma.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: docBrand.proforma.dark,
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
    borderLeftColor: docBrand.proforma.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
  },
  // Dual-address layout — see InvoiceTemplate.tsx. Only rendered when the
  // customer has a delivery address that differs from the billing address.
  addressGroup: {
    width: '58%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addressBoxHalf: {
    width: '48.5%',
  },
  customerNameDual: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
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
    color: docBrand.proforma.primary,
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

  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: docBrand.proforma.dark,
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
  colNum: { width: 18, textAlign: 'right', paddingRight: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colUnitPrice: { width: 70, textAlign: 'right', paddingRight: 6 },
  colPiecePrice: { width: 54, textAlign: 'right', paddingRight: 6 },
  colBoxPrice: { width: 54, textAlign: 'right', paddingRight: 6 },
  colQty: { width: 55, textAlign: 'left', paddingLeft: 4 },
  colExclVat: { width: 70, textAlign: 'right', paddingRight: 6 },
  colVatAmt: { width: 55, textAlign: 'right', paddingRight: 6 },
  colInclVat: { width: 70, textAlign: 'right' },

  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  totalsBox: {
    width: '45%',
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: docBrand.proforma.primary,
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
    borderTopColor: docBrand.proforma.dark,
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

  // Conditions section (compact)
  conditionsSection: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  conditionsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  conditionsText: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.4,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.proforma.primary,
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
    color: docBrand.proforma.dark,
  },
  footerCenter: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
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
  const T = getDocText(data.lang)
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== 'NL'
  const hasBox = data.items.some(i => i.unitType === 'doos')

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

  const deliveryLines = data.customer.deliveryAddress
    ? [
        ...(data.customer.contactPerson ? [data.customer.contactPerson] : []),
        ...buildAddressLines(data.customer.deliveryAddress),
      ]
    : []

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
            {T.pfDisclaimer}
          </Text>
        </View>

        {/* Customer + Metadata */}
        <View style={styles.infoRow}>
          {deliveryLines.length > 0 ? (
            <View style={styles.addressGroup}>
              <View style={[styles.customerBox, styles.addressBoxHalf]}>
                <Text style={styles.customerLabel}>{T.addrDelivery}</Text>
                <Text style={styles.customerNameDual}>{data.customer.companyName}</Text>
                <Text style={styles.customerDetail}>
                  {deliveryLines.join('\n')}
                </Text>
              </View>
              <View style={[styles.customerBox, styles.addressBoxHalf]}>
                <Text style={styles.customerLabel}>{T.addrRecipient}</Text>
                <Text style={styles.customerNameDual}>{data.customer.companyName}</Text>
                <Text style={styles.customerDetail}>
                  {customerLines.join('\n')}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.customerBox}>
              <Text style={styles.customerLabel}>{T.addrRecipient}</Text>
              <Text style={styles.customerName}>{data.customer.companyName}</Text>
              <Text style={styles.customerDetail}>
                {customerLines.join('\n')}
              </Text>
            </View>
          )}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.metaDate}</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.metaValidUntil}</Text>
              <Text style={styles.metaValueHighlight}>{getValidityDate(data.documentDate)}</Text>
            </View>
          </View>
        </View>

        {/* BTW verlegd notice */}
        {isReverseCharge && (
          <View style={styles.verlegdBox}>
            <Text style={styles.verlegdText}>
              <Text style={styles.verlegdLabel}>{T.verlegdLabel}</Text>
              {T.verlegdBody}
              {data.customer.vatNumber || '—'}
            </Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>{T.thDescription}</Text>
            {hasBox ? (
              <>
                <Text style={[styles.th, styles.colPiecePrice]}>{T.thPiecePrice}</Text>
                <Text style={[styles.th, styles.colBoxPrice]}>{T.thBoxPrice}</Text>
              </>
            ) : (
              <Text style={[styles.th, styles.colUnitPrice]}>{T.thUnitPrice}</Text>
            )}
            <Text style={[styles.th, styles.colQty]}>{T.thQty}</Text>
            <Text style={[styles.th, styles.colExclVat]}>{T.thExclVat}</Text>
            <Text style={[styles.th, styles.colVatAmt]}>{T.thVat}</Text>
            <Text style={[styles.th, styles.colInclVat]}>{T.thInclVat}</Text>
          </View>
          {data.items.map((item, idx) => {
            const priceExclVat = item.unitPrice * item.quantity
            const vatAmount = Math.round(priceExclVat * (item.vatRate / 100))
            const priceInclVat = priceExclVat + vatAmount
            const isBoxLine = item.unitType === 'doos'

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
                {hasBox ? (
                  <>
                    <Text style={[styles.td, styles.colPiecePrice]}>
                      {isBoxLine
                        ? (item.piecePrice != null ? formatPrice(item.piecePrice) : '—')
                        : formatPrice(item.unitPrice)}
                    </Text>
                    <Text style={[styles.td, styles.colBoxPrice]}>
                      {isBoxLine ? formatPrice(item.unitPrice) : '—'}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.td, styles.colUnitPrice]}>{formatPrice(item.unitPrice)}</Text>
                )}
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit.toLowerCase()}</Text>
                <Text style={[styles.td, styles.colExclVat]}>{formatPrice(priceExclVat)}</Text>
                <Text style={[styles.td, styles.colVatAmt]}>{formatPrice(vatAmount)}</Text>
                <Text style={[styles.tdBold, styles.colInclVat]}>{formatPrice(priceInclVat)}</Text>
              </View>
            )
          })}
        </View>

        {/* Spacer: pin the totals + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* Totals */}
        <View style={styles.totalsSection} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{T.tSubtotalExclVat}</Text>
              <Text style={styles.totalValue}>{formatPrice(data.subtotal)}</Text>
            </View>
            {data.discount > 0 && data.documentType !== 'credit_note' && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{T.tDiscount}</Text>
                <Text style={styles.totalValue}>-{formatPrice(data.discount)}</Text>
              </View>
            )}
            {data.shipping > 0 && data.documentType !== 'credit_note' && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{T.tShipping}</Text>
                <Text style={styles.totalValue}>{formatPrice(data.shipping)}</Text>
              </View>
            )}
            {data.vatBreakdown.map((vat, idx) => (
              <View key={idx} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{T.thVat} {vat.rate}%</Text>
                <Text style={styles.totalValue}>{formatPrice(vat.amount)}</Text>
              </View>
            ))}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{T.tGrandInclVat}</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(data.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.conditionsSection}>
          <Text style={styles.conditionsTitle}>{T.pfConditionsTitle}</Text>
          <Text style={styles.conditionsText}>
            {T.pfConditions(getValidityDate(data.documentDate))}
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
          <Text style={styles.footerCenter}>
            {T.pfContactPrefix}{data.company.phone || data.company.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default ProformaTemplate
