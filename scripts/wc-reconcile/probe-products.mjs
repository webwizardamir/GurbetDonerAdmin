// Probe one WC product + summarize product counts on both sides.
// Goal: understand how cost of goods is stored in WC + scope the dedup problem.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(process.env.WC_CONSUMER_KEY + ':' + process.env.WC_CONSUMER_SECRET).toString('base64')
const wcBase = process.env.WC_URL.replace(/\/$/, '') + '/wp-json/wc/v3'

// --- 1. SB product counts + sample the kipcorn duplicates -------------
const { count: sbTotal } = await sb.from('products').select('id', { count: 'exact', head: true })
const { count: sbActive } = await sb.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
console.log(`SB products: ${sbTotal} (active: ${sbActive})`)

const { data: kipcorn } = await sb.from('products').select('id, name, sku, base_price, cost_cents, is_active').ilike('name', '%kipcorn%')
console.log(`\nSB kipcorn products (${kipcorn.length}):`)
for (const p of kipcorn) console.log(`  ${p.name.padEnd(45)} sku=${(p.sku ?? '').padEnd(20)} price=€${(p.base_price/100).toFixed(2)} cost=€${(p.cost_cents/100).toFixed(2)} active=${p.is_active}`)

const { data: cburger } = await sb.from('products').select('id, name, sku, base_price, cost_cents, is_active').ilike('name', '%chicken burger%')
console.log(`\nSB chicken burger products (${cburger.length}):`)
for (const p of cburger) console.log(`  ${p.name.padEnd(45)} sku=${(p.sku ?? '').padEnd(20)} price=€${(p.base_price/100).toFixed(2)} cost=€${(p.cost_cents/100).toFixed(2)} active=${p.is_active}`)

// --- 2. WC product counts + fetch one kipcorn to see meta_data -------
const probe = await fetch(`${wcBase}/products?per_page=1&status=any`, { headers: { Authorization: wcAuth } })
console.log(`\nWC products total: ${probe.headers.get('x-wp-total')}`)

const search = await fetch(`${wcBase}/products?search=kipcorn&per_page=10&status=any`, { headers: { Authorization: wcAuth } })
const wcKip = await search.json()
console.log(`\nWC kipcorn products (${wcKip.length}):`)
for (const p of wcKip) {
  const cogMeta = p.meta_data?.find(m => m.key === '_wc_cog_cost' || m.key === '_cost' || m.key === '_product_cost' || m.key.includes('cog') || m.key.includes('cost'))
  console.log(`  #${p.id} ${p.name.padEnd(45)} sku=${(p.sku ?? '').padEnd(15)} price=${p.regular_price} status=${p.status} cog=${cogMeta ? `${cogMeta.key}=${cogMeta.value}` : 'none'}`)
  // Show all meta keys the first time (first product only)
  if (p === wcKip[0]) console.log('    meta keys:', p.meta_data?.map(m => m.key).filter(k => !k.startsWith('_elementor') && !k.startsWith('_edit')).slice(0, 20).join(', '))
}
