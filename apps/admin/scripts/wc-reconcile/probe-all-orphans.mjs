// Full sweep: for every SB product orphan (no WC match) PLUS a given list of
// named SB products, resolve each one to a WC product_id by sampling its
// order_items and checking line_item.product_id in WC. Output a verdict table:
//
//   - pid > 0 AND WC product exists  → MERGE candidate
//   - pid == 0 in all samples        → WC product DELETED → mark inactive
//   - mixed                          → AMBIGUOUS, needs manual review
//
// Read-only.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(process.env.WC_CONSUMER_KEY + ':' + process.env.WC_CONSUMER_SECRET).toString('base64')
const wcBase = process.env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3'
const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

async function wcGet(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: wcAuth } })
  if (!r.ok) return { __err: r.status }
  return r.json()
}

// --- 1. Build list of SB products to probe --------------------------
// = (all products that don't currently match any WC product by sku/name)
//   + user-requested specific SB products (the 5 nuggets + 4 burger dups)
console.log('Loading WC products ...')
const wcProducts = []
{
  let page = 1
  while (true) {
    const b = await wcGet(`/products?per_page=100&page=${page}&status=any`)
    if (b.__err) break
    wcProducts.push(...b)
    if (b.length < 100) break
    page++
  }
}
const wcBySku = new Map(), wcByName = new Map()
for (const w of wcProducts) {
  if (w.sku) wcBySku.set(w.sku, w)
  const k = normalize(w.name)
  if (!wcByName.has(k)) wcByName.set(k, [])
  wcByName.get(k).push(w)
}

console.log('Loading SB products ...')
const { data: sbAll } = await sb.from('products').select('id, name, sku, base_price, cost_cents, is_active')

const orphanIds = new Set()
for (const s of sbAll) {
  const bySku = s.sku && wcBySku.get(s.sku)
  const byName = wcByName.get(normalize(s.name))
  if (!bySku && (!byName || byName.length !== 1)) orphanIds.add(s.id)
}

// User-requested extras
const extraNames = [
  'Chicken Nuggets Classic ( Groothandel )',
  'CHICKEN NUGGETS CLASSIC (0.8kg)',
  'Chicken Nuggets Classic 800g ( Groothandel )',
  'CHICKEN BURGER ( 18x70 GR )',
  'CHICKEN BURGER  ( 18x70 GR )',
  'CHICKEN BURGER (18x70 GR)(Supermarket)',
  'CHICKEN BURGER ( 36x70 GR )',
  'CHICKEN BURGER  ( 36x70 GR )',
  'CHICKEN BURGER (36x70 GR)(Supermarket)',
]
// Pull by exact name, add to probe set (even if already matched, for completeness of the "series")
const { data: extras } = await sb.from('products').select('id, name, sku, base_price, cost_cents, is_active').in('name', extraNames)
const probeIds = new Set([...orphanIds, ...(extras ?? []).map(e => e.id)])
const sbIndex = new Map(sbAll.map(s => [s.id, s]))
console.log(`Probing ${probeIds.size} products (orphans=${orphanIds.size}, user-listed extras=${(extras?.length ?? 0)})`)

