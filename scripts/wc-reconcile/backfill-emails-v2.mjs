// Phase A v2: second-pass email backfill that queries WC directly for each
// remaining placeholder customer. Needed because Phase E imported orders
// AFTER Phase A ran, so some former "orphan" customers now have orders with
// real billing emails that Phase A's CSV didn't see.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/backfill-emails-v2.mjs [--dry-run]

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

// --- 1. Find all remaining placeholder customers + their orders -----------
const { data: phs } = await sb.from('customers').select('id, company_name, email').like('email', 'woo-%@import.local')
console.log(`Placeholder customers: ${phs.length}`)

const custOrders = new Map()  // customer_id → [WC order IDs]
for (let i = 0; i < phs.length; i += 200) {
  const batch = phs.slice(i, i + 200).map(p => p.id)
  const { data } = await sb.from('orders').select('order_number, customer_id').in('customer_id', batch)
  for (const o of data ?? []) {
    const wcId = Number(o.order_number.replace(/^WOO-/, ''))
    if (!Number.isFinite(wcId)) continue
    if (!custOrders.has(o.customer_id)) custOrders.set(o.customer_id, [])
    custOrders.get(o.customer_id).push(wcId)
  }
}
console.log(`  with ≥1 order:   ${custOrders.size}`)
console.log(`  still orphaned:  ${phs.length - custOrders.size}`)

// --- 2. Collect unique WC order IDs to fetch -------------------------------
const wcIdsToFetch = new Set()
for (const arr of custOrders.values()) for (const id of arr) wcIdsToFetch.add(id)
const allIds = [...wcIdsToFetch]
console.log(`Unique WC orders to fetch: ${allIds.length}`)

const wcEmailByOrderId = new Map()
const BATCH = 100
for (let i = 0; i < allIds.length; i += BATCH) {
  const ids = allIds.slice(i, i + BATCH).join(',')
  const r = await fetch(`${wcBase}/orders?include=${ids}&per_page=${BATCH}&status=any`, { headers: { Authorization: wcAuth } })
  if (!r.ok) { console.error(`WC fetch failed: ${r.status}`); continue }
  const orders = await r.json()
  for (const o of orders) {
    const e = normalize(o.billing?.email)
    if (e && e.includes('@')) wcEmailByOrderId.set(o.id, e)
  }
  process.stdout.write(`  fetched ${Math.min(i + BATCH, allIds.length)}/${allIds.length}\r`)
}
console.log(`\n  with real email: ${wcEmailByOrderId.size}`)

// --- 3. Build customer_id → chosen email (mode) ----------------------------
const updates = []
const noEmail = []
for (const p of phs) {
  const orders = custOrders.get(p.id)
  if (!orders?.length) continue  // still orphan
  const counts = new Map()
  for (const oid of orders) {
    const e = wcEmailByOrderId.get(oid)
    if (e) counts.set(e, (counts.get(e) || 0) + 1)
  }
  if (!counts.size) { noEmail.push(p); continue }
  const chosen = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  updates.push({ id: p.id, company_name: p.company_name, old: p.email, new: chosen })
}

// --- 4. Detect collisions (intra-batch + with existing DB emails) ---------
const byEmail = new Map()
for (const u of updates) { if (!byEmail.has(u.new)) byEmail.set(u.new, []); byEmail.get(u.new).push(u) }

const targets = [...byEmail.keys()]
const existingByEmail = new Set()
for (let i = 0; i < targets.length; i += 200) {
  const b = targets.slice(i, i + 200)
  const { data } = await sb.from('customers').select('email').in('email', b)
  for (const row of data ?? []) if (!row.email.startsWith('woo-')) existingByEmail.add(row.email)
}

// Resolve intra-batch collisions using the same heuristic as the v1 fix:
// prefer company_name that matches the email domain/local part.
function nameEmailScore(name, email) {
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3)
  const [local, domain] = email.toLowerCase().split('@')
  const domainBase = (domain || '').split('.')[0]
  for (const t of tokens) if (local.includes(t) || domainBase.includes(t) || t.includes(domainBase)) return 100
  return 0
}

const safe = []
const skipped = []
for (const u of updates) {
  if (existingByEmail.has(u.new)) { skipped.push({ ...u, reason: 'existing_customer_has_this_email' }); continue }
  const peers = byEmail.get(u.new)
  if (peers.length > 1) {
    // pick highest name-match score, else first alphabetically
    const scored = peers.map(p => ({ p, s: nameEmailScore(p.company_name, u.new) }))
    scored.sort((a, b) => b.s - a.s || a.p.company_name.localeCompare(b.p.company_name))
    if (scored[0].p.id === u.id) safe.push(u)
    else skipped.push({ ...u, reason: `email_shared_in_this_batch_winner_is_${scored[0].p.company_name.replace(/,/g, ' ')}` })
  } else {
    safe.push(u)
  }
}

console.log('\nPlan:')
console.log(`  safe updates:         ${safe.length}`)
console.log(`  skipped (collision):  ${skipped.length}`)
console.log(`  no email on orders:   ${noEmail.length}`)

if (DRY_RUN) {
  console.log('\nFirst 10 safe:')
  for (const u of safe.slice(0, 10)) console.log(`  ${u.company_name.padEnd(35)} → ${u.new}`)
  process.exit(0)
}

// --- 5. Apply ----------------------------------------------------------
let done = 0, failed = 0
const errors = []
async function applyOne(u) {
  const { error } = await sb.from('customers').update({ email: u.new }).eq('id', u.id).eq('email', u.old)
  if (error) { failed++; errors.push({ id: u.id, err: error.message }); return }
  done++
}
const CONCURRENCY = 15
for (let i = 0; i < safe.length; i += CONCURRENCY) {
  await Promise.all(safe.slice(i, i + CONCURRENCY).map(applyOne))
}
console.log(`\napplied=${done}  failed=${failed}`)
if (errors.length) for (const e of errors.slice(0, 5)) console.log(`  ${e.id}: ${e.err}`)

// Audit
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
writeFileSync(resolve('migration-data', `backfill-emails-v2-${today}.csv`), [
  'action,customer_id,company_name,old_email,new_email,reason',
  ...safe.map(u => `update,${u.id},"${u.company_name.replace(/"/g, '""')}",${u.old},${u.new},`),
  ...skipped.map(u => `skip,${u.id},"${u.company_name.replace(/"/g, '""')}",${u.old},${u.new},${u.reason}`),
  ...noEmail.map(u => `skip,${u.id},"${u.company_name.replace(/"/g, '""')}",${u.email},,no_real_email_on_any_wc_order`),
].join('\n'))
