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
  // PAGE
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // HEADER
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
  },
  docNumber: {
    fontSize: 8.5,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: 4,
    paddingHorizontal: 10,
  },

  // INFO ROW
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
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

  // ITEMS TABLE
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
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
  // Column widths
  colIdx: { width: 28, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 70, textAlign: 'center' },
  colCheck: { width: 40, textAlign: 'center' },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: '#94a3b8',
    marginHorizontal: 'auto',
  },

  // DELIVERY NOTES (compact)
  notesSection: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 2,
    borderLeftColor: '#fcd34d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 7.5,
    color: '#92400e',
  },

  // SIGNATURE SECTION
  signatureSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  signatureBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
    padding: 7,
  },
  signatureTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sigField: {
    marginBottom: 5,
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
    height: 11,
  },

  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
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
})

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface PackingSlipTemplateProps {
  data: InvoiceData
}

export function PackingSlipTemplate({ data }: PackingSlipTemplateProps) {
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email

  // Build customer address lines (country merged into city line)
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

        {/* ========== DELIVERY ADDRESS + METADATA ========== */}
        <View style={styles.infoRow}>
          <View style={styles.customerBox}>
            <Text style={styles.customerLabel}>Afleveradres</Text>
            <Text style={styles.customerName}>{data.customer.companyName}</Text>
            <Text style={styles.customerDetail}>
              {customerLines.join('\n')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order Nr.:</Text>
              <Text style={styles.metaValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{data.labels.date}:</Text>
              <Text style={styles.metaValue}>{formatDate(data.documentDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Artikelen:</Text>
              <Text style={styles.metaValue}>{data.items.length}</Text>
            </View>
          </View>
        </View>

        {/* ========== ITEMS TABLE (No prices) ========== */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colIdx]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colCheck]}>Check</Text>
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
              <View style={styles.colCheck}>
                <View style={styles.checkbox} />
              </View>
            </View>
          ))}
        </View>

        {/* ========== DELIVERY NOTES ========== */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Bezorginformatie</Text>
          <Text style={styles.notesText}>
            Controleer alle artikelen bij ontvangst. Meld eventuele afwijkingen direct.
          </Text>
        </View>

        {/* Spacer: pin the signatures + footer to the page bottom */}
        <View style={{ marginTop: 'auto' }} />

        {/* ========== SIGNATURES ========== */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Afzender</Text>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.name}</Text>
              <View style={styles.sigLine} />
            </View>
            <View style={styles.sigField}>
              <Text style={styles.sigLabel}>{data.labels.signature}</Text>
              <View style={styles.sigLine} />
            </View>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Ontvanger</Text>
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
                  data.company.phone && `Tel: ${data.company.phone}`,
                  data.company.email,
                ].filter(Boolean).join('  |  ')}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default PackingSlipTemplate
