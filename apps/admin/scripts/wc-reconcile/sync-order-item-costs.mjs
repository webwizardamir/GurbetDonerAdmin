// Refresh order_items.cost_cents from the current products.cost_cents — for
// IMPORTED (WooCommerce) orders ONLY.
//
// This matches WooCommerce's analytics model, which computes per-line COGS
// as (current product cost × quantity at sale). Our Phase E import snapshotted
// product cost at import-time — which was 0 or stale for most products since
// product-cost sync ran later. Without this, profit analytics diverge.
//
// GUARD (do not remove): in-app orders snapshot their cost at creation time —
// including negotiated per-price-list cost overrides (a bulk deal bought cheaper
// than the product default). Blanket-refreshing from current product cost would
// WIPE those negotiated costs and corrupt profit. So we only touch order_items
// whose order is imported (woo_invoice_number or woo_invoice_date set); in-app
// orders are immutable and left exactly as snapshotted.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/sync-order-item-costs.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PAGE = 1000

async function pageAll(table, columns, applyFilters = q => q) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    // Stable ORDER BY id — .range() paging without a deterministic order can
    // skip or duplicate rows across requests (a skipped order_item = stale cost).
    let q = sb.from(table).select(columns).order('id', { ascending: true }).range(from, from + PAGE - 1)
    q = applyFilters(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

// Products: id → cost_cents, id → name
const products = await pageAll('products', 'id, name, cost_cents')
const costByProduct = new Map(products.map(p => [p.id, p.cost_cents]))
const nameByProduct = new Map(products.map(p => [p.id, p.name]))
console.log(`Products: ${products.length}`)

// Imported order ids only (WC import). In-app orders are deliberately excluded.
const importedOrders = await pageAll('orders', 'id', q =>
  q.or('woo_invoice_number.not.is.null,woo_invoice_date.not.is.null'))
const importedIds = new Set(importedOrders.map(o => o.id))
console.log(`Imported orders: ${importedIds.size}`)

// Scan order_items, keep only imported rows whose cost is stale vs current product cost.
const orderItems = await pageAll('order_items', 'id, product_id, order_id, cost_cents')
const updates = [] // { id, cost }
const perProduct = new Map() // productId → count (for audit)
for (const oi of orderItems) {
  if (!importedIds.has(oi.order_id)) continue          // GUARD: skip in-app orders
  const target = costByProduct.get(oi.product_id)
  if (target == null) continue
  if (oi.cost_cents === target) continue
  updates.push({ id: oi.id, cost: target })
  perProduct.set(oi.product_id, (perProduct.get(oi.product_id) ?? 0) + 1)
}
console.log(`order_items scanned:            ${orderItems.length}`)
console.log(`Imported items to update:       ${updates.length}`)

if (DRY_RUN) {
  console.log('\nSample of first 10 products affected:')
  const sample = [...perProduct.entries()].slice(0, 10)
  for (const [pid, count] of sample) {
    console.log(`  ${(nameByProduct.get(pid) ?? pid).padEnd(45)} new_cost=€${((costByProduct.get(pid) ?? 0) / 100).toFixed(2)}  affects ${count} items`)
  }
  process.exit(0)
}

// Apply: group by target cost so each batch sets a single value, chunked by id.
const byCost = new Map()
for (const u of updates) {
  if (!byCost.has(u.cost)) byCost.set(u.cost, [])
  byCost.get(u.cost).push(u.id)
}
let updated = 0, failed = 0
for (const [cost, ids] of byCost) {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { error, count } = await sb.from('order_items')
      .update({ cost_cents: cost }).in('id', chunk)
      .select('id', { count: 'exact', head: true })
    if (error) { failed += chunk.length; console.error(`  ${error.message}`); continue }
    updated += count ?? chunk.length
  }
}
console.log(`items updated: ${updated}  failed: ${failed}`)

// Audit summary (per product affected)
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
writeFileSync(resolve('migration-data', `sync-order-item-costs-${today}.csv`), [
  'product_name,new_cost_cents,items_affected',
  ...[...perProduct.entries()].map(([pid, count]) =>
    `"${(nameByProduct.get(pid) ?? pid).replace(/"/g, '""')}",${costByProduct.get(pid) ?? 0},${count}`),
].join('\n'))
console.log(`Audit: migration-data/sync-order-item-costs-${today}.csv`)
