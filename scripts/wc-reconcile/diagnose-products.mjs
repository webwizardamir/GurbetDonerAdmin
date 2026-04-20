// Comprehensive product reconciliation diagnostic. READ-ONLY.
// Outputs a CSV: migration-data/product-diff.csv
// Columns:
//   sb_id, sb_name, sb_sku, sb_price, sb_cost, sb_active,
//   wc_match_by, wc_id, wc_name, wc_sku, wc_price, wc_cost, wc_status,
//   sb_order_items_using, orphan, duplicate_of, notes

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(process.env.WC_CONSUMER_KEY + ':' + process.env.WC_CONSUMER_SECRET).toString('base64')
const wcBase = process.env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3'
const toCents = (s) => Math.round(parseFloat(s || '0') * 100)
const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

// --- 1. Pull all SB products + per-product order_item counts ----------
console.log('Loading SB products ...')
const { data: sbProducts } = await sb.from('products').select('id, name, sku, base_price, cost_cents, tax_rate, is_active')
console.log(`  count: ${sbProducts.length}`)

console.log('Counting order_items per product ...')
const itemCount = new Map()
// Count order_items per product via aggregation — PostgREST doesn't support group_by,
// so we iterate using .select(product_id) which is O(all items). Acceptable for ~30k.
let from = 0
while (true) {
  const { data } = await sb.from('order_items').select('product_id').range(from, from + 999)
  if (!data?.length) break
  for (const r of data) if (r.product_id) itemCount.set(r.product_id, (itemCount.get(r.product_id) ?? 0) + 1)
  if (data.length < 1000) break
  from += 1000
}

// --- 2. Pull all WC products (paginated) ----------------------------
console.log('Loading WC products ...')
const wcProducts = []
{
  let page = 1
  while (true) {
    const r = await fetch(`${wcBase}/products?per_page=100&page=${page}&status=any`, { headers: { Authorization: wcAuth } })
    if (!r.ok) { console.error(`WC ${r.status}`); break }
    const batch = await r.json()
    for (const p of batch) {
      const cog = p.meta_data?.find(m => m.key === '_cost_of_goods')?.value
      wcProducts.push({
        id: p.id,
        name: p.name,
        sku: p.sku || null,
        price_cents: toCents(p.regular_price),
        sale_price_cents: p.sale_price ? toCents(p.sale_price) : null,
        cost_cents: cog ? toCents(cog) : 0,
        status: p.status,
      })
    }
    if (batch.length < 100) break
    page++
  }
}
console.log(`  count: ${wcProducts.length}`)

// --- 3. Build WC lookup indices -------------------------------------
const wcBySku = new Map()
const wcByNormName = new Map()
for (const w of wcProducts) {
  if (w.sku) wcBySku.set(w.sku, w)
  if (w.name) {
    const key = normalize(w.name)
    if (!wcByNormName.has(key)) wcByNormName.set(key, [])
    wcByNormName.get(key).push(w)
  }
}

// --- 4. Match SB to WC ----------------------------------------------
const rows = []
let matchedBySku = 0, matchedByName = 0, orphan = 0
for (const s of sbProducts) {
  const uses = itemCount.get(s.id) ?? 0
  let w = null, matchBy = ''
  if (s.sku && wcBySku.has(s.sku)) { w = wcBySku.get(s.sku); matchBy = 'sku' }
  else {
    const cand = wcByNormName.get(normalize(s.name))
    if (cand?.length === 1) { w = cand[0]; matchBy = 'name' }
    else if (cand?.length > 1) { matchBy = 'name_ambiguous' }
  }
  if (w) { matchBy === 'sku' ? matchedBySku++ : matchedByName++ }
  else { orphan++ }
  rows.push({
    sb: s, uses, w, matchBy,
  })
}
console.log(`\nSB→WC match: sku=${matchedBySku} name=${matchedByName} orphan=${orphan}`)

