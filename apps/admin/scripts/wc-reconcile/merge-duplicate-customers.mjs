// Merge SB customer records that represent the same WC customer (same
// customer_id in WC). For each duplicate group:
//   - Primary = SB record with a real email (else most orders, else name-match).
//   - Reassign orders + customer_prices (if any) to primary.
//   - Delete the duplicate SB rows.
//
// Scope: groups that contain at least one placeholder (woo-%@import.local)
// customer. Dry-run by default is prudent — always --dry-run first.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/merge-duplicate-customers.mjs [--dry-run]

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
const normalize = (s) => (s || '').trim().toLowerCase()

// --- 1. Find all placeholder SB customers + their order set ------------
const { data: placeholders } = await sb
  .from('customers')
  .select('id, company_name, email')
  .like('email', 'woo-%@import.local')

if (!placeholders?.length) { console.log('No placeholder customers. Done.'); process.exit(0) }
console.log(`Placeholder customers: ${placeholders.length}`)

// Get all orders for these placeholders + fetch the candidate-primary customers (by WC id lookup we'll do next)
const phIds = placeholders.map(p => p.id)
const phOrders = new Map() // sb_customer_id → [WC order IDs]
for (let i = 0; i < phIds.length; i += 200) {
  const batch = phIds.slice(i, i + 200)
  const { data } = await sb.from('orders').select('order_number, customer_id').in('customer_id', batch)
  for (const o of data ?? []) {
    const wcId = Number(o.order_number.replace(/^WOO-/, ''))
    if (!Number.isFinite(wcId)) continue
    if (!phOrders.has(o.customer_id)) phOrders.set(o.customer_id, [])
    phOrders.get(o.customer_id).push(wcId)
  }
}
console.log(`Placeholder customers with orders: ${phOrders.size}`)

// --- 2. Fetch WC customer_id + billing.email for each of those orders ---
const uniqueWcIds = [...new Set([...phOrders.values()].flat())]
console.log(`Fetching WC details for ${uniqueWcIds.length} orders ...`)
const wcByOrderId = new Map()
const BATCH = 100
for (let i = 0; i < uniqueWcIds.length; i += BATCH) {
  const ids = uniqueWcIds.slice(i, i + BATCH).join(',')
  const r = await fetch(`${wcBase}/orders?include=${ids}&per_page=${BATCH}&status=any`, { headers: { Authorization: wcAuth } })
  if (!r.ok) { console.error(`WC ${r.status}`); continue }
  for (const o of await r.json()) wcByOrderId.set(o.id, { wc_customer_id: o.customer_id, billing_email: normalize(o.billing?.email) })
  process.stdout.write(`  ${Math.min(i + BATCH, uniqueWcIds.length)}/${uniqueWcIds.length}\r`)
}
console.log()

// --- 3. For each placeholder, find the "canonical WC identity" keys ---
// We use: WC customer_id (if > 0, i.e. registered account) OR fallback to
// billing email. Both are aggregated across the customer's orders.
const phIdentity = new Map()  // sb_customer_id → { wcCustIds: Set, emails: Set }
for (const p of placeholders) {
  const orders = phOrders.get(p.id) ?? []
  const wcCustIds = new Set(), emails = new Set()
  for (const oid of orders) {
    const wc = wcByOrderId.get(oid)
    if (!wc) continue
    if (wc.wc_customer_id && wc.wc_customer_id > 0) wcCustIds.add(wc.wc_customer_id)
    if (wc.billing_email && wc.billing_email.includes('@')) emails.add(wc.billing_email)
  }
  phIdentity.set(p.id, { wcCustIds, emails })
}

// --- 4. Find SB customers that share any identity key with a placeholder
// (could be other placeholders OR customers with a real email = the sibling we want to merge into)
// Strategy: for each identity key (wc_cust_id or email), query SB for other
// customers whose orders match.
const keysToLookup = new Set()
for (const { wcCustIds, emails } of phIdentity.values()) {
  for (const id of wcCustIds) keysToLookup.add(`wc:${id}`)
  for (const e of emails) keysToLookup.add(`email:${e}`)
}
console.log(`Identity keys to match: ${keysToLookup.size}`)

// Find all SB orders whose WC order has customer_id in our wc set OR billing_email in our email set.
// We need to do this by scanning our own SB orders list. But to keep it bounded, we scan SB orders
// referenced by the WC orders that share an identity key with any placeholder.
// Simpler: query WC for ALL orders with these customer_ids. But WC API has no bulk-by-customer fetch
// for many customers. Alternative: look up SB customers whose orders include these wc_customer_ids.

// Shortcut: do the reverse — fetch each placeholder's "family" by searching WC for orders with the same customer_id.
const sbCustomerOrdersByWcCustId = new Map()  // wc_customer_id → [sb_customer_id] (via SB orders)
// Known wc_customer_ids for our placeholders:
const allWcCustIds = [...new Set([...phIdentity.values()].flatMap(v => [...v.wcCustIds]))]
console.log(`Unique WC customer_ids among placeholders: ${allWcCustIds.length}`)

// For each WC customer_id, fetch all WC orders and map back to SB customer_ids via order_number
for (const wcCustId of allWcCustIds) {
  let page = 1, keepGoing = true
  const wcOrderIds = []
  while (keepGoing) {
    const r = await fetch(`${wcBase}/orders?customer=${wcCustId}&per_page=100&page=${page}&status=any`, { headers: { Authorization: wcAuth } })
    if (!r.ok) break
    const os = await r.json()
    for (const o of os) wcOrderIds.push(o.id)
    keepGoing = os.length === 100
    page++
  }
  // Map these WC order IDs → SB customer_ids
  const { data: sbMatches } = await sb.from('orders').select('customer_id').in('order_number', wcOrderIds.map(id => `WOO-${id}`))
  const ids = new Set((sbMatches ?? []).map(r => r.customer_id))
  sbCustomerOrdersByWcCustId.set(wcCustId, [...ids])
}

