import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { CustomerActivityRow } from '../../types'
import { groupActivityRows } from '../../services/customerActivity'
import { docBrand } from './brandPalette'

// ===========================================================================
// Klantactiviteit — the printable copy of the daily "these customers stopped
// ordering" digest (migration 00115).
//
// INTERNAL DOCUMENT: Dutch always, no customer ever sees it, so none of the
// customer-facing language or branding rules apply. It is attached to the
// morning email and previewable from /overdue?tab=activity, both rendering the
// SAME rows: the email body lists them, this makes them readable on paper next
// to a phone.
// ===========================================================================

const brand = docBrand.customerActivity

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 28, backgroundColor: '#ffffff', color: '#1e293b' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: brand.primary,
  },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: brand.primary, marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#64748b' },
  dateBox: { backgroundColor: brand.tint, padding: 5, paddingHorizontal: 10 },
  dateLabel: { fontSize: 6.5, color: brand.dark, textTransform: 'uppercase', marginBottom: 1 },
  dateValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: brand.tintSoft, borderWidth: 0.5, borderColor: '#e2e8f0',
    paddingHorizontal: 8, paddingVertical: 5,
  },
  summaryLabel: { fontSize: 6.5, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  summaryValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  groupHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: 6, marginBottom: 3,
  },
  groupName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: brand.dark },
  groupRule: { fontSize: 7, color: '#64748b' },

  tableHeader: {
    flexDirection: 'row', backgroundColor: brand.dark, paddingVertical: 4, paddingHorizontal: 5,
  },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 5,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  rowEven: { backgroundColor: brand.tintSoft },
  rowOdd: { backgroundColor: '#ffffff' },
  td: { fontSize: 7.5 },
  tdBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  tdMuted: { fontSize: 7, color: '#64748b' },

  colName: { flex: 2, paddingRight: 6 },
  colLast: { width: 62, paddingRight: 6 },
  colDays: { width: 46, textAlign: 'right', paddingRight: 6 },
  colRule: { width: 78, paddingRight: 6 },
  colContact: { flex: 1.2 },

  // The whole point of the sheet is to be actionable at a glance, so the
  // longest-quiet rows carry a weight the rest do not.
  daysBadge: {
    fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: brand.dark,
    backgroundColor: brand.tint, paddingVertical: 1, paddingHorizontal: 3, textAlign: 'right',
  },

  footer: { borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 'auto' },
  footerText: { fontSize: 6.5, color: '#94a3b8', textAlign: 'center' },
  empty: { fontSize: 9, color: '#64748b', marginTop: 20, textAlign: 'center' },
})

function formatDateNl(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

export interface CustomerActivityDocData {
  rows: CustomerActivityRow[]
  /** Peildatum: the day the list was taken, so a printed sheet dates itself. */
  runDate: string
  companyName?: string
}

export function CustomerActivityTemplate({ data }: { data: CustomerActivityDocData }) {
  const { rows, runDate, companyName } = data
  const groups = groupActivityRows(rows)
  const longest = rows.reduce((m, r) => Math.max(m, r.days_since), 0)
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.days_since, 0) / rows.length)
    : 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Klantactiviteit</Text>
            <Text style={styles.subtitle}>
              {companyName ? `${companyName} · ` : ''}Klanten die te lang niets hebben besteld
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Peildatum</Text>
              <Text style={styles.dateValue}>{formatDateNl(runDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Klanten gemeld</Text>
            <Text style={styles.summaryValue}>{rows.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Langst stil</Text>
            <Text style={styles.summaryValue}>{longest} dagen</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gemiddeld stil</Text>
            <Text style={styles.summaryValue}>{avg} dagen</Text>
          </View>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>Geen klanten om te melden.</Text>
        ) : (
          groups.map(g => (
            <View key={g.key}>
              <View style={styles.groupHead} wrap={false}>
                <Text style={styles.groupName}>{g.label} ({g.rows.length})</Text>
                {!!g.thresholdLabel && <Text style={styles.groupRule}>{g.thresholdLabel}</Text>}
              </View>

              <View wrap={false}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colName]}>Klant</Text>
                  <Text style={[styles.th, styles.colLast]}>Laatste bestelling</Text>
                  <Text style={[styles.th, styles.colDays]}>Dagen</Text>
                  <Text style={[styles.th, styles.colRule]}>Regel</Text>
                  <Text style={[styles.th, styles.colContact]}>Contact</Text>
                </View>
              </View>

              {g.rows.map((r, idx) => (
                <View key={r.customer_id} wrap={false} style={[styles.row, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                  <View style={styles.colName}>
                    <Text style={styles.tdBold}>{r.company_name}</Text>
                    {!!r.city && <Text style={styles.tdMuted}>{r.city}</Text>}
                  </View>
                  <Text style={[styles.td, styles.colLast]}>
                    {r.last_order_date ? formatDateNl(r.last_order_date) : 'nooit'}
                  </Text>
                  <View style={styles.colDays}>
                    <Text style={styles.daysBadge}>{r.days_since}</Text>
                  </View>
                  <Text style={[styles.td, styles.colRule]}>
                    {r.threshold_days != null
                      ? `${r.threshold_days} d${r.rule_source === 'customer' ? ' (eigen)' : ''}`
                      : ''}
                  </Text>
                  <Text style={[styles.td, styles.colContact]}>
                    {r.phone || r.email || ''}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={styles.footer} wrap={false}>
          <Text style={styles.footerText}>
            Gegenereerd op {new Date().toLocaleDateString('nl-NL', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/** Document element without modal chrome, for the cron renderer and for the
 *  browser-side preview/download on the Klantactiviteit tab. */
export function buildCustomerActivityDocument(data: CustomerActivityDocData) {
  return <CustomerActivityTemplate data={data} />
}

export default CustomerActivityTemplate
