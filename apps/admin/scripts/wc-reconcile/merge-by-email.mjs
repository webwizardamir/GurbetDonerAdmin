// Email-keyed merge: for each placeholder customer, find the dominant
// WC billing email of its orders, then look for a non-placeholder SB
// customer already holding exactly that email. If found, merge the
// placeholder into it. Otherwise skip (user inspected and decided
// emails differ = different customers).
//
// This fixes the user's concern: only merge when the real billing
// email is identical; different emails → separate businesses.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/merge-by-email.mjs [--dry-run]

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

// --- 1. Find all placeholder SB customers + their orders -------------
const { data: placeholders } = await sb.from('customers').select('id, company_name, email').like('email', 'woo-%@import.local')
console.log(`Placeholder customers: ${placeholders.length}`)

const phIds = placeholders.map(p => p.id)
const phOrders = new Map()
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

// --- 2. Fetch billing email per order --------------------------------
const allOrderIds = [...new Set([...phOrders.values()].flat())]
console.log(`Fetching billing email for ${allOrderIds.length} WC orders ...`)
const billingByOrderId = new Map()
for (let i = 0; i < allOrderIds.length; i += 100) {
  const ids = allOrderIds.slice(i, i + 100).join(',')
  const r = await fetch(`${wcBase}/orders?include=${ids}&per_page=100&status=any`, { headers: { Authorization: wcAuth } })
  if (!r.ok) { console.error(`WC ${r.status}`); continue }
  for (const o of await r.json()) {
    const e = normalize(o.billing?.email)
    if (e && e.includes('@')) billingByOrderId.set(o.id, e)
  }
}

// --- 3. For each placeholder, pick the dominant (mode) billing email --
const plan = []  // { placeholder, dominantEmail, primary?, skipReason? }
for (const ph of placeholders) {
  const orderIds = phOrders.get(ph.id) ?? []
  const counts = new Map()
  for (const oid of orderIds) {
    const e = billingByOrderId.get(oid)
    if (e) counts.set(e, (counts.get(e) || 0) + 1)
  }
  if (counts.size === 0) { plan.push({ placeholder: ph, skipReason: 'no_billing_email_on_any_order' }); continue }
  const emailCounts = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const dominantEmail = emailCounts[0][0]
  const dominance = emailCounts[0][1] / orderIds.length
  plan.push({ placeholder: ph, dominantEmail, dominance, emailVariants: counts.size })
}

// --- 4. For each placeholder with a dominant email, find the holder ---
const targetEmails = [...new Set(plan.filter(p => p.dominantEmail).map(p => p.dominantEmail))]
const holderByEmail = new Map()
for (let i = 0; i < targetEmails.length; i += 200) {
  const batch = targetEmails.slice(i, i + 200)
  const { data } = await sb.from('customers').select('id, company_name, email').in('email', batch)
  for (const c of data ?? []) holderByEmail.set(c.email, c)
}

// Decide merge target for each placeholder
const mergePlan = []
const skipPlan = []
for (const item of plan) {
  if (item.skipReason) { skipPlan.push(item); continue }
  const holder = holderByEmail.get(item.dominantEmail)
  if (!holder) {
    // No real-email customer has this email yet → just update placeholder
    skipPlan.push({ ...item, skipReason: 'no_holder_found_(should_be_rare)' })
    continue
  }
  if (holder.id === item.placeholder.id) { skipPlan.push({ ...item, skipReason: 'already_has_this_email' }); continue }
  if (item.dominance < 0.5) { skipPlan.push({ ...item, skipReason: `email_not_dominant_(variants=${item.emailVariants})` }); continue }
  mergePlan.push({ placeholder: item.placeholder, primary: holder, email: item.dominantEmail })
}

// Pre-count orders for nicer output
const sbIds = [...new Set([...mergePlan.map(m => m.placeholder.id), ...mergePlan.map(m => m.primary.id)])]
const orderCounts = new Map()
for (let i = 0; i < sbIds.length; i += 200) {
  const batch = sbIds.slice(i, i + 200)
  const { data } = await sb.from('orders').select('customer_id').in('customer_id', batch)
  for (const o of data ?? []) orderCounts.set(o.customer_id, (orderCounts.get(o.customer_id) ?? 0) + 1)
}

console.log('\nMERGE PLAN (email match only):')
for (const m of mergePlan) {
  const phO = orderCounts.get(m.placeholder.id) ?? 0
  const prO = orderCounts.get(m.primary.id) ?? 0
  console.log(`  [${m.email}]  ${m.placeholder.company_name.padEnd(35)} (+${phO} orders) → ${m.primary.company_name.padEnd(30)} (${prO} orders)`)
}
console.log(`\nSKIPPED (email differs or no match):`)
for (const s of skipPlan) {
  console.log(`  ${s.placeholder.company_name.padEnd(35)} ${s.skipReason}${s.dominantEmail ? ` (wanted: ${s.dominantEmail})` : ''}`)
}
console.log(`\nTotals: merge=${mergePlan.length}  skip=${skipPlan.length}`)

if (DRY_RUN) process.exit(0)

// --- 5. Apply merges -------------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action', 'placeholder_id', 'placeholder_name', 'primary_id', 'primary_name', 'email', 'orders_moved', 'error']]
let merged = 0, failed = 0

for (const m of mergePlan) {
  // Reassign orders
  const { error: e1, count: ordersMoved } = await sb
    .from('orders').update({ customer_id: m.primary.id }).eq('customer_id', m.placeholder.id).select('id', { count: 'exact' })
  if (e1) { failed++; audit.push(['merge', m.placeholder.id, m.placeholder.company_name, m.primary.id, m.primary.company_name, m.email, 0, e1.message]); continue }

  // Reassign customer_prices (skip conflicts where primary already has a price for the same product+unit)
  const { data: dupPrices } = await sb.from('customer_prices').select('id, product_id, unit_type').eq('customer_id', m.placeholder.id)
  if (dupPrices?.length) {
    const { data: primaryPrices } = await sb.from('customer_prices').select('product_id, unit_type').eq('customer_id', m.primary.id)
    const primaryKeys = new Set((primaryPrices ?? []).map(p => `${p.product_id}|${p.unit_type ?? ''}`))
    for (const dp of dupPrices) {
      const key = `${dp.product_id}|${dp.unit_type ?? ''}`
      if (primaryKeys.has(key)) continue
      await sb.from('customer_prices').update({ customer_id: m.primary.id }).eq('id', dp.id)
    }
  }

  // Delete placeholder (CASCADE/SET NULL handles downstream rows)
  const { error: e2 } = await sb.from('customers').delete().eq('id', m.placeholder.id)
  if (e2) { failed++; audit.push(['merge', m.placeholder.id, m.placeholder.company_name, m.primary.id, m.primary.company_name, m.email, ordersMoved ?? 0, e2.message]); continue }
  merged++
  audit.push(['merge', m.placeholder.id, m.placeholder.company_name, m.primary.id, m.primary.company_name, m.email, ordersMoved ?? 0, ''])
}

// Audit skips too
for (const s of skipPlan) {
  audit.push(['skip', s.placeholder.id, s.placeholder.company_name, '', '', s.dominantEmail ?? '', 0, s.skipReason])
}

writeFileSync(resolve('migration-data', `merge-by-email-${today}.csv`), audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nMerged: ${merged}  failed: ${failed}`)
const { count } = await sb.from('customers').select('id', { count: 'exact', head: true }).like('email', 'woo-%@import.local')
console.log(`Remaining placeholder customers: ${count}`)
