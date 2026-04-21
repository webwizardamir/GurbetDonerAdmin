// Refresh order_items.cost_cents from the current products.cost_cents.
//
// This matches WooCommerce's analytics model, which computes per-line COGS
// as (current product cost × quantity at sale). Our Phase E import snapshotted
// product cost at import-time — which was 0 or stale for most products since
// product-cost sync ran later. Without this, profit analytics diverge.
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

// Pull products (id → cost_cents)
const { data: products } = await sb.from('products').select('id, name, cost_cents')
console.log(`Products: ${products.length}`)

// For each product, count items that need updating (cost_cents mismatch)
let totalToUpdate = 0
const plan = []
for (const p of products) {
  const { count } = await sb.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', p.id).neq('cost_cents', p.cost_cents)
  if ((count ?? 0) > 0) {
    plan.push({ productId: p.id, name: p.name, cost: p.cost_cents, count })
    totalToUpdate += count
  }
}
console.log(`Products with stale order_items: ${plan.length}`)
console.log(`Total order_items to update:     ${totalToUpdate}`)

if (DRY_RUN) {
  console.log('\nSample of first 10:')
  for (const p of plan.slice(0, 10)) console.log(`  ${p.name.padEnd(45)} new_cost=€${(p.cost/100).toFixed(2)}  affects ${p.count} items`)
  process.exit(0)
}

// Apply: concurrent batches of 10
let updated = 0, failed = 0
const CONCURRENCY = 10
async function applyOne(p) {
  const { error, count } = await sb.from('order_items')
    .update({ cost_cents: p.cost }).eq('product_id', p.productId).neq('cost_cents', p.cost)
    .select('id', { count: 'exact', head: true })
  if (error) { failed++; console.error(`  ${p.name}: ${error.message}`); return }
  updated += count ?? 0
}
for (let i = 0; i < plan.length; i += CONCURRENCY) {
  await Promise.all(plan.slice(i, i + CONCURRENCY).map(applyOne))
  process.stdout.write(`  ${Math.min(i + CONCURRENCY, plan.length)}/${plan.length} products\r`)
}
console.log(`\nitems updated: ${updated}  failed: ${failed}`)

// Audit summary
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
writeFileSync(resolve('migration-data', `sync-order-item-costs-${today}.csv`), [
  'product_name,new_cost_cents,items_affected',
  ...plan.map(p => `"${p.name.replace(/"/g, '""')}",${p.cost},${p.count}`),
].join('\n'))
console.log(`Audit: migration-data/sync-order-item-costs-${today}.csv`)
