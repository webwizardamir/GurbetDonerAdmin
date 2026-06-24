// Verify: for 3 orphan SB products, sample their orders and check whether
// WC still exposes a line_item.product_id that resolves to an existing WC
// product. If yes → the deterministic-match plan works.

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
  if (!r.ok) return null
  return r.json()
}

const probes = [
  { sbName: 'Excellence Patat' },
  { sbName: 'CHICKEN KIPCORN', priceFilter: 620 }, // €6.20
  { sbName: 'SOLICED AND RASTED BEEF KEBAB (0,8GR)' },
]

for (const p of probes) {
  console.log('\n' + '='.repeat(70))
  console.log(`ORPHAN: "${p.sbName}"`)
  console.log('='.repeat(70))

  // Find the SB product
  let q = sb.from('products').select('id, name, base_price, cost_cents').eq('name', p.sbName)
  if (p.priceFilter) q = q.eq('base_price', p.priceFilter)
  const { data: sbProd } = await q
  if (!sbProd?.length) { console.log('  no such SB product'); continue }
  const prod = sbProd[0]
  console.log(`  SB id=${prod.id}  base_price=€${(prod.base_price/100).toFixed(2)}  cost=€${(prod.cost_cents/100).toFixed(2)}`)

  // Find up to 3 order_items referencing this product → their WC order IDs
  const { data: items } = await sb.from('order_items').select('order_id, product_name, quantity, unit_price').eq('product_id', prod.id).limit(3)
  console.log(`  sampling ${items?.length ?? 0} order_items using this product:`)

  const orderIds = [...new Set((items ?? []).map(i => i.order_id))]
  const { data: orders } = await sb.from('orders').select('id, order_number').in('id', orderIds)
  const orderNumByOrderId = new Map((orders ?? []).map(o => [o.id, o.order_number]))

  const wcProductIdHits = new Map()
  for (const it of items ?? []) {
    const orderNumber = orderNumByOrderId.get(it.order_id)
    const wcOrderId = orderNumber?.replace(/^WOO-/, '')
    const wo = await wcGet(`/orders/${wcOrderId}`)
    if (!wo) { console.log(`    WC #${wcOrderId}: fetch failed`); continue }
    // Find the matching line_item by snapshot name
    const li = wo.line_items?.find(l => normalize(l.name) === normalize(it.product_name))
    const rawWcPid = li?.product_id
    console.log(`    WC #${wcOrderId}: line "${li?.name ?? '?'}" qty=${li?.quantity} product_id=${rawWcPid ?? '—'}`)
    if (rawWcPid) wcProductIdHits.set(rawWcPid, (wcProductIdHits.get(rawWcPid) ?? 0) + 1)
  }

  // Mode WC product_id
  const [wcPid] = [...wcProductIdHits.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!wcPid) { console.log('  ⚠ No WC product_id resolved'); continue }

  console.log(`  → Consensus WC product_id = ${wcPid}`)
  // Fetch that WC product to see its current state
  const wcProd = await wcGet(`/products/${wcPid}`)
  if (!wcProd) { console.log(`  ⚠ WC product ${wcPid} no longer exists (likely trashed or deleted)`) }
  else {
    const cog = wcProd.meta_data?.find(m => m.key === '_cost_of_goods')?.value
    console.log(`  ✓ WC product still exists:`)
    console.log(`    #${wcProd.id} "${wcProd.name}" sku=${wcProd.sku || '—'} price=€${wcProd.regular_price} cog=€${cog ?? '0'} status=${wcProd.status}`)
  }
}