// --- 5. For each orphan, find best sibling SB product for relinking
// Strategy: find SB products that ARE matched to WC, whose names share tokens.
const matchedSb = rows.filter(r => r.w).map(r => ({ ...r.sb, matchedWc: r.w }))
function tokens(name) { return normalize(name).split(/[^a-z0-9]+/).filter(t => t.length >= 3) }
function similarity(a, b) {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b))
  let hits = 0
  for (const t of ta) if (tb.has(t)) hits++
  return hits / Math.max(ta.size, tb.size, 1)
}
for (const r of rows) {
  if (r.w) continue  // not an orphan
  let best = null, bestScore = 0
  for (const candidate of matchedSb) {
    const score = similarity(r.sb.name, candidate.name)
    if (score > bestScore) { bestScore = score; best = candidate }
  }
  r.suggestedMergeTarget = best && bestScore >= 0.5 ? { id: best.id, name: best.name, score: bestScore } : null
}

// --- 6. Write CSV ----------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const header = ['sb_id','sb_name','sb_sku','sb_price','sb_cost','sb_active',
  'orders_using','match_by','wc_id','wc_name','wc_sku','wc_price','wc_cost','wc_status',
  'suggested_merge_target_id','suggested_merge_target_name','merge_score']
const lines = [header.join(',')]
for (const r of rows) {
  const w = r.w
  const cells = [
    r.sb.id, r.sb.name, r.sb.sku ?? '', (r.sb.base_price/100).toFixed(2), (r.sb.cost_cents/100).toFixed(2), r.sb.is_active,
    r.uses, r.matchBy,
    w?.id ?? '', w?.name ?? '', w?.sku ?? '', w ? (w.price_cents/100).toFixed(2) : '', w ? (w.cost_cents/100).toFixed(2) : '', w?.status ?? '',
    r.suggestedMergeTarget?.id ?? '', r.suggestedMergeTarget?.name ?? '', r.suggestedMergeTarget?.score?.toFixed(2) ?? '',
  ]
  lines.push(cells.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(','))
}
const out = resolve('migration-data', 'product-diff.csv')
writeFileSync(out, lines.join('\n'))
console.log(`\nFull diff: ${out}`)

// --- 7. Summary printouts --------------------------------------------
const missingCostInSb = rows.filter(r => r.w && r.w.cost_cents > 0 && r.sb.cost_cents === 0)
const priceMismatch = rows.filter(r => r.w && r.sb.base_price !== r.w.price_cents)
const costMismatch = rows.filter(r => r.w && r.w.cost_cents > 0 && r.sb.cost_cents > 0 && r.sb.cost_cents !== r.w.cost_cents)
const orphansWithOrders = rows.filter(r => !r.w && r.uses > 0)
const orphansNoOrders = rows.filter(r => !r.w && r.uses === 0)
const wcNotInSb = wcProducts.filter(w => !rows.some(r => r.w?.id === w.id))

console.log('\n=== SUMMARY ===')
console.log(`SB matched to WC:                 ${matchedBySku + matchedByName}`)
console.log(`  by SKU:                         ${matchedBySku}`)
console.log(`  by name:                        ${matchedByName}`)
console.log(`SB orphans (no WC match):         ${orphan}`)
console.log(`  with ≥1 order (needs relink):   ${orphansWithOrders.length}`)
console.log(`  with 0 orders (safe delete):    ${orphansNoOrders.length}`)
console.log(`WC products not in SB:            ${wcNotInSb.length}`)
console.log(`\nData gaps on matched products:`)
console.log(`  SB.cost_cents=0 but WC has cost:  ${missingCostInSb.length}`)
console.log(`  price mismatch (SB vs WC):        ${priceMismatch.length}`)
console.log(`  cost mismatch (both have non-zero): ${costMismatch.length}`)

console.log('\nFirst 8 orphans with orders:')
for (const r of orphansWithOrders.slice(0, 8)) {
  const s = r.suggestedMergeTarget
  console.log(`  ${r.sb.name.padEnd(45)} orders=${r.uses}  €${(r.sb.base_price/100).toFixed(2)}  → ${s ? s.name + ' (sim ' + s.score.toFixed(2) + ')' : 'no good candidate'}`)
}
console.log('\nFirst 8 WC products missing from SB:')
for (const w of wcNotInSb.slice(0, 8)) console.log(`  WC #${w.id} ${w.name} sku=${w.sku ?? '—'} €${(w.price_cents/100).toFixed(2)} cost=€${(w.cost_cents/100).toFixed(2)}`)
