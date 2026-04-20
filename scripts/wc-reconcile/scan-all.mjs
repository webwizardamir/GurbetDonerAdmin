// Bulk reconciliation scan — fetch every WC order, find its Supabase twin,
// and emit a CSV of mismatches. Read-only.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/scan-all.mjs
// Output: migration-data/reconciliation-report.csv  + summary stats on stdout.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
for (const [k, v] of Object.entries({ WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`Missing ${k} in .env.local`); process.exit(1) }
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const auth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const wcBase = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`

async function wc(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: auth } })
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 200)}`)
  const total = Number(r.headers.get('x-wp-total') || 0)
  const totalPages = Number(r.headers.get('x-wp-totalpages') || 0)
  return { data: await r.json(), total, totalPages }
}

const toCents = (s) => Math.round(parseFloat(s || '0') * 100)
const csvCell = (v) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csvRow = (arr) => arr.map(csvCell).join(',') + '\n'

mkdirSync(resolve('migration-data'), { recursive: true })
const outPath = resolve('migration-data', 'reconciliation-report.csv')
const out = createWriteStream(outPath)

const header = [
  'wc_id', 'wc_invoice_number', 'wc_status', 'wc_date',
  'wc_total', 'wc_subtotal', 'wc_tax', 'wc_refund_count', 'wc_refund_total',
  'wc_customer_id', 'wc_email', 'wc_company',
  'sb_found', 'sb_order_number', 'sb_status', 'sb_total', 'sb_subtotal',
  'sb_lineitem_sum', 'sb_email',
  'mismatch_total', 'mismatch_subtotal', 'mismatch_lineitem_vs_subtotal',
  'email_is_placeholder', 'has_refund_but_no_refund_table', 'notes'
]
out.write(header.join(',') + '\n')

// Stats -----------------------------------------------------------------
const stats = {
  wcTotal: 0, sbFound: 0, sbMissing: 0,
  mismatchTotal: 0, mismatchSubtotal: 0, mismatchLineitemVsSubtotal: 0,
  emailPlaceholder: 0, hasRefund: 0,
  wcRevenue: 0, sbRevenue: 0,
  wcRevenueAfterRefund: 0,
}

const PER_PAGE = 100
let page = 1
let totalPages = 1