// --- 5. Build merge groups keyed by wc_customer_id -------------------
const groups = new Map()  // wc_customer_id → [sb_customer_id, ...]
for (const [wcCustId, sbIds] of sbCustomerOrdersByWcCustId) {
  if (sbIds.length > 1) groups.set(wcCustId, sbIds)
}
console.log(`Duplicate groups (size > 1, keyed on wc_customer_id): ${groups.size}`)

// Load full customer records for all SB customers in any group
const affectedSbIds = [...new Set([...groups.values()].flat())]
const { data: allCusts } = await sb.from('customers').select('id, company_name, email').in('id', affectedSbIds)
const custById = new Map((allCusts ?? []).map(c => [c.id, c]))

// Pre-count orders per SB customer
const orderCounts = new Map()
for (let i = 0; i < affectedSbIds.length; i += 200) {
  const batch = affectedSbIds.slice(i, i + 200)
  const { data } = await sb.from('orders').select('customer_id').in('customer_id', batch)
  for (const o of data ?? []) orderCounts.set(o.customer_id, (orderCounts.get(o.customer_id) ?? 0) + 1)
}

// --- 6. Pick primary per group + build merge plan --------------------
function nameEmailScore(name, email) {
  if (!email) return 0
  const tokens = (name || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3)
  const [local, domain] = email.toLowerCase().split('@')
  const domainBase = (domain || '').split('.')[0]
  for (const t of tokens) if (local.includes(t) || domainBase.includes(t) || t.includes(domainBase)) return 100
  return 0
}

const plan = []  // { wcCustId, primary: {...}, dups: [...] }
for (const [wcCustId, sbIds] of groups) {
  const members = sbIds.map(id => {
    const c = custById.get(id)
    const isPlaceholder = c?.email?.startsWith('woo-') && c.email.endsWith('@import.local')
    return { ...c, order_count: orderCounts.get(id) ?? 0, is_placeholder: isPlaceholder }
  })
  // Primary scoring: real email > name-domain match > order_count
  members.sort((a, b) => {
    if (a.is_placeholder !== b.is_placeholder) return a.is_placeholder ? 1 : -1
    const scoreDelta = nameEmailScore(b.company_name, b.email) - nameEmailScore(a.company_name, a.email)
    if (scoreDelta !== 0) return scoreDelta
    return b.order_count - a.order_count
  })
  plan.push({ wcCustId, primary: members[0], dups: members.slice(1) })
}

console.log('\nMerge plan:')
for (const g of plan) {
  console.log(`  WC #${g.wcCustId}  primary: ${g.primary.company_name} (${g.primary.email}, ${g.primary.order_count} orders)`)
  for (const d of g.dups) console.log(`    merge in: ${d.company_name.padEnd(35)} ${d.email.padEnd(35)} ${d.order_count} orders`)
}

if (DRY_RUN) {
  console.log('\nDRY RUN — no writes.')
  process.exit(0)
}

// --- 7. Apply merges --------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['wc_customer_id', 'action', 'primary_id', 'primary_name', 'merged_id', 'merged_name', 'orders_moved', 'error']]
let merged = 0, failed = 0

for (const g of plan) {
  for (const d of g.dups) {
    // Reassign orders
    const { error: e1, count: ordersMoved } = await sb
      .from('orders').update({ customer_id: g.primary.id }).eq('customer_id', d.id).select('id', { count: 'exact' })
    if (e1) { failed++; audit.push([g.wcCustId, 'merge', g.primary.id, g.primary.company_name, d.id, d.company_name, 0, e1.message]); continue }

    // Reassign customer_prices (merge by product_id+unit_type; skip conflicts)
    const { data: dupPrices } = await sb.from('customer_prices').select('id, product_id, unit_type').eq('customer_id', d.id)
    if (dupPrices?.length) {
      const { data: primaryPrices } = await sb.from('customer_prices').select('product_id, unit_type').eq('customer_id', g.primary.id)
      const primaryKeys = new Set((primaryPrices ?? []).map(p => `${p.product_id}|${p.unit_type ?? ''}`))
      for (const dp of dupPrices) {
        const key = `${dp.product_id}|${dp.unit_type ?? ''}`
        if (primaryKeys.has(key)) continue // primary already has price, keep primary's
        await sb.from('customer_prices').update({ customer_id: g.primary.id }).eq('id', dp.id)
      }
    }

    // Delete dup customer (CASCADE handles customer_prices/customer_portal; SET NULL handles reminders)
    const { error: e2 } = await sb.from('customers').delete().eq('id', d.id)
    if (e2) { failed++; audit.push([g.wcCustId, 'merge', g.primary.id, g.primary.company_name, d.id, d.company_name, ordersMoved ?? 0, e2.message]); continue }

    merged++
    audit.push([g.wcCustId, 'merge', g.primary.id, g.primary.company_name, d.id, d.company_name, ordersMoved ?? 0, ''])
  }
}

console.log(`\nMerged: ${merged}  failed: ${failed}`)
writeFileSync(resolve('migration-data', `merge-customers-${today}.csv`), audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

// Recompute remaining placeholders
const { count } = await sb.from('customers').select('id', { count: 'exact', head: true }).like('email', 'woo-%@import.local')
console.log(`Remaining placeholder customers: ${count}`)