// --- 2. For each probe, sample up to 5 order_items + resolve via WC --
const verdicts = []
for (const id of probeIds) {
  const prod = sbIndex.get(id)
  const { data: items } = await sb.from('order_items').select('order_id, product_name, unit_price').eq('product_id', id).limit(5)
  const orderIds = [...new Set((items ?? []).map(i => i.order_id))]
  const { data: orders } = await sb.from('orders').select('id, order_number').in('id', orderIds)
  const orderMap = new Map((orders ?? []).map(o => [o.id, o.order_number]))

  const pidCounts = new Map()
  let fetchedN = 0
  for (const it of items ?? []) {
    const wcOrderId = orderMap.get(it.order_id)?.replace(/^WOO-/, '')
    const wo = await wcGet(`/orders/${wcOrderId}`)
    if (wo.__err) continue
    fetchedN++
    const li = wo.line_items?.find(l => normalize(l.name) === normalize(it.product_name))
    const pid = li?.product_id ?? null
    pidCounts.set(pid, (pidCounts.get(pid) ?? 0) + 1)
  }
  const entries = [...pidCounts.entries()].sort((a, b) => b[1] - a[1])
  const [topPid, topCount] = entries[0] ?? []
  const diverse = entries.length > 1

  let verdict, wcName = '', wcPrice = '', wcCog = '', wcStatus = ''
  if (items?.length === 0) verdict = 'no_orders'
  else if (!topPid && pidCounts.size === 0) verdict = 'fetch_failed'
  else if (topPid === 0 && !diverse) verdict = 'wc_deleted_all_samples_pid_0'
  else if (topPid === 0 && diverse) verdict = 'partial_wc_deleted_mixed'
  else {
    const wp = await wcGet(`/products/${topPid}`)
    if (wp.__err) verdict = 'wc_product_missing'
    else {
      wcName = wp.name
      wcPrice = wp.regular_price
      wcCog = wp.meta_data?.find(m => m.key === '_cost_of_goods')?.value ?? ''
      wcStatus = wp.status
      verdict = diverse ? 'resolved_with_minority_variants' : 'resolved_clean'
    }
  }

  verdicts.push({
    sbId: id,
    sbName: prod.name,
    sbSku: prod.sku ?? '',
    sbPrice: prod.base_price,
    sbCost: prod.cost_cents,
    orders: items?.length ?? 0,
    fetched: fetchedN,
    topPid,
    topCount,
    distribution: entries.map(([p, n]) => `${p ?? 'null'}:${n}`).join('|'),
    verdict,
    wcName,
    wcPrice,
    wcCog,
    wcStatus,
  })
}

// --- 3. Print summary + per-item lines ------------------------------
const byVerdict = {}
for (const v of verdicts) byVerdict[v.verdict] = (byVerdict[v.verdict] ?? 0) + 1
console.log('\nVerdict counts:')
for (const [k, n] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(40)} ${n}`)

// Detail: group by WC target (topPid) to see collapses
console.log('\nResolved targets (WC product_id → SB products that map to it):')
const byTarget = new Map()
for (const v of verdicts) {
  if (!v.verdict.startsWith('resolved')) continue
  if (!byTarget.has(v.topPid)) byTarget.set(v.topPid, [])
  byTarget.get(v.topPid).push(v)
}
const collapses = [...byTarget.entries()].filter(([, arr]) => arr.length > 1).sort((a, b) => b[1].length - a[1].length)
for (const [pid, arr] of collapses) {
  console.log(`\n  WC #${pid} "${arr[0].wcName}" (current price €${arr[0].wcPrice}, cog €${arr[0].wcCog || '0'}):`)
  for (const v of arr) console.log(`    ← SB "${v.sbName}" (price €${(v.sbPrice/100).toFixed(2)}, cost €${(v.sbCost/100).toFixed(2)}, ${v.orders} order_items)`)
}

console.log('\nSingleton resolved orphans (just relink + delete the orphan):')
for (const [pid, arr] of [...byTarget.entries()].filter(([, a]) => a.length === 1)) {
  const v = arr[0]
  console.log(`  "${v.sbName.padEnd(45)}" → WC #${pid} "${v.wcName}"  (orders=${v.orders})`)
}

console.log('\nInactive candidates (pid=0 / WC product deleted):')
for (const v of verdicts.filter(x => x.verdict === 'wc_deleted_all_samples_pid_0' || x.verdict === 'partial_wc_deleted_mixed' || x.verdict === 'wc_product_missing')) {
  console.log(`  "${v.sbName}"  dist=[${v.distribution}]  orders=${v.orders}`)
}

// Dump full CSV
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const lines = [
  'sb_id,sb_name,sb_sku,sb_price,sb_cost,orders_sampled,fetched,top_wc_pid,pid_distribution,verdict,wc_name,wc_price,wc_cog,wc_status',
  ...verdicts.map(v => [
    v.sbId, v.sbName, v.sbSku, (v.sbPrice/100).toFixed(2), (v.sbCost/100).toFixed(2),
    v.orders, v.fetched, v.topPid ?? '', v.distribution, v.verdict, v.wcName, v.wcPrice, v.wcCog, v.wcStatus,
  ].map(x => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(','))
]
const out = resolve('migration-data', `orphan-resolution-${today}.csv`)
writeFileSync(out, lines.join('\n'))
console.log(`\nFull CSV: ${out}`)
