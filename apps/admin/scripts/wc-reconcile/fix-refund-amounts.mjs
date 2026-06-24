// Targeted fix: the previous backfill put amount=0 on order_refunds (used wrong
// field) and missed woo_credit_note_number (lives on refund meta, not order meta).
// This script pulls each existing refund from WC and UPDATEs the amount + credit
// note number. Then recalculates orders.refund_amount.
//
// Safe to re-run: only touches existing order_refund rows, no line-item changes.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const auth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const wcBase = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`

const toCents = (s) => Math.round(parseFloat(s || '0') * 100)

// 1. Get all existing refunds + their parent order
const { data: refunds, error } = await sb
  .from('order_refunds')
  .select('id, order_id, woo_refund_id, amount, orders!inner(order_number)')
if (error) { console.error(error); process.exit(1) }
console.log(`Refunds to fix: ${refunds.length}`)

// 2. Group by WC order id for batched fetches
const byWcOrder = new Map()  // wc_order_id → [refunds]
for (const r of refunds) {
  const wcOrderId = Number(r.orders.order_number.replace(/^WOO-/, ''))
  if (!byWcOrder.has(wcOrderId)) byWcOrder.set(wcOrderId, [])
  byWcOrder.get(wcOrderId).push(r)
}
console.log(`Unique WC orders: ${byWcOrder.size}`)

// 3. For each WC order, fetch /refunds and update matching rows
let fixed = 0, failed = 0, i = 0
for (const [wcOrderId, rows] of byWcOrder) {
  i++
  const r = await fetch(`${wcBase}/orders/${wcOrderId}/refunds`, { headers: { Authorization: auth } })
  if (!r.ok) { failed += rows.length; console.error(`  WC ${wcOrderId}: ${r.status}`); continue }
  const wcRefunds = await r.json()
  const byId = new Map(wcRefunds.map(x => [x.id, x]))

  for (const row of rows) {
    const wc = byId.get(row.woo_refund_id)
    if (!wc) { failed++; console.warn(`  refund ${row.woo_refund_id} not in WC any more`); continue }
    const amountCents = Math.abs(toCents(wc.amount))
    const cn = wc.meta_data?.find(m => m.key === '_wcpdf_credit_note_number')?.value
    const { error: uErr } = await sb.from('order_refunds').update({
      amount: amountCents,
      woo_credit_note_number: cn ? parseInt(cn, 10) : null,
      refund_date: wc.date_created,  // also fix date to match WC exactly
      reason: wc.reason || null,
    }).eq('id', row.id)
    if (uErr) { failed++; console.error(`  ${row.id}: ${uErr.message}`) }
    else fixed++
  }
  if (i % 10 === 0) process.stdout.write(`  ${i}/${byWcOrder.size}\r`)
}
console.log(`\nRefunds fixed: ${fixed}  failed: ${failed}`)

// 4. Recalculate orders.refund_amount for all affected orders
console.log('\nRecalculating orders.refund_amount ...')
const orderIds = [...new Set(refunds.map(r => r.order_id))]
let updated = 0
for (const oid of orderIds) {
  const { data } = await sb.from('order_refunds').select('amount').eq('order_id', oid)
  const sum = (data ?? []).reduce((s, r) => s + r.amount, 0)
  const { error: uErr } = await sb.from('orders').update({ refund_amount: sum }).eq('id', oid)
  if (!uErr) updated++
}
console.log(`orders.refund_amount updated: ${updated}/${orderIds.length}`)
