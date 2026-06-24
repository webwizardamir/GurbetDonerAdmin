// Probe all WC order statuses and their counts. Read-only.
import { ProxyAgent, setGlobalDispatcher } from 'undici'
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET } = process.env
const auth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const base = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`

async function wcFetch(path, withHeaders = false) {
  const r = await fetch(`${base}${path}`, { headers: { Authorization: auth } })
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 200)}`)
  const data = await r.json()
  return withHeaders ? { data, total: Number(r.headers.get('x-wp-total') || 0), pages: Number(r.headers.get('x-wp-totalpages') || 0) } : data
}

console.log('=== /reports/orders/totals ===')
try {
  const totals = await wcFetch('/reports/orders/totals')
  let sum = 0
  for (const s of totals) { console.log(`  ${s.slug.padEnd(30)} ${String(s.total).padStart(6)}   (${s.name})`); sum += s.total }
  console.log(`  ${'TOTAL'.padEnd(30)} ${String(sum).padStart(6)}`)
} catch (e) { console.log(`  error: ${e.message}`) }

console.log('\n=== /orders?status=any count ===')
const anyCount = await wcFetch('/orders?per_page=1&status=any', true)
console.log(`  x-wp-total = ${anyCount.total}`)

console.log('\n=== Highest order ID with status=any ===')
const latest = await wcFetch('/orders?per_page=1&status=any&orderby=id&order=desc', true)
console.log(`  latest id = ${latest.data[0]?.id}  status=${latest.data[0]?.status}  date=${latest.data[0]?.date_created}`)

console.log('\n=== Testing explicit order ID outside scan range ===')
for (const id of [9409, 9161, 8500, 8000, 7500]) {
  try {
    const o = await wcFetch(`/orders/${id}`)
    console.log(`  #${id}: status=${o.status.padEnd(20)} total=${o.total} date=${o.date_created}`)
  } catch (e) {
    console.log(`  #${id}: NOT FOUND (${e.message.split('\n')[0]})`)
  }
}
