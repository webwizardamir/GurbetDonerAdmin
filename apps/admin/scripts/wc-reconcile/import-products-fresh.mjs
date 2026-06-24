// Go-live fresh import: WC products -> SB products (clean slate).
// Each product gets its single WC regular_price as base_price (the universal
// fallback in the pricing chain). The owner adds other unit prices (kg/doos/zak)
// later via the UI; product_unit_prices is intentionally left empty.
//
// Run AFTER the wipe.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/import-products-fresh.mjs [--dry-run]

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
const norm = (s) => (s || '').trim()

const UNIT_TYPE = 'piece'   // owner reassigns real units later
const TAX_RATE = 9          // food default; owner switches non-food to 21

// --- 1. Pull WC products (paged) -------------------------------------
console.log('Loading WC products ...')
const wcProducts = []
{
  let page = 1
  while (true) {
    const r = await fetch(`${wcBase}/products?per_page=100&page=${page}&status=any`, { headers: { Authorization: wcAuth } })
    if (!r.ok) { console.error(`WC ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1) }
    const batch = await r.json()
    for (const p of batch) {
      // skip variations/grouped parents with no own price? keep simple/everything sellable
      if (p.type === 'variable' || p.type === 'grouped') {
        // these have no own regular_price; still import as catalog entries at 0 (owner prices later)
      }
      const cog = (p.meta_data || []).find(m => m.key === '_cost_of_goods')?.value
      const price = toCents(p.regular_price || p.price)
      wcProducts.push({
        id: p.id,
        name: norm(p.name) || `WC #${p.id}`,
        sku: norm(p.sku) || null,
        status: p.status,
        price_cents: price,
        cost_cents: cog ? toCents(cog) : 0,
        type: p.type,
      })
    }
    if (batch.length < 100) break
    page++
  }
}
console.log(`  WC products: ${wcProducts.length}`)
console.log(`  with price>0: ${wcProducts.filter(p => p.price_cents > 0).length}`)
console.log(`  with cost>0:  ${wcProducts.filter(p => p.cost_cents > 0).length}`)
console.log(`  published:    ${wcProducts.filter(p => p.status === 'publish').length}`)

if (DRY_RUN) {
  console.log('\nFirst 10:')
  for (const w of wcProducts.slice(0, 10)) {
    console.log(`  WC#${w.id}  ${w.name.padEnd(40).slice(0,40)}  sku=${(w.sku ?? '—').padEnd(14)}  €${(w.price_cents/100).toFixed(2)}  cost=€${(w.cost_cents/100).toFixed(2)}  [${w.status}]`)
  }
  process.exit(0)
}

// --- 2. Insert -------------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action','woo_product_id','name','sku','price_eur','cost_eur','status','error']]

const rows = wcProducts.map(w => ({
  name: w.name,
  sku: w.sku,
  woo_product_id: w.id,
  woo_status: w.status,
  unit_type: UNIT_TYPE,
  base_price: w.price_cents,
  price: w.price_cents,            // legacy mirror
  cost_cents: w.cost_cents,
  cost: w.cost_cents,              // legacy mirror
  tax_rate: TAX_RATE,
  stock_quantity: 0,
  track_stock: false,
  is_active: w.status === 'publish',
}))

let inserted = 0, failed = 0
const CHUNK = 100
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK)
  const { error } = await sb.from('products').insert(chunk)
  if (error) {
    for (let j = 0; j < chunk.length; j++) {
      const { error: e2 } = await sb.from('products').insert(chunk[j])
      const w = wcProducts[i + j]
      if (e2) { failed++; audit.push(['insert_failed', w.id, w.name, w.sku ?? '', (w.price_cents/100).toFixed(2), (w.cost_cents/100).toFixed(2), w.status, e2.message]) }
      else { inserted++; audit.push(['insert', w.id, w.name, w.sku ?? '', (w.price_cents/100).toFixed(2), (w.cost_cents/100).toFixed(2), w.status, '']) }
    }
  } else {
    for (let j = 0; j < chunk.length; j++) {
      const w = wcProducts[i + j]
      inserted++; audit.push(['insert', w.id, w.name, w.sku ?? '', (w.price_cents/100).toFixed(2), (w.cost_cents/100).toFixed(2), w.status, ''])
    }
  }
  process.stdout.write(`  inserted ${inserted}/${rows.length}\r`)
}

const auditPath = resolve('migration-data', `import-products-fresh-${today}.csv`)
writeFileSync(auditPath, audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nDone.  inserted=${inserted}  failed=${failed}`)
console.log(`Audit trail: ${auditPath}`)
