// Phase P1: sync product catalogue from WC → SB.
//   1. For each matched pair (SB ↔ WC): UPDATE SB cost_cents + base_price from WC.
//   2. For WC products missing in SB: INSERT new SB product.
//   3. Match by SKU first, then normalized name.
// Does NOT touch orphan SB products (no WC match) — handled in P2.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/sync-products-from-wc.mjs [--dry-run]

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

// --- 1. Pull both sides ----------------------------------------------
console.log('Loading SB products ...')
const { data: sbProducts } = await sb.from('products').select('id, name, sku, base_price, cost_cents, tax_rate, is_active')

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
        cost_cents: cog ? toCents(cog) : 0,
        status: p.status,
      })
    }
    if (batch.length < 100) break
    page++
  }
}
console.log(`  SB=${sbProducts.length}  WC=${wcProducts.length}`)

// --- 2. Match --------------------------------------------------------
const sbBySku = new Map()
const sbByName = new Map()
for (const s of sbProducts) {
  if (s.sku) sbBySku.set(s.sku, s)
  const k = normalize(s.name)
  if (!sbByName.has(k)) sbByName.set(k, [])
  sbByName.get(k).push(s)
}

const updates = []   // { sbId, old, new, matchBy, wcId }
const inserts = []   // { wc }
for (const w of wcProducts) {
  let s = null, by = ''
  if (w.sku && sbBySku.has(w.sku)) { s = sbBySku.get(w.sku); by = 'sku' }
  else {
    const cand = sbByName.get(normalize(w.name))
    if (cand?.length === 1) { s = cand[0]; by = 'name' }
    else if (cand?.length > 1) {
      // Multiple SB products share this name — skip the update, flag
      updates.push({ ambiguous: true, wcId: w.id, wcName: w.name, candidates: cand.map(c => c.id) })
      continue
    }
  }
  if (s) {
    const patch = {}
    if (s.base_price !== w.price_cents && w.price_cents > 0) patch.base_price = w.price_cents
    if (s.cost_cents !== w.cost_cents && w.cost_cents > 0) patch.cost_cents = w.cost_cents
    if (Object.keys(patch).length) {
      updates.push({ sbId: s.id, sbName: s.name, wcId: w.id, matchBy: by, old: { price: s.base_price, cost: s.cost_cents }, new: { price: w.price_cents, cost: w.cost_cents }, patch })
    }
  } else {
    inserts.push(w)
  }
}

// --- 3. Preview ------------------------------------------------------
console.log(`\nPlan:`)
console.log(`  updates (cost/price from WC): ${updates.filter(u => !u.ambiguous).length}`)
console.log(`  ambiguous name matches:       ${updates.filter(u => u.ambiguous).length}`)
console.log(`  inserts (new SB products):    ${inserts.length}`)

if (DRY_RUN) {
  console.log('\nFirst 10 updates:')
  for (const u of updates.filter(u => !u.ambiguous).slice(0, 10)) {
    const changes = []
    if (u.patch.base_price !== undefined) changes.push(`price €${(u.old.price/100).toFixed(2)}→€${(u.new.price/100).toFixed(2)}`)
    if (u.patch.cost_cents !== undefined) changes.push(`cost €${(u.old.cost/100).toFixed(2)}→€${(u.new.cost/100).toFixed(2)}`)
    console.log(`  ${u.sbName.padEnd(45)} [${u.matchBy}]  ${changes.join(', ')}`)
  }
  console.log('\nFirst 10 inserts (WC → new SB):')
  for (const w of inserts.slice(0, 10)) console.log(`  WC #${w.id} ${w.name.padEnd(40)} sku=${w.sku ?? '—'}  €${(w.price_cents/100).toFixed(2)}  cost=€${(w.cost_cents/100).toFixed(2)}`)
  if (updates.filter(u => u.ambiguous).length) {
    console.log('\nAmbiguous (multiple SB products share name, skipped):')
    for (const u of updates.filter(u => u.ambiguous).slice(0, 5)) console.log(`  WC #${u.wcId} ${u.wcName}  (${u.candidates.length} SB candidates)`)
  }
  process.exit(0)
}

// --- 4. Apply --------------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action','sb_id','name','wc_id','old_price','new_price','old_cost','new_cost','error']]

let updated = 0, inserted = 0, failed = 0

// Updates
for (const u of updates) {
  if (u.ambiguous) { audit.push(['skip_ambiguous', '', u.wcName, u.wcId, '', '', '', '', 'multiple_sb_name_matches']); continue }
  const { error } = await sb.from('products').update(u.patch).eq('id', u.sbId)
  if (error) { failed++; audit.push(['update', u.sbId, u.sbName, u.wcId, u.old.price, u.new.price, u.old.cost, u.new.cost, error.message]); continue }
  updated++
  audit.push(['update', u.sbId, u.sbName, u.wcId, (u.old.price/100).toFixed(2), (u.new.price/100).toFixed(2), (u.old.cost/100).toFixed(2), (u.new.cost/100).toFixed(2), ''])
}

// Inserts
for (const w of inserts) {
  const row = {
    name: w.name,
    sku: w.sku,
    unit_type: 'piece',
    base_price: w.price_cents,
    cost_cents: w.cost_cents,
    tax_rate: 9,
    stock_quantity: 0,
    track_stock: false,
    is_active: w.status === 'publish',
  }
  const { data, error } = await sb.from('products').insert(row).select('id').single()
  if (error) { failed++; audit.push(['insert_failed','', w.name, w.id, '', (w.price_cents/100).toFixed(2), '', (w.cost_cents/100).toFixed(2), error.message]); continue }
  inserted++
  audit.push(['insert', data.id, w.name, w.id, '', (w.price_cents/100).toFixed(2), '', (w.cost_cents/100).toFixed(2), ''])
}

writeFileSync(resolve('migration-data', `sync-products-${today}.csv`), audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nDone.  updated=${updated}  inserted=${inserted}  failed=${failed}`)
console.log(`Audit trail: migration-data/sync-products-${today}.csv`)
