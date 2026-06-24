// Phase C: Backfill refund records from WC + restore line-item quantities
// to pre-refund values (so order_items reflect what was originally sold).
// Requires migration 00038 to be applied first.
//
// What it does for each WC order that has refunds:
//   1. Fetches /orders/{id}/refunds (full detail with line_items)
//   2. Matches each refund line to an existing SB order_item (by product_id + sku)
//   3. Adds back the refunded qty + line_total onto order_items
//   4. Inserts order_refunds + order_refund_items rows
//   5. Updates orders.refund_amount = sum of refunds
//
// Idempotent: uses woo_refund_id UNIQUE to skip already-imported refunds.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/backfill-refunds.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const wcBase = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`

const toCents = (s) => Math.round(parseFloat(s || '0') * 100)
const normalize = (s) => (s || '').trim().toLowerCase()

// --- 1. From CSV, find WC orders with refunds ------------------------
const raw = readFileSync(resolve('migration-data', 'reconciliation-report.csv'), 'utf8')
const [h, ...lines] = raw.trim().split('\n')
const cols = h.split(',')
const idx = (n) => cols.indexOf(n)
function parseRow(s) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) { const c = s[i]
    if (q) { if (c === '"' && s[i+1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  }
  out.push(cur); return out
}

const withRefunds = []
for (const line of lines) {
  const r = parseRow(line)
  if (r[idx('sb_found')] !== 'yes') continue
  if (Number(r[idx('wc_refund_count')] || 0) <= 0) continue
  withRefunds.push(Number(r[idx('wc_id')]))
}
console.log(`WC orders with refunds: ${withRefunds.length}`)

// --- 2. Sanity check: tables exist ----------------------------------
const probe = await sb.from('order_refunds').select('id').limit(1)
if (probe.error) { console.error('order_refunds table missing — has migration 00038 been applied?\n', probe.error.message); process.exit(1) }

// --- 3. Fetch refunds + order meta from WC --------------------------
console.log('Fetching WC refund details ...')
const refundBundles = []  // { wc_id, refunds[], orderMeta }
for (let i = 0; i < withRefunds.length; i++) {
  const wcId = withRefunds[i]
  const [rOrder, rRefunds] = await Promise.all([
    fetch(`${wcBase}/orders/${wcId}`, { headers: { Authorization: wcAuth } }).then(r => r.json()),
    fetch(`${wcBase}/orders/${wcId}/refunds`, { headers: { Authorization: wcAuth } }).then(r => r.json()),
  ])
  const creditNoteNumber = rOrder.meta_data?.find(m => m.key === '_wcpdf_credit_note_number')?.value || null
  refundBundles.push({ wcId, refunds: rRefunds, creditNoteNumber })
  process.stdout.write(`  ${i + 1}/${withRefunds.length}\r`)
}
console.log(`\n  fetched details for ${refundBundles.length} orders`)

// --- 4. Map to SB orders + order_items ------------------------------
const orderNumbers = withRefunds.map(id => `WOO-${id}`)
const sbOrderByNumber = new Map()
for (let i = 0; i < orderNumbers.length; i += 200) {
  const batch = orderNumbers.slice(i, i + 200)
  const { data } = await sb.from('orders').select('id, order_number, total').in('order_number', batch)
  for (const o of data) sbOrderByNumber.set(o.order_number, o)
}
const sbOrderIds = [...sbOrderByNumber.values()].map(o => o.id)
const itemsByOrderId = new Map()
for (let i = 0; i < sbOrderIds.length; i += 200) {
  const batch = sbOrderIds.slice(i, i + 200)
  const { data } = await sb.from('order_items').select('id, order_id, product_id, product_name, product_sku, quantity, line_total, total').in('order_id', batch)
  for (const it of data) {
    if (!itemsByOrderId.has(it.order_id)) itemsByOrderId.set(it.order_id, [])
    itemsByOrderId.get(it.order_id).push(it)
  }
}

// Check which refunds are already imported (idempotency)
const allWcRefundIds = refundBundles.flatMap(b => b.refunds.map(r => r.id))
const existingRefundIds = new Set()
for (let i = 0; i < allWcRefundIds.length; i += 200) {
  const batch = allWcRefundIds.slice(i, i + 200)
  const { data } = await sb.from('order_refunds').select('woo_refund_id').in('woo_refund_id', batch)
  for (const r of data) existingRefundIds.add(r.woo_refund_id)
}
console.log(`Already imported refunds (skip):  ${existingRefundIds.size}`)

// --- 5. Build the planned changes -----------------------------------
// For each refund line, find the matching order_item by product_sku or product_name.
// Plan: { lineItemId → addQty, addLineTotal }, plus refund + refund_items rows.

const itemAdjustments = new Map()  // order_item_id → { addQty, addAmount }
const refundInserts = []           // {order_id, woo_refund_id, amount, refund_date, reason, credit_note_number, items:[...]}
const warnings = []

for (const bundle of refundBundles) {
  const sbOrder = sbOrderByNumber.get(`WOO-${bundle.wcId}`)
  if (!sbOrder) { warnings.push(`order WOO-${bundle.wcId} missing in SB`); continue }
  const orderItems = itemsByOrderId.get(sbOrder.id) || []

  for (const rf of bundle.refunds) {
    if (existingRefundIds.has(rf.id)) continue
    const refundAmountCents = Math.abs(toCents(rf.total))  // WC refund total is negative; store positive
    const refundRow = {
      order_id: sbOrder.id,
      woo_refund_id: rf.id,
      woo_credit_note_number: bundle.creditNoteNumber ? parseInt(bundle.creditNoteNumber, 10) : null,
      refund_date: rf.date_created,
      amount: refundAmountCents,
      reason: rf.reason || null,
      items: [],
    }
    for (const rli of rf.line_items ?? []) {
      const absQty = Math.abs(parseFloat(rli.quantity) || 0)
      const absAmount = Math.abs(toCents(rli.total))
      const absTax = Math.abs(toCents(rli.total_tax))
      // Match to SB order_item: prefer SKU, else product_name
      const sku = rli.sku || ''
      const name = normalize(rli.name)
      const match = orderItems.find(oi => (sku && oi.product_sku === sku) || normalize(oi.product_name) === name)
      if (match) {
        const prev = itemAdjustments.get(match.id) || { addQty: 0, addAmount: 0, orderItem: match }
        prev.addQty += absQty
        prev.addAmount += absAmount
        itemAdjustments.set(match.id, prev)
      } else {
        warnings.push(`no order_item match for refund #${rf.id} line product="${rli.name}" sku="${sku}"`)
      }
      refundRow.items.push({
        order_item_id: match?.id ?? null,
        product_id: match?.product_id ?? null,
        product_name: rli.name,
        product_sku: sku || null,
        quantity: absQty,
        amount: absAmount,
        tax_amount: absTax,
      })
    }
    refundInserts.push(refundRow)
  }
}
console.log(`Refunds to insert:               ${refundInserts.length}`)
console.log(`Line items to restore (add qty): ${itemAdjustments.size}`)
console.log(`Warnings:                        ${warnings.length}`)

// --- 6. Dry-run output ----------------------------------------------
if (DRY_RUN) {
  console.log('\nDRY RUN — first 3 refunds:')
  console.log(JSON.stringify(refundInserts.slice(0, 3), null, 2))
  if (warnings.length) console.log('\nFirst 5 warnings:', warnings.slice(0, 5))
  process.exit(0)
}

// --- 7. Apply ---------------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const auditPath = resolve('migration-data', `backfill-refunds-${today}.csv`)
const audit = [['wc_order_id', 'wc_refund_id', 'amount_eur', 'items_count', 'items_restored', 'outcome', 'error']]

let refundsDone = 0, itemsRestoredDone = 0, failed = 0

// 7a. Restore line-item quantities: for each adjustment, fetch current + write back
console.log('\nRestoring line item quantities ...')
for (const [itemId, adj] of itemAdjustments) {
  const current = adj.orderItem
  const newQty = Number(current.quantity) + adj.addQty
  const newLineTotal = Number(current.line_total) + adj.addAmount
  const newTotal = Number(current.total ?? current.line_total) + adj.addAmount
  const { error } = await sb.from('order_items').update({
    quantity: newQty,
    line_total: newLineTotal,
    total: newTotal,
  }).eq('id', itemId)
  if (error) { failed++; console.error(`  item ${itemId}: ${error.message}`); continue }
  itemsRestoredDone++
}
console.log(`  restored: ${itemsRestoredDone}/${itemAdjustments.size}`)

// 7b. Insert refunds + refund items
console.log('\nInserting refund records ...')
for (const rf of refundInserts) {
  const { items, ...head } = rf
  const { data: insR, error: rErr } = await sb.from('order_refunds').insert(head).select('id').single()
  if (rErr) {
    audit.push([rf.order_id, rf.woo_refund_id, (rf.amount/100).toFixed(2), items.length, 0, 'failed', rErr.message])
    failed++; continue
  }
  if (items.length) {
    const payload = items.map(i => ({ ...i, refund_id: insR.id }))
    const { error: iErr } = await sb.from('order_refund_items').insert(payload)
    if (iErr) { audit.push([rf.order_id, rf.woo_refund_id, (rf.amount/100).toFixed(2), items.length, 0, 'partial', iErr.message]); failed++; continue }
  }
  audit.push([rf.order_id, rf.woo_refund_id, (rf.amount/100).toFixed(2), items.length, items.length, 'inserted', ''])
  refundsDone++
}

// 7c. Update orders.refund_amount (denormalized for performance)
console.log('\nUpdating orders.refund_amount ...')
const orderIdSet = new Set(refundInserts.map(r => r.order_id))
let refundAmtDone = 0
for (const orderId of orderIdSet) {
  const { data } = await sb.from('order_refunds').select('amount').eq('order_id', orderId)
  const sum = (data ?? []).reduce((s, r) => s + r.amount, 0)
  const { error } = await sb.from('orders').update({ refund_amount: sum }).eq('id', orderId)
  if (!error) refundAmtDone++
}
console.log(`  updated ${refundAmtDone}/${orderIdSet.size} orders`)

writeFileSync(auditPath, audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nDone.  refunds_inserted=${refundsDone}  items_restored=${itemsRestoredDone}  failed=${failed}`)
console.log(`Audit trail: ${auditPath}`)
