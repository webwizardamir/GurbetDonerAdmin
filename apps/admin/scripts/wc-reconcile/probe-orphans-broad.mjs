// Broader verification before the big product dedup. Tests:
//   - High-order-count orphans (biggest impact)
//   - User-confirmed DON'T-merge cases (different flavors)
//   - Ambiguous matched products (name conflict in SB)
//   - Low-confidence suggested merges
//   - "No match" orphans (is the WC product trashed? or just renamed?)
//   - Current matched products that still have cost mismatches after P1

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(process.env.WC_CONSUMER_KEY + ':' + process.env.WC_CONSUMER_SECRET).toString('base64')
const wcBase = process.env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3'
const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

async function wcGet(path) {
  const r = await fetch(`${wcBase}${path}`, { headers: { Authorization: wcAuth } })
  if (!r.ok) return { __err: r.status, __body: (await r.text()).slice(0, 150) }
  return r.json()
}

async function resolveOrphan(sbId, snapshotName, sampleSize = 3) {
  const { data: items } = await sb.from('order_items').select('order_id, product_name, quantity, unit_price').eq('product_id', sbId).limit(sampleSize)
  if (!items?.length) return { reason: 'no_order_items', samples: 0 }
  const { data: orders } = await sb.from('orders').select('id, order_number').in('id', items.map(i => i.order_id))
  const orderMap = new Map((orders ?? []).map(o => [o.id, o.order_number]))

  const pidCounts = new Map()
  const sampleDetails = []
  for (const it of items) {
    const wcOrderId = orderMap.get(it.order_id)?.replace(/^WOO-/, '')
    const wo = await wcGet(`/orders/${wcOrderId}`)
    if (wo.__err) { sampleDetails.push({ wcOrderId, err: wo.__err }); continue }
    const li = wo.line_items?.find(l => normalize(l.name) === normalize(it.product_name))
    sampleDetails.push({ wcOrderId, liName: li?.name, liProductId: li?.product_id, liQty: li?.quantity, liPrice: li?.price, unitPriceSb: it.unit_price })
    if (li?.product_id) pidCounts.set(li.product_id, (pidCounts.get(li.product_id) ?? 0) + 1)
  }
  const [winner] = [...pidCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  return { winner, samples: sampleDetails, pidCounts: [...pidCounts.entries()] }
}

async function describeWcProduct(id) {
  const p = await wcGet(`/products/${id}`)
  if (p.__err) return { id, missing: true, err: p.__err }
  const cog = p.meta_data?.find(m => m.key === '_cost_of_goods')?.value
  return { id: p.id, name: p.name, sku: p.sku, price: p.regular_price, cog, status: p.status }
}

const cases = [
  // Category A - high-confidence single orphans
  { title: 'A. Mix Shoarma (NL) (6,50) — 33 orders', sbName: 'Mix Shoarma (NL) (6,50)' },
  { title: 'A. Chicken Chica PAPRIKA (€5,75) — 98 orders', sbName: 'Chicken Chica PAPRIKA (€5,75)' },

  // Category B - medium-confidence with different naming conventions
  { title: 'B. Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50) — 290 orders', sbName: 'Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)' },
  { title: 'B. Chicken Fillet Bites (0.8kg) — 83 orders  (does it resolve to "Hot" variant?)', sbName: 'Chicken Fillet Bites (0.8kg)' },
  { title: 'B. Kip doner ( 250 GR )Zonder E621 — 3 orders', sbName: 'Kip doner ( 250 GR )Zonder E621' },

  // Category C - different-flavor cases user said DON'T merge
  { title: 'C. Chicken Chica NATURAL (€5,50) — 16 orders  (should resolve to its OWN WC id)', sbName: 'Chicken Chica NATURAL (€5,50)' },
  { title: 'C. Chicken Chica Spicy (€5,90) — 15 orders', sbName: 'Chicken Chica Spicy (€5,90)' },
  { title: 'C. Cordon bleu (0,8 GR) — 2 orders', sbName: 'Cordon bleu (0,8 GR)' },

  // Category D - no match
  { title: 'D. Shoarma fetih 6,30 per kg — 3 orders  (deleted? or new WC product?)', sbName: 'Shoarma fetih 6,30 per kg' },
  { title: 'D. Berlin burger 125g — 2 orders  (WC has 2 Berlin Burger products)', sbName: 'Berlin burger 125g' },

  // Category E - ambiguous SB dups (need to check both)
  { title: 'E. CHICKEN BURGER ( 18x70 GR ) — dup 1 (cost=0)', sbName: 'CHICKEN BURGER  ( 18x70 GR )' },
  { title: 'E. CHICKEN BURGER ( 18x70 GR ) — dup 2 (cost=€3.78)', sbName: 'CHICKEN BURGER ( 18x70 GR )' },
]

for (const c of cases) {
  console.log('\n' + '='.repeat(78))
  console.log(c.title)
  console.log('='.repeat(78))
  const { data: prods } = await sb.from('products').select('id, name, base_price, cost_cents').eq('name', c.sbName)
  if (!prods?.length) { console.log('  (no SB product with exact name)'); continue }
  for (const prod of prods) {
    console.log(`  SB id=${prod.id.slice(0, 8)}  "${prod.name}"  price=€${(prod.base_price/100).toFixed(2)}  cost=€${(prod.cost_cents/100).toFixed(2)}`)
    const res = await resolveOrphan(prod.id, prod.name, 5)
    if (res.reason) { console.log(`    ${res.reason}`); continue }
    for (const s of res.samples) {
      if (s.err) console.log(`    WC #${s.wcOrderId}: fetch ${s.err}`)
      else console.log(`    WC #${s.wcOrderId}: pid=${s.liProductId}  qty=${s.liQty}  li_price=${s.liPrice}  (sb_unit_price=€${(s.unitPriceSb/100).toFixed(2)})`)
    }
    console.log(`    consensus WC product_id = ${res.winner}  (distribution: ${res.pidCounts.map(([p, n]) => p + ':' + n).join(', ')})`)
    if (res.winner) {
      const w = await describeWcProduct(res.winner)
      if (w.missing) console.log(`    ⚠ WC #${res.winner} no longer exists (HTTP ${w.err}) — product trashed/deleted`)
      else console.log(`    ✓ current WC #${w.id}: "${w.name}" sku=${w.sku || '—'} price=€${w.price} cog=€${w.cog ?? '0'} status=${w.status}`)
    }
  }
}