console.log('Fetching WC orders (status=any) ...')
while (page <= totalPages) {
  const { data: wcOrders, totalPages: tp, total } = await wc(`/orders?per_page=${PER_PAGE}&page=${page}&status=any&orderby=id&order=asc`)
  totalPages = tp
  if (page === 1) console.log(`Total WC orders: ${total} across ${totalPages} page(s)\n`)

  const wcIds = wcOrders.map(o => o.id)
  const orderNumbers = wcIds.map(id => `WOO-${id}`)

  // Fetch matching Supabase orders + their customers + line items for this page
  const { data: sbOrders, error: ordErr } = await sb
    .from('orders')
    .select('id, order_number, status, subtotal, total, customer_id, customers(email)')
    .in('order_number', orderNumbers)
  if (ordErr) { console.error('Supabase error:', ordErr); process.exit(1) }
  const sbByOrderNumber = new Map((sbOrders ?? []).map(o => [o.order_number, o]))

  const sbOrderIds = (sbOrders ?? []).map(o => o.id)
  let itemSumByOrder = new Map()
  if (sbOrderIds.length) {
    const { data: items, error: itemErr } = await sb
      .from('order_items').select('order_id, line_total').in('order_id', sbOrderIds)
    if (itemErr) { console.error('Supabase items error:', itemErr); process.exit(1) }
    for (const it of items ?? []) {
      itemSumByOrder.set(it.order_id, (itemSumByOrder.get(it.order_id) ?? 0) + (it.line_total ?? 0))
    }
  }

  for (const wo of wcOrders) {
    stats.wcTotal++
    const invoiceNum = wo.meta_data?.find(m => m.key === '_wcpdf_invoice_number')?.value ?? ''
    const wcDate = wo.date_created?.slice(0, 10) ?? ''
    const wcTotalCents = toCents(wo.total)
    const wcSubtotalCents = toCents(wo.line_items?.reduce((s, i) => s + parseFloat(i.subtotal || '0'), 0) ?? 0)
    const wcTaxCents = toCents(wo.total_tax)
    const refundCount = wo.refunds?.length ?? 0
    const refundTotalCents = Math.round((wo.refunds ?? []).reduce((s, r) => s + parseFloat(r.total || '0'), 0) * 100) // negative

    const sbOrder = sbByOrderNumber.get(`WOO-${wo.id}`)
    const sbFound = !!sbOrder
    const sbEmail = sbOrder?.customers?.email ?? ''
    const emailIsPlaceholder = sbEmail.startsWith('woo-') && sbEmail.endsWith('@import.local')
    const sbLineitemSum = sbFound ? (itemSumByOrder.get(sbOrder.id) ?? 0) : 0

    const mismatchTotal = sbFound && sbOrder.total !== wcTotalCents
    const mismatchSubtotal = sbFound && sbOrder.subtotal !== wcSubtotalCents
    const mismatchLineitemVsSubtotal = sbFound && sbLineitemSum !== sbOrder.subtotal
    const hasRefundButNoRefundTable = refundCount > 0

    // Aggregate revenue for summary
    if (['completed', 'paid-by-bank', 'paid-by-bank-fix', 'paid-by-cash'].includes(wo.status)) {
      stats.wcRevenue += wcTotalCents
      stats.wcRevenueAfterRefund += wcTotalCents + refundTotalCents // refundTotal is negative
    }
    if (sbFound && sbOrder.status === 'completed') stats.sbRevenue += sbOrder.total

    if (sbFound) stats.sbFound++; else stats.sbMissing++
    if (mismatchTotal) stats.mismatchTotal++
    if (mismatchSubtotal) stats.mismatchSubtotal++
    if (mismatchLineitemVsSubtotal) stats.mismatchLineitemVsSubtotal++
    if (emailIsPlaceholder) stats.emailPlaceholder++
    if (refundCount > 0) stats.hasRefund++

    const notes = []
    if (!sbFound) notes.push('missing_in_supabase')
    if (mismatchLineitemVsSubtotal && refundCount > 0) notes.push('refund_absorbed_into_line_items')

    out.write(csvRow([
      wo.id, invoiceNum, wo.status, wcDate,
      (wcTotalCents/100).toFixed(2), (wcSubtotalCents/100).toFixed(2), (wcTaxCents/100).toFixed(2),
      refundCount, (refundTotalCents/100).toFixed(2),
      wo.customer_id, wo.billing?.email ?? '',
      wo.billing?.company || `${wo.billing?.first_name ?? ''} ${wo.billing?.last_name ?? ''}`.trim(),
      sbFound ? 'yes' : 'no',
      sbOrder?.order_number ?? '', sbOrder?.status ?? '',
      sbFound ? (sbOrder.total/100).toFixed(2) : '',
      sbFound ? (sbOrder.subtotal/100).toFixed(2) : '',
      sbFound ? (sbLineitemSum/100).toFixed(2) : '',
      sbEmail,
      mismatchTotal ? 'yes' : '', mismatchSubtotal ? 'yes' : '', mismatchLineitemVsSubtotal ? 'yes' : '',
      emailIsPlaceholder ? 'yes' : '', hasRefundButNoRefundTable ? 'yes' : '',
      notes.join(';'),
    ]))
  }

  console.log(`Page ${page}/${totalPages}  cumulative: WC=${stats.wcTotal}  sb_missing=${stats.sbMissing}  refunds=${stats.hasRefund}  lineitem_mismatch=${stats.mismatchLineitemVsSubtotal}  placeholder_email=${stats.emailPlaceholder}`)
  page++
}

out.end()

// Summary --------------------------------------------------------------
const eur = (c) => '€' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

console.log('\n' + '='.repeat(70))
console.log('RECONCILIATION SUMMARY')
console.log('='.repeat(70))
console.log(`WC orders scanned:             ${stats.wcTotal}`)
console.log(`  found in Supabase:           ${stats.sbFound}`)
console.log(`  missing in Supabase:         ${stats.sbMissing}`)
console.log(`WC orders with refunds:        ${stats.hasRefund}`)
console.log(`Line items sum != subtotal:    ${stats.mismatchLineitemVsSubtotal}  ← internal inconsistency`)
console.log(`WC vs SB total mismatch:       ${stats.mismatchTotal}`)
console.log(`WC vs SB subtotal mismatch:    ${stats.mismatchSubtotal}`)
console.log(`Placeholder emails in SB:      ${stats.emailPlaceholder}`)
console.log()
console.log(`WC revenue (paid statuses):    ${eur(stats.wcRevenue)}`)
console.log(`WC revenue minus refunds:      ${eur(stats.wcRevenueAfterRefund)}  ← "true" recognized revenue`)
console.log(`SB revenue (completed):        ${eur(stats.sbRevenue)}`)
console.log(`SB vs WC (gross) delta:        ${eur(stats.sbRevenue - stats.wcRevenue)}`)
console.log(`SB vs WC (net of refunds) Δ:   ${eur(stats.sbRevenue - stats.wcRevenueAfterRefund)}`)
console.log()
console.log(`Full report: ${outPath}`)
