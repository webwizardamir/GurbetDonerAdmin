// Populate products.woo_product_id for every SB product:
//   Path A (fast): match by SKU → unique name against the WC catalogue.
//   Path B (sampling): for SB products without a Path A match, sample up to
//     5 order_items, fetch each WC order, find line_item with the same
//     product_name snapshot, take the mode of line_item.product_id.
// Also populates products.woo_status.
//
// Safe + idempotent: only writes where woo_product_id IS NULL.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/backfill-woo-product-id.mjs [--dry-run]

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
const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

async function wcGet(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: wcAuth } })
  if (!r.ok) return { __err: r.status }
  return r.json()
}

// --- Column existence guard ------------------------------------------
{
  const probe = await sb.from('products').select('id, woo_product_id').limit(1)
  if (probe.error) {
    console.error('Column missing — apply migration 00040 first.\n', probe.error.message)
    process.exit(1)
  }
}

// --- 1. Load WC catalogue -------------------------------------------
console.log('Loading WC catalogue ...')
const wcProducts = []
{
  let page = 1
  while (true) {
    const batch = await wcGet(`/products?per_page=100&page=${page}&status=any`)
    if (batch.__err) { console.error(`WC ${batch.__err}`); break }
    wcProducts.push(...batch)
    if (batch.length < 100) break
    page++
  }
}
console.log(`  WC=${wcProducts.length}`)

const wcBySku = new Map(), wcByName = new Map(), wcById = new Map()
for (const w of wcProducts) {
  wcById.set(w.id, w)
  if (w.sku) wcBySku.set(w.sku, w)
  const k = normalize(w.name)
  if (!wcByName.has(k)) wcByName.set(k, [])
  wcByName.get(k).push(w)
}

// --- 2. Load SB products -------------------------------------------
const { data: sbProducts } = await sb.from('products').select('id, name, sku, base_price, cost_cents, woo_product_id, is_active')
console.log(`  SB=${sbProducts.length}`)

// Path A: match each SB product via SKU then unique name
const assignments = new Map()  // sb_id → { wcId, wcStatus, matchBy }
const needSampling = []
for (const s of sbProducts) {
  if (s.woo_product_id) continue  // already set
  let hit = null, matchBy = ''
  if (s.sku && wcBySku.has(s.sku)) { hit = wcBySku.get(s.sku); matchBy = 'sku' }
  else {
    const cand = wcByName.get(normalize(s.name))
    if (cand?.length === 1) { hit = cand[0]; matchBy = 'name' }
  }
  if (hit) assignments.set(s.id, { wcId: hit.id, wcStatus: hit.status, matchBy })
  else needSampling.push(s)
}
console.log(`Path A (sku/name): ${assignments.size} products matched directly`)
console.log(`Need order sampling: ${needSampling.length}`)

// --- 3. Path B: order sampling for unmatched SB products -----------
for (let i = 0; i < needSampling.length; i++) {
  const s = needSampling[i]
  const { data: items } = await sb.from('order_items').select('order_id, product_name').eq('product_id', s.id).limit(5)
  if (!items?.length) continue
  const { data: orders } = await sb.from('orders').select('id, order_number').in('id', items.map(it => it.order_id))
  const map = new Map((orders ?? []).map(o => [o.id, o.order_number]))
  const pidCounts = new Map()
  for (const it of items) {
    const wcOrderId = map.get(it.order_id)?.replace(/^WOO-/, '')
    const wo = await wcGet(`/orders/${wcOrderId}`)
    if (wo.__err) continue
    const li = wo.line_items?.find(l => normalize(l.name) === normalize(it.product_name))
    const pid = li?.product_id
    if (pid !== undefined) pidCounts.set(pid, (pidCounts.get(pid) ?? 0) + 1)
  }
  const [topPid] = [...pidCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!topPid || topPid === 0) continue  // keep NULL — will be marked inactive in dedup
  const wp = wcById.get(topPid) ?? (await wcGet(`/products/${topPid}`))
  if (wp?.__err) continue
  assignments.set(s.id, { wcId: topPid, wcStatus: wp?.status ?? 'unknown', matchBy: 'sampled' })
  if ((i + 1) % 5 === 0) process.stdout.write(`  sampled ${i + 1}/${needSampling.length}\r`)
}
console.log(`\nTotal assignments: ${assignments.size}`)

