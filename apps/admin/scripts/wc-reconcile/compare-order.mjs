// Side-by-side: fetch a WC order and find its likely Supabase twin by date+total.
// Read-only — no writes.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/compare-order.mjs 7422

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) {
  setGlobalDispatcher(new ProxyAgent(proxy))
}

const wcOrderId = process.argv[2] ?? '7422'

const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run: node --env-file=.env.local scripts/wc-reconcile/compare-order.mjs <id>')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const auth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const wcBase = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`
async function wc(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: auth } })
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

const eur = (cents) => (cents / 100).toFixed(2)
const toCents = (s) => Math.round(parseFloat(s) * 100)

// 1. WC side ------------------------------------------------------------
console.log(`Fetching WC order #${wcOrderId} ...`)
const wcOrder = await wc(`/orders/${wcOrderId}`)
const wcRefunds = await wc(`/orders/${wcOrderId}/refunds`)

const wcDate = wcOrder.date_created.slice(0, 10)
const wcTotalCents = toCents(wcOrder.total)
const wcEmail = wcOrder.billing?.email
const wcCompany = wcOrder.billing?.company || `${wcOrder.billing?.first_name ?? ''} ${wcOrder.billing?.last_name ?? ''}`.trim()

const getMeta = (key) => wcOrder.meta_data?.find(m => m.key === key)?.value
const wcInvoiceNumber = getMeta('_wcpdf_invoice_number') ?? null
const wcInvoiceDate = getMeta('_wcpdf_invoice_date_formatted') ?? null
const wcCreditNoteNumber = getMeta('_wcpdf_credit_note_number') ?? null

// 2. Supabase side — match by date + total -----------------------------
console.log(`Searching Supabase for order_date=${wcDate} AND total=${wcTotalCents} cents ...`)
const { data: sbOrders, error: ordErr } = await sb
  .from('orders')
  .select('id, order_number, status, payment_method, subtotal, tax_amount, delivery_fee, discount_amount, total, order_date, customer_id')
  .eq('order_date', wcDate)
  .eq('total', wcTotalCents)
if (ordErr) { console.error('Supabase error:', ordErr); process.exit(1) }

console.log(`Candidates in Supabase: ${sbOrders.length}`)
if (sbOrders.length === 0) {
  console.log('No match on date+total. Trying total-only (±1 cent) with matching customer company name ...')
  const { data: fuzzy } = await sb.from('orders')
    .select('id, order_number, status, total, order_date, customer_id, customers(company_name, email)')
    .gte('total', wcTotalCents - 1).lte('total', wcTotalCents + 1)
    .order('order_date', { ascending: false }).limit(20)
  console.log(JSON.stringify(fuzzy, null, 2))
  process.exit(0)
}

// Pick first candidate (if multiple, we'll show all)
for (const sbOrder of sbOrders) {
  const { data: sbCust } = await sb.from('customers').select('id, company_name, email, contact_person').eq('id', sbOrder.customer_id).single()
  const { data: sbItems } = await sb.from('order_items').select('*').eq('order_id', sbOrder.id)

  console.log('\n' + '='.repeat(70))
  console.log(`WC #${wcOrderId}   vs   Supabase ${sbOrder.order_number}`)
  console.log('='.repeat(70))

  const rows = [
    ['WC Invoice #',  wcInvoiceNumber ?? '—',                      '(not stored in new system)'],
    ['WC Invoice date', wcInvoiceDate ?? '—',                      '—'],
    ['WC Credit Note #', wcCreditNoteNumber ?? '—',                '—'],
    ['Status',        wcOrder.status,                              sbOrder.status],
    ['Payment',       wcOrder.payment_method,                      sbOrder.payment_method],
    ['Order date',    wcDate,                                      sbOrder.order_date],
    ['Customer',      `${wcCompany} <${wcEmail}>`,                 `${sbCust?.company_name} <${sbCust?.email}>`],
    ['Subtotal',      wcOrder.line_items.reduce((s,i)=>s+parseFloat(i.subtotal),0).toFixed(2), eur(sbOrder.subtotal)],
    ['Discount',      wcOrder.discount_total,                      eur(sbOrder.discount_amount)],
    ['Tax',           wcOrder.total_tax,                           eur(sbOrder.tax_amount)],
    ['Shipping',      wcOrder.shipping_total,                      eur(sbOrder.delivery_fee)],
    ['Total',         wcOrder.total,                               eur(sbOrder.total)],
    ['Line items',    String(wcOrder.line_items.length),           String(sbItems?.length ?? 0)],
    ['Refunds',       String(wcRefunds.length),                    '(no refunds table in new system)'],
  ]
  for (const [label, a, b] of rows) {
    const match = String(a) === String(b) ? '✓' : '✗'
    console.log(`  ${match} ${label.padEnd(12)} WC: ${String(a).padEnd(35)} | SB: ${b}`)
  }

  console.log('\n  -- Line items --')
  for (let i = 0; i < Math.max(wcOrder.line_items.length, sbItems?.length ?? 0); i++) {
    const w = wcOrder.line_items[i]
    const s = sbItems?.[i]
    console.log(`  [${i}] WC: ${w ? `${w.name} x${w.quantity} @ ${w.price} = ${w.total}` : '—'}`)
    console.log(`      SB: ${s ? `${s.product_name} x${s.quantity} @ ${eur(s.unit_price)} = ${eur(s.line_total)}` : '—'}`)
  }

  if (wcRefunds.length) {
    console.log('\n  -- WC Refunds (not represented in Supabase) --')
    for (const r of wcRefunds) {
      console.log(`  Refund #${r.id}  amount=${r.amount}  date=${r.date_created}`)
      for (const li of r.line_items ?? []) {
        console.log(`    line: qty=${li.quantity} subtotal=${li.subtotal} total=${li.total} product=${li.product_id}`)
      }
    }
  }
}
