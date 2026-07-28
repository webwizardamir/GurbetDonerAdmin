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
import { docBrand } from './brandPalette'

// A4: 595.28 x 841.89 points
// Payment Reminder = Reminder for overdue invoice payment

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
    color: docBrand.paymentReminder.primary,
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: docBrand.paymentReminder.tint,
    padding: 4,
    paddingHorizontal: 10,
  },

  // Urgent banner (compact)
  urgentBanner: {
    backgroundColor: docBrand.paymentReminder.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.paymentReminder.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  urgentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: docBrand.paymentReminder.primary,
    textAlign: 'center',
    marginBottom: 1,
  },
  urgentText: {
    fontSize: 7.5,
    color: docBrand.paymentReminder.dark,
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
    borderLeftColor: docBrand.paymentReminder.primary,
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
  metaValueRed: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: docBrand.paymentReminder.primary,
  },

  // Invoice reference box (compact)
  invoiceRefBox: {
    backgroundColor: docBrand.paymentReminder.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.paymentReminder.accent,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  invoiceRefTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceRefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  invoiceRefItem: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 2,
  },
  invoiceRefLabel: {
    fontSize: 7.5,
    color: '#64748b',
    width: 95,
  },
  invoiceRefValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // Amount due box (compact)
  amountDueBox: {
    backgroundColor: docBrand.paymentReminder.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  amountDueLabel: {
    fontSize: 8.5,
    color: '#ffffff',
    marginBottom: 1,
  },
  amountDueValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  // Message section
  messageSection: {
    marginBottom: 8,
  },
  messageTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.4,
  },

  // Bank details (prominent but compact)
  bankSection: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 2,
    borderLeftColor: '#22c55e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  bankTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 5,
    textAlign: 'center',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bankItem: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 3,
    justifyContent: 'center',
  },
  bankLabel: {
    fontSize: 8,
    color: '#475569',
    marginRight: 6,
  },
  bankValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  bankIban: {
    fontSize: 12,
    fontFamily: 'Courier-Bold',
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  paymentRef: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
    color: '#475569',
  },

  // Action section (compact)
  actionSection: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 2,
    borderLeftColor: '#fcd34d',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 3,
  },
  actionText: {
    fontSize: 7.5,
    color: '#92400e',
    lineHeight: 1.4,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.paymentReminder.primary,
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
    color: docBrand.paymentReminder.dark,
  },
  footerCenter: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },
})

// Calculate days overdue
function getDaysOverdue(dueDateString: string): number {
  const dueDate = new Date(dueDateString)
  const today = new Date()
  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

interface PaymentReminderTemplateProps {
  data: InvoiceData
}

export function PaymentReminderTemplate({ data }: PaymentReminderTemplateProps) {
  const T = getDocText(data.lang)
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const hasBankInfo = data.company.iban || data.company.bankName
  const daysOverdue = getDaysOverdue(data.dueDate)

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

  // Determine urgency level
  const isUrgent = daysOverdue > 14
  const isCritical = daysOverdue > 30

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

        {/* Urgent Banner */}
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentTitle}>
            {isCritical ? T.prTitleFinal : isUrgent ? T.prTitleSecond : T.prTitleFirst}
          </Text>
          <Text style={styles.urgentText}>
            {daysOverdue > 0 ? T.prOverdue(daysOverdue) : T.prDueReached}
          </Text>
        </View>

        {/* Customer + Metadata */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>{T.addrDebtor}</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.prMetaReminderDate}</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{T.prMetaDaysLate}</Text>
              <Text style={styles.metaValueRed}>{T.prDaysSuffix(daysOverdue)}</Text>
            </View>
          </View>
        </View>

        {/* Invoice Reference */}
        <View style={styles.invoiceRefBox}>
          <Text style={styles.invoiceRefTitle}>{T.prRefTitle}</Text>
          <View style={styles.invoiceRefGrid}>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>{T.prRefInvoiceNumber}</Text>
              <Text style={styles.invoiceRefValue}>{data.invoiceNumber || '—'}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>{T.prRefOrderDate}</Text>
              <Text style={styles.invoiceRefValue}>{formatDate(data.order.orderDate)}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>{T.prRefOrigDue}</Text>
              <Text style={styles.invoiceRefValue}>{formatDate(data.dueDate)}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>{T.prRefItems}</Text>
              <Text style={styles.invoiceRefValue}>{data.items.length}</Text>
            </View>
          </View>
        </View>

        {/* Amount Due */}
        <View style={styles.amountDueBox}>
          <Text style={styles.amountDueLabel}>{T.prAmountDueLabel}</Text>
          <Text style={styles.amountDueValue}>{formatPrice(data.grandTotal)}</Text>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageTitle}>{T.prGreeting}</Text>
          <Text style={styles.messageText}>
            {isCritical
              ? T.prBodyCritical(formatPrice(data.grandTotal))
              : isUrgent
              ? T.prBodyUrgent(formatPrice(data.grandTotal), daysOverdue)
              : T.prBodyNormal
            }
          </Text>
        </View>

        {/* Spacer: pin the bank details + action + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* Bank Details */}
        {hasBankInfo && (
          <View style={styles.bankSection}>
            <Text style={styles.bankTitle}>{T.prBankTitle}</Text>
            <View style={styles.bankGrid}>
              {data.company.bankName && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>{T.prBankBank}</Text>
                  <Text style={styles.bankValue}>{data.company.bankName}</Text>
                </View>
              )}
              {data.company.accountHolder && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>{T.prBankHolder}</Text>
                  <Text style={styles.bankValue}>{data.company.accountHolder}</Text>
                </View>
              )}
            </View>
            {data.company.iban && (
              <Text style={styles.bankIban}>{data.company.iban}</Text>
            )}
            <Text style={styles.paymentRef}>
              {T.prIbanRef(data.invoiceNumber || '—')}
            </Text>
          </View>
        )}

        {/* Action Required */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>{T.prActionTitle}</Text>
          <Text style={styles.actionText}>
            {T.prActionText(data.company.phone || undefined, data.company.email || undefined)}
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

export default PaymentReminderTemplate
