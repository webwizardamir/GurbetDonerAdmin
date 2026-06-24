// Read-only WooCommerce probe — fetch one order + its refunds and dump JSON.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/probe-order.mjs 7422
// Writes raw JSON to migration-data/wc-order-<id>.json (gitignored).

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY
if (proxy && !proxy.startsWith('socks')) {
  setGlobalDispatcher(new ProxyAgent(proxy))
  console.log(`Using HTTP proxy: ${proxy}`)
}

const orderId = process.argv[2] ?? '7422'

const url = process.env.WC_URL
const key = process.env.WC_CONSUMER_KEY
const secret = process.env.WC_CONSUMER_SECRET

if (!url || !key || !secret) {
  console.error('Missing WC_URL / WC_CONSUMER_KEY / WC_CONSUMER_SECRET in env.')
  console.error('Run with: node --env-file=.env.local scripts/wc-reconcile/probe-order.mjs')
  process.exit(1)
}

const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
const base = `${url.replace(/\/$/, '')}/wp-json/wc/v3`

async function wc(path) {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: auth } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText} — ${path}\n${body.slice(0, 500)}`)
  }
  return res.json()
}

console.log(`Fetching WC order #${orderId} from ${url} ...`)
const order = await wc(`/orders/${orderId}`)
const refunds = await wc(`/orders/${orderId}/refunds`)

mkdirSync(resolve('migration-data'), { recursive: true })
const dumpPath = resolve('migration-data', `wc-order-${orderId}.json`)
writeFileSync(dumpPath, JSON.stringify({ order, refunds }, null, 2))
console.log(`Raw JSON written to ${dumpPath}\n`)

// Summary ---------------------------------------------------------------
console.log('=== ORDER SUMMARY ===')
console.log(`ID:           ${order.id}`)
console.log(`Number:       ${order.number}`)
console.log(`Status:       ${order.status}`)
console.log(`Created:      ${order.date_created}`)
console.log(`Paid:         ${order.date_paid ?? '—'}`)
console.log(`Customer ID:  ${order.customer_id}`)
console.log(`Customer:     ${order.billing?.first_name} ${order.billing?.last_name} <${order.billing?.email}>`)
console.log(`Company:      ${order.billing?.company ?? '—'}`)
console.log(`Payment:      ${order.payment_method} (${order.payment_method_title})`)
console.log(`Currency:     ${order.currency}`)
console.log(`Subtotal:     ${order.line_items?.reduce((s, i) => s + parseFloat(i.subtotal), 0).toFixed(2)}`)
console.log(`Discount:     ${order.discount_total}`)
console.log(`Tax:          ${order.total_tax}`)
console.log(`Shipping:     ${order.shipping_total}`)
console.log(`Total:        ${order.total}`)

console.log('\n=== LINE ITEMS ===')
for (const li of order.line_items ?? []) {
  console.log(`  #${li.id}  product=${li.product_id}  sku=${li.sku ?? '—'}  qty=${li.quantity}`)
  console.log(`    name:     ${li.name}`)
  console.log(`    price:    ${li.price}  subtotal=${li.subtotal}  total=${li.total}  tax=${li.total_tax}`)
  if (li.meta_data?.length) {
    const nonHidden = li.meta_data.filter(m => !m.key.startsWith('_'))
    if (nonHidden.length) console.log(`    meta:     ${nonHidden.map(m => `${m.key}=${m.display_value ?? m.value}`).join(', ')}`)
  }
}

console.log(`\n=== REFUNDS (${refunds.length}) ===`)
for (const r of refunds) {
  console.log(`  Refund #${r.id}  ${r.date_created}  amount=${r.amount}  reason="${r.reason ?? ''}"`)
  for (const li of r.line_items ?? []) {
    console.log(`    line: product=${li.product_id} qty=${li.quantity} subtotal=${li.subtotal} total=${li.total}`)
  }
}

console.log('\nDone.')
