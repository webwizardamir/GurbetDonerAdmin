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
// Payment Reminder = Reminder for overdue invoice payment

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
    color: '#dc2626', // Red for reminder
  },
  docNumber: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#fecaca',
    padding: 6,
    paddingHorizontal: 12,
  },

  // Urgent banner
  urgentBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#dc2626',
    padding: 15,
    marginBottom: 20,
  },
  urgentTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 4,
  },
  urgentText: {
    fontSize: 9,
    color: '#991b1b',
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
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
  metaValueRed: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },

  // Invoice reference box
  invoiceRefBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    marginBottom: 20,
  },
  invoiceRefTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  invoiceRefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  invoiceRefItem: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 4,
  },
  invoiceRefLabel: {
    fontSize: 8,
    color: '#64748b',
    width: 100,
  },
  invoiceRefValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  // Amount due box
  amountDueBox: {
    backgroundColor: '#dc2626',
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  amountDueLabel: {
    fontSize: 10,
    color: '#ffffff',
    marginBottom: 4,
  },
  amountDueValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  // Message section
  messageSection: {
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.6,
  },

  // Bank details (prominent)
  bankSection: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#22c55e',
    padding: 15,
    marginBottom: 20,
  },
  bankTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 10,
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
    marginBottom: 6,
    justifyContent: 'center',
  },
  bankLabel: {
    fontSize: 9,
    color: '#475569',
    marginRight: 8,
  },
  bankValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  bankIban: {
    fontSize: 14,
    fontFamily: 'Courier-Bold',
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
  paymentRef: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
    color: '#475569',
  },

  // Action section
  actionSection: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 12,
    marginBottom: 15,
  },
  actionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 8,
    color: '#92400e',
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
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email
  const hasBankInfo = data.company.iban || data.company.bankName
  const daysOverdue = getDaysOverdue(data.dueDate)

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
            {isCritical ? 'LAATSTE AANMANING' : isUrgent ? 'TWEEDE HERINNERING' : 'BETALINGSHERINNERING'}
          </Text>
          <Text style={styles.urgentText}>
            {daysOverdue > 0
              ? `Uw betaling is ${daysOverdue} dagen over de vervaldatum.`
              : 'De vervaldatum van uw factuur is bereikt.'}
          </Text>
        </View>

        {/* Customer + Metadata */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>Debiteur</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Herinneringsdatum:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Klantnummer:</Text>
              <Text style={styles.metaValue}>{data.customer.customerNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Dagen te laat:</Text>
              <Text style={styles.metaValueRed}>{daysOverdue} dagen</Text>
            </View>
          </View>
        </View>

        {/* Invoice Reference */}
        <View style={styles.invoiceRefBox}>
          <Text style={styles.invoiceRefTitle}>Betreft: Openstaande factuur</Text>
          <View style={styles.invoiceRefGrid}>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>Ordernummer:</Text>
              <Text style={styles.invoiceRefValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>Orderdatum:</Text>
              <Text style={styles.invoiceRefValue}>{formatDate(data.order.orderDate)}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>Oorspronkelijke vervaldatum:</Text>
              <Text style={styles.invoiceRefValue}>{formatDate(data.dueDate)}</Text>
            </View>
            <View style={styles.invoiceRefItem}>
              <Text style={styles.invoiceRefLabel}>Aantal artikelen:</Text>
              <Text style={styles.invoiceRefValue}>{data.items.length}</Text>
            </View>
          </View>
        </View>

        {/* Amount Due */}
        <View style={styles.amountDueBox}>
          <Text style={styles.amountDueLabel}>OPENSTAAND BEDRAG</Text>
          <Text style={styles.amountDueValue}>{formatPrice(data.grandTotal)}</Text>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageTitle}>Geachte heer/mevrouw,</Text>
          <Text style={styles.messageText}>
            {isCritical
              ? `Ondanks eerdere herinneringen hebben wij nog geen betaling van u ontvangen voor bovengenoemde factuur. Het openstaande bedrag van ${formatPrice(data.grandTotal)} dient per omgaande te worden voldaan.\n\nIndien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt de vordering uit handen te geven. De daaruit voortvloeiende kosten zullen op u worden verhaald.`
              : isUrgent
              ? `Wij hebben tot op heden geen betaling van u ontvangen voor bovengenoemde factuur. Het totaalbedrag van ${formatPrice(data.grandTotal)} is inmiddels ${daysOverdue} dagen over de vervaldatum.\n\nWij verzoeken u vriendelijk doch dringend het openstaande bedrag binnen 7 dagen over te maken.`
              : `Uit onze administratie blijkt dat onderstaande factuur nog niet is voldaan. Wellicht is uw betaling reeds onderweg, in dat geval kunt u deze herinnering als niet verzonden beschouwen.\n\nMocht u de factuur nog niet hebben betaald, dan verzoeken wij u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken.`
            }
          </Text>
        </View>

        {/* Bank Details */}
        {hasBankInfo && (
          <View style={styles.bankSection}>
            <Text style={styles.bankTitle}>Maak uw betaling over naar:</Text>
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
            </View>
            {data.company.iban && (
              <Text style={styles.bankIban}>{data.company.iban}</Text>
            )}
            <Text style={styles.paymentRef}>
              Vermeld bij betaling: {data.order.orderNumber}
            </Text>
          </View>
        )}

        {/* Action Required */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>Heeft u vragen of opmerkingen?</Text>
          <Text style={styles.actionText}>
            {`Neem dan zo spoedig mogelijk contact met ons op:\n`}
            {data.company.phone && `Telefoon: ${data.company.phone}\n`}
            {data.company.email && `E-mail: ${data.company.email}\n`}
            {`\nIndien u reeds betaald heeft, verzoeken wij u dit bericht te negeren.`}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.company.name}
            {data.company.kvkNumber && ` | KVK: ${data.company.kvkNumber}`}
            {data.company.vatNumber && ` | BTW: ${data.company.vatNumber}`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default PaymentReminderTemplate
