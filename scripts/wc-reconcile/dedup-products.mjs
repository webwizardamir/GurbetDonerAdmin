// Deterministic product dedup using products.woo_product_id (populated by
// backfill-woo-product-id.mjs). Steps:
//
//   1. For each "loser" SB product (woo_product_id IS NULL but its orders
//      resolve to a pid that is already owned by another SB product):
//        - reassign order_items.product_id → primary
//        - reassign customer_prices.customer_id (by product_id; skip conflicts)
//        - delete the loser
//
//   2. For primaries that are now owners, overwrite name/base_price/cost_cents
//      from WC's current values (so SB displays match WC).
//
//   3. Mark is_active=false on orphan SB products that never resolved
//      (their WC product_id is deleted / 0).
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/dedup-products.mjs [--dry-run]

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
const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

async function wcGet(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: wcAuth } })
  if (!r.ok) return { __err: r.status }
  return r.json()
}

// --- 1. Pull primaries + losers ------------------------------------
// Primary = SB product with woo_product_id SET (from backfill).
// Loser   = SB product with woo_product_id NULL, sampled pid > 0 that matches a primary.
//
// Re-derive losers by sampling (same logic as backfill Path B), this time
// resolving each to the current primary SB id.
const { data: allProd } = await sb.from('products').select('id, name, sku, base_price, cost_cents, woo_product_id, is_active, tax_rate')
const primaryByWcId = new Map()  // wcId → sbRow
const pending = []               // sbRow[]  (woo_product_id IS NULL)
for (const p of allProd) {
  if (p.woo_product_id) primaryByWcId.set(p.woo_product_id, p)
  else pending.push(p)
}
console.log(`SB products:           ${allProd.length}`)
console.log(`Primaries (tagged):    ${primaryByWcId.size}`)
console.log(`Pending (untagged):    ${pending.length}`)

// Pre-load WC product data for each primary's wcId (for name/price/cost rewrite)
const wcCache = new Map()
for (const wcId of primaryByWcId.keys()) {
  const wp = await wcGet(`/products/${wcId}`)
  if (!wp.__err) wcCache.set(wcId, wp)
}

// --- 2. Resolve each pending product via order sampling ------------
const loserPlan = []         // { loser, primary }
const inactiveCandidates = [] // pending with no resolution
console.log('\nResolving pending via order sampling ...')
for (let i = 0; i < pending.length; i++) {
  const s = pending[i]
  const { data: items } = await sb.from('order_items').select('order_id, product_name').eq('product_id', s.id).limit(5)
  if (!items?.length) { inactiveCandidates.push({ sb: s, reason: 'no_orders' }); continue }
  const { data: ords } = await sb.from('orders').select('id, order_number').in('id', items.map(it => it.order_id))
  const omap = new Map((ords ?? []).map(o => [o.id, o.order_number]))

  const pidCounts = new Map()
  for (const it of items) {
    const wcOrderId = omap.get(it.order_id)?.replace(/^WOO-/, '')
    const wo = await wcGet(`/orders/${wcOrderId}`)
    if (wo.__err) continue
    const li = wo.line_items?.find(l => normalize(l.name) === normalize(it.product_name))
    if (li?.product_id !== undefined) pidCounts.set(li.product_id, (pidCounts.get(li.product_id) ?? 0) + 1)
  }
  const [topPid] = [...pidCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!topPid || topPid === 0) { inactiveCandidates.push({ sb: s, reason: 'pid_0_or_deleted' }); continue }
  const primary = primaryByWcId.get(topPid)
  if (!primary) {
    // pending resolves to a WC id no primary owns — can happen if two pending
    // products both resolve to the same WC id (race in backfill). Promote this
    // one to primary now.
    loserPlan.push({ loser: null, primary: s, promoteTo: topPid })
    primaryByWcId.set(topPid, { ...s, woo_product_id: topPid })
    const wp = wcCache.get(topPid) ?? (await wcGet(`/products/${topPid}`))
    if (!wp.__err) wcCache.set(topPid, wp)
    continue
  }
  loserPlan.push({ loser: s, primary })
  process.stdout.write(`  ${i + 1}/${pending.length}\r`)
}
console.log(`\nPlanned merges:        ${loserPlan.filter(p => p.loser).length}`)
console.log(`Promote-to-primary:    ${loserPlan.filter(p => p.promoteTo).length}`)
console.log(`Inactive candidates:   ${inactiveCandidates.length}`)

// --- 3. Dry-run output --------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action','sb_id','sb_name','target_id','target_name','wc_id','note']]

if (DRY_RUN) {
  console.log('\nMerges:')
  for (const p of loserPlan) {
    if (!p.loser) continue
    console.log(`  ${p.loser.name.padEnd(50)} → ${p.primary.name.padEnd(40)} (WC #${p.primary.woo_product_id})`)
  }
  console.log('\nPromotions (no pre-existing primary):')
  for (const p of loserPlan.filter(x => x.promoteTo)) console.log(`  ${p.primary.name}  → tag as primary for WC #${p.promoteTo}`)
  console.log('\nInactive candidates:')
  for (const i of inactiveCandidates) console.log(`  ${i.sb.name.padEnd(50)} (${i.reason})`)
  process.exit(0)
}