// --- 4. Apply (with UNIQUE conflict detection) ---------------------
// Some SB products may point to the same WC id (confirmed duplicates).
// UNIQUE(woo_product_id) would reject the second UPDATE. Strategy:
// assign woo_product_id only to the "primary" per group; losers remain NULL,
// flagged for dedup script to merge.
const byWcId = new Map()
for (const [sbId, a] of assignments) {
  if (!byWcId.has(a.wcId)) byWcId.set(a.wcId, [])
  byWcId.get(a.wcId).push({ sbId, ...a })
}

const primaryBySb = new Map()  // sbId → a
const losers = []              // sbId (second+ in a group)
const sbById = new Map(sbProducts.map(s => [s.id, s]))
for (const [wcId, group] of byWcId) {
  // Choose primary: matched by sku > matched by name > sampled; break ties by
  // having cost_cents > 0, then most orders (we'll approximate via base_price > 0).
  group.sort((a, b) => {
    const rank = { sku: 0, name: 1, sampled: 2 }
    if (rank[a.matchBy] !== rank[b.matchBy]) return rank[a.matchBy] - rank[b.matchBy]
    const ca = sbById.get(a.sbId)?.cost_cents ?? 0
    const cb = sbById.get(b.sbId)?.cost_cents ?? 0
    if (ca !== cb) return cb - ca
    const pa = sbById.get(a.sbId)?.base_price ?? 0
    const pb = sbById.get(b.sbId)?.base_price ?? 0
    return pb - pa
  })
  primaryBySb.set(group[0].sbId, group[0])
  for (const g of group.slice(1)) losers.push({ sbId: g.sbId, wantsWcId: wcId, losesTo: group[0].sbId })
}

console.log(`\nPrimaries to tag:        ${primaryBySb.size}`)
console.log(`Collapse losers (kept unlinked for dedup): ${losers.length}`)

// Audit
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action','sb_id','sb_name','wc_id','match_by','note']]

if (DRY_RUN) {
  console.log('\nDRY RUN — sample of 5 primaries:')
  let n = 0
  for (const [sbId, a] of primaryBySb) {
    if (n++ >= 5) break
    const s = sbById.get(sbId)
    const wp = wcById.get(a.wcId)
    console.log(`  ${s.name.padEnd(50)} → WC #${a.wcId} "${wp?.name}" [${a.matchBy}]`)
  }
  console.log('\nCollapse losers (SB products that will merge in dedup step):')
  for (const l of losers) {
    const s = sbById.get(l.sbId)
    const p = sbById.get(l.losesTo)
    console.log(`  ${s.name.padEnd(50)} → WC #${l.wantsWcId} (primary: "${p.name}")`)
  }
  process.exit(0)
}

// Apply — primaries only. Losers get their woo_product_id set by the dedup script.
let applied = 0, failed = 0
const CONCURRENCY = 15
const entries = [...primaryBySb.entries()]
async function applyOne([sbId, a]) {
  const wp = wcById.get(a.wcId)
  const { error } = await sb.from('products')
    .update({ woo_product_id: a.wcId, woo_status: wp?.status ?? a.wcStatus })
    .eq('id', sbId).is('woo_product_id', null)
  const s = sbById.get(sbId)
  if (error) { failed++; audit.push(['tag_primary_failed', sbId, s.name, a.wcId, a.matchBy, error.message]) }
  else { applied++; audit.push(['tag_primary', sbId, s.name, a.wcId, a.matchBy, '']) }
}
for (let i = 0; i < entries.length; i += CONCURRENCY) {
  await Promise.all(entries.slice(i, i + CONCURRENCY).map(applyOne))
}

for (const l of losers) {
  const s = sbById.get(l.sbId)
  audit.push(['queued_for_merge', l.sbId, s.name, l.wantsWcId, '', `loses_to:${l.losesTo}`])
}

writeFileSync(resolve('migration-data', `backfill-woo-product-id-${today}.csv`), audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nPrimary tags applied: ${applied}  failed: ${failed}`)
console.log(`Audit: migration-data/backfill-woo-product-id-${today}.csv`)
