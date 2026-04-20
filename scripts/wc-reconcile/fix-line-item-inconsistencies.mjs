// Phase F: Fix the 130 orders where SUM(line_items.line_total) != orders.subtotal.
//
// Two fix modes:
//   A) Subtotal rewrite — for orders with non-empty items, set subtotal =
//      SUM(line_items.line_total). Spot-checks against WC confirm items are
//      correct, so the subtotal is the wrong field.
//   B) Item re-import — for the 11 orders with zero line items in SB, fetch
//      WC line items and insert them as snapshots.
//
// NOTE: we do NOT touch orders.total — that was confirmed correct by the scan.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/fix-line-item-inconsistencies.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(process.env.WC_CONSUMER_KEY + ':' + process.env.WC_CONSUMER_SECRET).toString('base64')
const wcBase = process.env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3'
const toCents = (s) => Math.round(parseFloat(s || '0') * 100)
const normalize = (s) => (s || '').trim().toLowerCase()

// --- 1. Find all mismatches (same logic as analyze script) -----------
console.log('Loading orders + items ...')
let allOrders = []
let from = 0
while (true) {
  const { data } = await sb.from('orders').select('id, order_number, subtotal').range(from, from + 999)
  if (!data?.length) break
  allOrders = allOrders.concat(data)
  if (data.length < 1000) break
  from += 1000
}

const itemSumByOrder = new Map()
const ids = allOrders.map(o => o.id)
for (let i = 0; i < ids.length; i += 200) {
  const batch = ids.slice(i, i + 200)
  const { data } = await sb.from('order_items').select('order_id, line_total').in('order_id', batch)
  for (const it of data ?? []) itemSumByOrder.set(it.order_id, (itemSumByOrder.get(it.order_id) ?? 0) + (it.line_total ?? 0))
}

const mismatches = []
for (const o of allOrders) {
  const sum = itemSumByOrder.get(o.id) ?? 0
  if (sum !== o.subtotal) mismatches.push({ ...o, lineitem_sum: sum, delta: sum - o.subtotal })
}

const toFixSubtotal = mismatches.filter(m => m.lineitem_sum > 0)   // items present → rewrite subtotal
const toReimport   = mismatches.filter(m => m.lineitem_sum === 0)  // zero items → fetch from WC
console.log(`Mismatches:               ${mismatches.length}`)
console.log(`  subtotal rewrites:      ${toFixSubtotal.length}`)
console.log(`  item re-imports (WC):   ${toReimport.length}`)

if (DRY_RUN) {
  console.log('\nDRY RUN — first 5 subtotal rewrites:')
  for (const m of toFixSubtotal.slice(0, 5)) console.log(`  ${m.order_number}  subtotal €${(m.subtotal/100).toFixed(2)} → €${(m.lineitem_sum/100).toFixed(2)}`)
  console.log('\nZero-item orders to re-import:')
  for (const m of toReimport) console.log(`  ${m.order_number}  subtotal=€${(m.subtotal/100).toFixed(2)}`)
  process.exit(0)
}

mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['order_number', 'action', 'old_subtotal', 'new_subtotal', 'items_inserted', 'error']]

// --- 2. Fix subtotals (concurrency 20) -------------------------------
console.log('\nRewriting subtotals ...')
let subDone = 0, subFailed = 0
async function fixOne(m) {
  const { error } = await sb.from('orders').update({ subtotal: m.lineitem_sum }).eq('id', m.id)
  if (error) { subFailed++; audit.push([m.order_number, 'rewrite_subtotal', m.subtotal/100, m.lineitem_sum/100, 0, error.message]); return }
  audit.push([m.order_number, 'rewrite_subtotal', (m.subtotal/100).toFixed(2), (m.lineitem_sum/100).toFixed(2), 0, ''])
  subDone++
}
for (let i = 0; i < toFixSubtotal.length; i += 20) {
  await Promise.all(toFixSubtotal.slice(i, i + 20).map(fixOne))
}
console.log(`  rewritten: ${subDone}  failed: ${subFailed}`)

// --- 3. Re-import items for zero-item orders -------------------------
if (toReimport.length) {
  console.log('\nLoading product catalogue for matching ...')
  const { data: products } = await sb.from('products').select('id, sku, name, cost_cents, tax_rate')
  const prodBySku = new Map()
  const prodByName = new Map()
  for (const p of products ?? []) {
    if (p.sku) prodBySku.set(p.sku, p)
    if (p.name) prodByName.set(normalize(p.name), p)
  }

  console.log('Re-importing items from WC ...')
  let imported = 0, reimpFailed = 0
  for (const m of toReimport) {
    const wcId = m.order_number.replace(/^WOO-/, '')
    const r = await fetch(`${wcBase}/orders/${wcId}`, { headers: { Authorization: wcAuth } })
    if (!r.ok) { reimpFailed++; audit.push([m.order_number, 'reimport_items', '', '', 0, `WC ${r.status}`]); continue }
    const wo = await r.json()
    const newItems = (wo.line_items ?? []).map(li => {
      const p = (li.sku && prodBySku.get(li.sku)) || prodByName.get(normalize(li.name))
      return {
        order_id: m.id,
        product_id: p?.id ?? null,
        product_name: li.name,
        product_sku: li.sku || null,
        quantity: parseFloat(li.quantity) || 0,
        unit_price: toCents(li.price),
        cost_cents: p?.cost_cents ?? 0,
        discount_amount: 0,
        tax_rate: p?.tax_rate ?? 9,
        tax_amount: toCents(li.total_tax),
        total: toCents(li.total),
        line_total: toCents(li.total),
        unit_type: 'piece',
      }
    })
    if (!newItems.length) { audit.push([m.order_number, 'reimport_items', '', '', 0, 'WC has no items']); continue }
    const { error } = await sb.from('order_items').insert(newItems)
    if (error) { reimpFailed++; audit.push([m.order_number, 'reimport_items', '', '', 0, error.message]); continue }
    // Also fix subtotal to match new items sum
    const newSubtotal = newItems.reduce((s, it) => s + (it.line_total ?? 0), 0)
    await sb.from('orders').update({ subtotal: newSubtotal }).eq('id', m.id)
    imported++
    audit.push([m.order_number, 'reimport_items', (m.subtotal/100).toFixed(2), (newSubtotal/100).toFixed(2), newItems.length, ''])
  }
  console.log(`  imported: ${imported}  failed: ${reimpFailed}`)
}

// --- 4. Write audit + summary ---------------------------------------
const auditPath = resolve('migration-data', `fix-line-items-${today}.csv`)
writeFileSync(auditPath, audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))
console.log(`\nAudit trail: ${auditPath}`)