// --- 4. Apply -----------------------------------------------------

// 4a) Promotions first (so merges that depend on new primaries succeed)
let promoted = 0
for (const p of loserPlan.filter(x => x.promoteTo && x.primary)) {
  const wp = wcCache.get(p.promoteTo)
  const { error } = await sb.from('products')
    .update({ woo_product_id: p.promoteTo, woo_status: wp?.status ?? null })
    .eq('id', p.primary.id).is('woo_product_id', null)
  if (!error) { promoted++; audit.push(['promote', p.primary.id, p.primary.name, '', '', p.promoteTo, '']) }
  else audit.push(['promote_failed', p.primary.id, p.primary.name, '', '', p.promoteTo, error.message])
}

// 4b) Merges: reassign orders + prices, then delete loser
let merged = 0, failed = 0
for (const p of loserPlan) {
  if (!p.loser) continue
  // Reassign order_items
  const { error: e1 } = await sb.from('order_items').update({ product_id: p.primary.id }).eq('product_id', p.loser.id)
  if (e1) { failed++; audit.push(['merge_failed', p.loser.id, p.loser.name, p.primary.id, p.primary.name, p.primary.woo_product_id, 'order_items_update:' + e1.message]); continue }

  // Reassign customer_prices (skip conflicts with primary)
  const { data: loserPrices } = await sb.from('customer_prices').select('id, customer_id, unit_type').eq('product_id', p.loser.id)
  if (loserPrices?.length) {
    const { data: primaryPrices } = await sb.from('customer_prices').select('customer_id, unit_type').eq('product_id', p.primary.id)
    const primaryKeys = new Set((primaryPrices ?? []).map(x => `${x.customer_id}|${x.unit_type ?? ''}`))
    for (const lp of loserPrices) {
      const key = `${lp.customer_id}|${lp.unit_type ?? ''}`
      if (primaryKeys.has(key)) continue
      await sb.from('customer_prices').update({ product_id: p.primary.id }).eq('id', lp.id)
    }
  }

  // Also product_unit_prices (per-unit base prices on the product itself)
  const { data: loserUnitPrices } = await sb.from('product_unit_prices').select('id, unit_type').eq('product_id', p.loser.id)
  if (loserUnitPrices?.length) {
    const { data: primaryUnitPrices } = await sb.from('product_unit_prices').select('unit_type').eq('product_id', p.primary.id)
    const primaryUnits = new Set((primaryUnitPrices ?? []).map(x => x.unit_type))
    for (const lup of loserUnitPrices) {
      if (primaryUnits.has(lup.unit_type)) continue
      await sb.from('product_unit_prices').update({ product_id: p.primary.id }).eq('id', lup.id)
    }
  }

  // Delete loser
  const { error: e2 } = await sb.from('products').delete().eq('id', p.loser.id)
  if (e2) { failed++; audit.push(['merge_failed', p.loser.id, p.loser.name, p.primary.id, p.primary.name, p.primary.woo_product_id, 'delete:' + e2.message]); continue }

  merged++
  audit.push(['merge', p.loser.id, p.loser.name, p.primary.id, p.primary.name, p.primary.woo_product_id, ''])
}

// 4c) Rewrite primary name / base_price / cost_cents from WC (authoritative)
let rewritten = 0
for (const [wcId, primary] of primaryByWcId) {
  const wp = wcCache.get(wcId)
  if (!wp) continue
  const cog = wp.meta_data?.find(m => m.key === '_cost_of_goods')?.value
  const patch = {}
  if (primary.name !== wp.name) patch.name = wp.name
  const wcPrice = toCents(wp.regular_price)
  if (wcPrice > 0 && primary.base_price !== wcPrice) patch.base_price = wcPrice
  const wcCost = cog ? toCents(cog) : 0
  if (wcCost > 0 && primary.cost_cents !== wcCost) patch.cost_cents = wcCost
  if (primary.woo_status !== wp.status) patch.woo_status = wp.status
  if (Object.keys(patch).length) {
    const { error } = await sb.from('products').update(patch).eq('id', primary.id)
    if (!error) rewritten++
  }
}

// 4d) Mark inactive candidates is_active=false
let deactivated = 0
for (const ic of inactiveCandidates) {
  const { error } = await sb.from('products').update({ is_active: false }).eq('id', ic.sb.id).eq('is_active', true)
  if (!error) { deactivated++; audit.push(['mark_inactive', ic.sb.id, ic.sb.name, '', '', '', ic.reason]) }
}

writeFileSync(resolve('migration-data', `dedup-products-${today}.csv`), audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nPromoted:     ${promoted}`)
console.log(`Merged:       ${merged}  failed: ${failed}`)
console.log(`Rewrote name/price/cost on primaries: ${rewritten}`)
console.log(`Deactivated:  ${deactivated}`)
console.log(`Audit: migration-data/dedup-products-${today}.csv`)
