// Phase F: Find orders where SUM(line_items.line_total) != orders.subtotal,
// after Phase C has already restored refund-affected items.
// These should be non-refund anomalies (manual edits, import bugs, etc.).
// Read-only.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Page through all orders, compute sum(line_total) per order_id, compare to subtotal
console.log('Loading all orders + items (this may take ~30s for ~7000 orders) ...')
let allOrders = []
let from = 0
const PAGE = 1000
while (true) {
  const { data } = await sb.from('orders').select('id, order_number, status, subtotal, total, refund_amount').range(from, from + PAGE - 1)
  if (!data || !data.length) break
  allOrders = allOrders.concat(data)
  if (data.length < PAGE) break
  from += PAGE
}
console.log(`  orders: ${allOrders.length}`)

// Fetch items in batches, sum per order
const itemSumByOrder = new Map()
const ids = allOrders.map(o => o.id)
for (let i = 0; i < ids.length; i += 200) {
  const batch = ids.slice(i, i + 200)
  let offset = 0
  while (true) {
    const { data } = await sb.from('order_items').select('order_id, line_total').in('order_id', batch).range(offset, offset + PAGE - 1)
    if (!data || !data.length) break
    for (const it of data) itemSumByOrder.set(it.order_id, (itemSumByOrder.get(it.order_id) ?? 0) + (it.line_total ?? 0))
    if (data.length < PAGE) break
    offset += PAGE
  }
  process.stdout.write(`  items batch ${Math.min(i + 200, ids.length)}/${ids.length}\r`)
}
console.log()

// Build mismatch list
const mismatches = []
for (const o of allOrders) {
  const sum = itemSumByOrder.get(o.id) ?? 0
  if (sum !== o.subtotal) mismatches.push({ ...o, lineitem_sum: sum, delta: sum - o.subtotal })
}
console.log(`\nOrders with sum(line_total) != subtotal: ${mismatches.length}`)

// Bucket by magnitude and status
const byStatus = {}
const byDelta = { zero_items: 0, under_100c: 0, under_1eur: 0, over_1eur: 0 }
for (const m of mismatches) {
  byStatus[m.status] = (byStatus[m.status] || 0) + 1
  if (m.lineitem_sum === 0) byDelta.zero_items++
  else if (Math.abs(m.delta) < 100) byDelta.under_100c++
  else if (Math.abs(m.delta) < 10000) byDelta.under_1eur++
  else byDelta.over_1eur++
}
console.log('\nBy status:')
for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(20)} ${n}`)
console.log('\nBy delta magnitude:')
console.log(`  zero items (orphan order):  ${byDelta.zero_items}`)
console.log(`  |delta| < €1:               ${byDelta.under_100c}`)
console.log(`  |delta| €1 – €100:          ${byDelta.under_1eur}`)
console.log(`  |delta| > €100:             ${byDelta.over_1eur}`)

// Show some samples from each bucket
console.log('\nSamples — large delta:')
const large = mismatches.filter(m => Math.abs(m.delta) > 10000).slice(0, 5)
for (const m of large) console.log(`  ${m.order_number.padEnd(10)} status=${m.status.padEnd(18)} subtotal=€${(m.subtotal/100).toFixed(2)}  lineitem_sum=€${(m.lineitem_sum/100).toFixed(2)}  Δ=€${(m.delta/100).toFixed(2)}`)

console.log('\nSamples — zero line items:')
const zeros = mismatches.filter(m => m.lineitem_sum === 0).slice(0, 5)
for (const m of zeros) console.log(`  ${m.order_number.padEnd(10)} status=${m.status.padEnd(18)} total=€${(m.total/100).toFixed(2)}`)

console.log('\nSamples — small delta (< €1):')
const small = mismatches.filter(m => Math.abs(m.delta) < 100 && m.lineitem_sum > 0).slice(0, 5)
for (const m of small) console.log(`  ${m.order_number.padEnd(10)} Δ=${m.delta}c  subtotal=€${(m.subtotal/100).toFixed(2)}`)
