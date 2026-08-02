import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { PaymentOverviewData } from '../../types'
import { getDocText } from '../../services/documentLabels'
import { formatPrice, formatDate } from '../../utils/format'
import { buildAddressLines } from '../../utils/address'
import { docBrand } from './brandPalette'
import { docLogo } from './logoMetrics'

// ===========================================================================
// BETAALOVERZICHT — monthly statement of account (migrations 00102/00103)
//
// A hybrid on purpose: the chrome of the customer-facing document family
// (logo header, address box, meta box, IBAN callout, branded footer) wrapped
// around the wide zebra table of the generic list export (DataExportTemplate).
//
// LANDSCAPE. Portrait A4 gives ≈539pt of usable width; six columns of dates
// and amounts crush at that width, and the whole point of this document is
// that it is a table. Landscape gives ≈786pt. The cost is vertical: ≈11 rows
// on page 1 (the address block eats the top) and ≈20 on continuation pages,
// against the 15-16 the portrait family targets. That is the right trade for
// a document whose rows are one line each and never wrap.
//
// The table header band and the footer are `fixed`, so a customer with 40 open
// invoices gets column headers and page numbers on every sheet.
//
// Language comes from data.lang (resolveDocumentLang → NL/BE = nl, else en),
// NEVER from the app language. Money and dates stay nl-NL / DD-MM-YYYY in both,
// exactly like every other document.
// ===========================================================================

const BRAND = docBrand.paymentOverview

// A4 landscape: 841.89 x 595.28 points, minus 28pt padding each side.
const USABLE_WIDTH = 841.89 - 28 * 2

