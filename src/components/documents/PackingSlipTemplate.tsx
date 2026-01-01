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
  },
  docNumber: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: 6,
    paddingHorizontal: 12,
  },

  // ===========================================
  // INFO ROW
  // ===========================================
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

  // ===========================================
  // ITEMS TABLE
  // ===========================================
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    fontSize: 9,
  },
  tdBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Column widths
  colIdx: { width: 30, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 80, textAlign: 'center' },
  colCheck: { width: 50, textAlign: 'center' },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    marginHorizontal: 'auto',
  },

  // ===========================================
  // DELIVERY NOTES
  // ===========================================
  notesSection: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 10,
    marginBottom: 15,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: '#92400e',
  },

  // ===========================================
  // SIGNATURE SECTION
  // ===========================================
  signatureSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  signatureBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  signatureTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sigField: {
    marginBottom: 8,
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
    height: 14,
  },

  // ===========================================
  // FOOTER
  // ===========================================
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
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

  // Build customer address lines
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

        {/* ========== SIGNATURES ========== */}
        <View style={styles.signatureSection}>
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
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {[
              data.company.name,
              data.company.phone,
              data.company.email,
            ].filter(Boolean).join(' | ')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default PackingSlipTemplate