// Fixed column widths; the description-ish first column takes the remainder.
// No Status column: since migration 00107 the statement lists overdue invoices
// only, so every row would read "Verlopen" — a column of identical values. Its
// 80pt goes to the flex invoice column instead. "Dagen te laat" still varies
// and stays.
const COL = {
  invoice: 0,          // flex — computed below
  invoiceDate: 90,
  dueDate: 90,
  daysLate: 80,
  amount: 100,
}
COL.invoice = USABLE_WIDTH - (COL.invoiceDate + COL.dueDate + COL.daysLate + COL.amount)

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // --- HEADER --------------------------------------------------------------
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  // Height-driven so the width follows the logo's own aspect ratio — see logoMetrics.ts.
  logo: { ...docLogo },
  companyInfo: {},
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyDetail: { fontSize: 7, color: '#64748b', lineHeight: 1.35 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: BRAND.primary,
  },
  docNumberBadge: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.dark,
    backgroundColor: BRAND.tint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },

  // --- INFO ROW (customer + meta) -----------------------------------------
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBox: {
    width: '55%',
    borderLeftWidth: 2,
    borderLeftColor: BRAND.accent,
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
  customerName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  customerDetail: { fontSize: 8, color: '#475569', lineHeight: 1.35 },
  metaBox: { width: '40%' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    paddingVertical: 1,
  },
  metaLabel: { fontSize: 7.5, color: '#64748b' },
  metaValue: { fontSize: 8 },
  metaValueStrong: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // --- INTRO ---------------------------------------------------------------
  introBox: {
    borderLeftWidth: 2,
    borderLeftColor: BRAND.accent,
    backgroundColor: BRAND.tintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  introText: { fontSize: 7.5, color: BRAND.dark, lineHeight: 1.35 },

  // --- TABLE ---------------------------------------------------------------
  table: { marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND.dark,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowEven: { backgroundColor: '#f8fafc' },
  rowOdd: { backgroundColor: '#ffffff' },
  td: { fontSize: 7.5, paddingHorizontal: 2 },
  tdBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 2 },
  // SEMANTIC, not brand: an overdue line is red on every tenant, same as the
  // invoice's overdue due-date. Do not repoint this at BRAND.
  tdOverdue: { fontSize: 7.5, color: '#dc2626', paddingHorizontal: 2 },
  tdMuted: { fontSize: 7.5, color: '#94a3b8', paddingHorizontal: 2 },

  // --- TOTALS --------------------------------------------------------------
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  totalsBox: {
    width: 280,
    borderTopWidth: 2,
    borderTopColor: BRAND.primary,
    backgroundColor: BRAND.tintSoft,
    padding: 7,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  totalsLabel: { fontSize: 7.5, color: '#475569' },
  totalsValue: { fontSize: 7.5 },
  totalsValueOverdue: { fontSize: 7.5, color: '#dc2626' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: BRAND.primary,
  },
  grandLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  grandValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.dark },

  // --- IBAN CALLOUT --------------------------------------------------------
  ibanCallout: {
    borderWidth: 0.5,
    borderColor: BRAND.primary,
    backgroundColor: BRAND.tintSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  ibanCalloutLabel: { fontSize: 8, color: BRAND.dark, marginBottom: 2 },
  ibanCalloutIban: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.dark,
    letterSpacing: 0.5,
  },
  ibanCalloutHolder: { fontSize: 7.5, color: BRAND.dark, marginTop: 1 },
  ibanCalloutRef: { fontSize: 7, color: '#64748b', marginTop: 2 },

  noteText: { fontSize: 7, color: '#64748b', lineHeight: 1.35, marginBottom: 6 },
  emptyText: { fontSize: 9, color: '#475569', marginBottom: 8 },

  // --- FOOTER --------------------------------------------------------------
  footer: {
    borderTopWidth: 1,
    borderTopColor: BRAND.primary,
    paddingTop: 6,
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCompany: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  footerDetail: { fontSize: 6.5, color: '#64748b', lineHeight: 1.4 },
  pageNumber: { fontSize: 6.5, color: '#64748b' },
})

interface Props {
  data: PaymentOverviewData
}

/** The page body without a <Document> wrapper, so many statements can be combined. */
export function PaymentOverviewPage({ data }: Props) {
  const T = getDocText(data.lang)
  const isEn = data.lang === 'en'

  const companyLines = [
    data.company.address,
    data.company.postalCode && data.company.city
      ? `${data.company.postalCode} ${data.company.city}`
      : data.company.city,
    data.company.phone ? `Tel: ${data.company.phone}` : null,
    data.company.email,
  ].filter(Boolean).join('\n')

  const customerLines = buildAddressLines({
    street: data.customer.street,
    postalCode: data.customer.postalCode,
    city: data.customer.city,
    country: data.customer.country,
  })

  const footerDetail = [
    data.company.vatNumber ? `BTW: ${data.company.vatNumber}` : null,
    data.company.kvkNumber ? `KvK: ${data.company.kvkNumber}` : null,
    data.company.website,
  ].filter(Boolean).join(' · ')

  const pageLabel = isEn ? 'Page' : 'Pagina'
  const ofLabel = isEn ? 'of' : 'van'

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* HEADER — fixed so a multi-page statement is identifiable on every sheet */}
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          {data.company.logoUrl && <Image src={data.company.logoUrl} style={styles.logo} />}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            {companyLines ? <Text style={styles.companyDetail}>{companyLines}</Text> : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.docTitle}>{T.poTitle}</Text>
          <Text style={styles.docNumberBadge}>{formatDate(data.asAtDate)}</Text>
        </View>
      </View>

      {/* CUSTOMER + META */}
      <View style={styles.infoRow}>
        <View style={styles.customerBox}>
          <Text style={styles.customerLabel}>{T.poAddrLabel}</Text>
          <Text style={styles.customerName}>{data.customer.companyName}</Text>
          <Text style={styles.customerDetail}>
            {[data.customer.contactPerson, ...customerLines].filter(Boolean).join('\n')}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{T.poMetaDate}</Text>
            <Text style={styles.metaValue}>{formatDate(data.asAtDate)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{T.poMetaCount}</Text>
            <Text style={styles.metaValue}>{data.lines.length}</Text>
          </View>
          {/* No "Klantnummer" row: the value is a slice of an internal UUID, which
              means nothing to the customer and nothing to our own admin either. */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{T.poTotalLabel}</Text>
            <Text style={styles.metaValueStrong}>{formatPrice(data.totalCents)}</Text>
          </View>
        </View>
      </View>

      {/* INTRO */}
      <View style={styles.introBox}>
        <Text style={styles.introText}>{T.poIntro(formatDate(data.asAtDate))}</Text>
      </View>

      {data.lines.length === 0 ? (
        <Text style={styles.emptyText}>{T.poEmpty}</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, { width: COL.invoice }]}>{T.poThInvoice}</Text>
            <Text style={[styles.th, { width: COL.invoiceDate }]}>{T.poThInvoiceDate}</Text>
            <Text style={[styles.th, { width: COL.dueDate }]}>{T.poThDueDate}</Text>
            <Text style={[styles.th, { width: COL.daysLate, textAlign: 'right' }]}>{T.poThDaysLate}</Text>
            <Text style={[styles.th, { width: COL.amount, textAlign: 'right' }]}>{T.poThAmount}</Text>
          </View>

          {data.lines.map((line, i) => {
            const overdue = line.days_overdue > 0
            return (
              <View
                key={line.order_id}
                style={[styles.tableRow, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                wrap={false}
              >
                <Text style={[styles.tdBold, { width: COL.invoice }]}>{line.invoice_number}</Text>
                <Text style={[styles.td, { width: COL.invoiceDate }]}>
                  {line.order_date ? formatDate(line.order_date) : '—'}
                </Text>
                <Text style={[styles.td, { width: COL.dueDate }]}>
                  {line.invoice_due_date ? formatDate(line.invoice_due_date) : '—'}
                </Text>
                <Text
                  style={[
                    overdue ? styles.tdOverdue : styles.tdMuted,
                    { width: COL.daysLate, textAlign: 'right' },
                  ]}
                >
                  {overdue ? String(line.days_overdue) : '—'}
                </Text>
                <Text style={[styles.tdBold, { width: COL.amount, textAlign: 'right' }]}>
                  {formatPrice(line.amount_cents)}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* TOTALS — kept off a page break so the amount is never orphaned */}
      <View style={styles.totalsWrap} wrap={false}>
        {/* No separate "waarvan verlopen" row: every line IS overdue now, so it
            would restate the grand total. */}
        <View style={styles.totalsBox}>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>{T.poTotalLabel}</Text>
            <Text style={styles.grandValue}>{formatPrice(data.totalCents)}</Text>
          </View>
        </View>
      </View>

      {/* IBAN + courtesy note */}
      {data.lines.length > 0 && data.company.iban ? (
        <View style={styles.ibanCallout} wrap={false}>
          <Text style={styles.ibanCalloutLabel}>{T.ibanPay}</Text>
          <Text style={styles.ibanCalloutIban}>{data.company.iban}</Text>
          {data.company.accountHolder ? (
            <Text style={styles.ibanCalloutHolder}>
              {T.ibanHolderPrefix}{data.company.accountHolder}
            </Text>
          ) : null}
          <Text style={styles.ibanCalloutRef}>{T.poIbanRef}</Text>
        </View>
      ) : null}

      {data.lines.length > 0 && (
        <Text style={styles.noteText} wrap={false}>{T.poAlreadyPaid}</Text>
      )}

      {/* FOOTER */}
      <View style={styles.footer} fixed>
        <View>
          <Text style={styles.footerCompany}>{data.company.name}</Text>
          {footerDetail ? <Text style={styles.footerDetail}>{footerDetail}</Text> : null}
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageLabel} ${pageNumber} ${ofLabel} ${totalPages}`
          }
        />
      </View>
    </Page>
  )
}

export function PaymentOverviewTemplate({ data }: Props) {
  return (
    <Document>
      <PaymentOverviewPage data={data} />
    </Document>
  )
}

export default PaymentOverviewTemplate
