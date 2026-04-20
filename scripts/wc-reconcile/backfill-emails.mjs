// Phase A: Replace placeholder emails (woo-*@import.local) with real WC billing emails.
// Strategy: for each SB customer with a placeholder, find their orders, read the
// wc_email from the CSV (collected from WC order billing), pick the most-common
// email per customer, and UPDATE where still placeholder. Respects UNIQUE(email).
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/backfill-emails.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// --- 1. Parse CSV ------------------------------------------------------
const raw = readFileSync(resolve('migration-data', 'reconciliation-report.csv'), 'utf8')
const [headerLine, ...lines] = raw.trim().split('\n')
const cols = headerLine.split(',')
const idx = (n) => cols.indexOf(n)
function parseRow(s) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"' && s[i+1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  }
  out.push(cur)
  return out
}

// order_number → wc_email
const emailByOrderNumber = new Map()
for (const line of lines) {
  const r = parseRow(line)
  if (r[idx('sb_found')] !== 'yes') continue
  const email = (r[idx('wc_email')] || '').trim().toLowerCase()
  if (!email || !email.includes('@')) continue
  emailByOrderNumber.set(r[idx('sb_order_number')], email)
}
console.log(`Orders with real WC email: ${emailByOrderNumber.size}`)

// --- 2. Get all SB customers with placeholder emails + their orders ---
console.log('Fetching SB customers with placeholder emails ...')
const { data: placeholders, error: phErr } = await sb
  .from('customers')
  .select('id, company_name, email')
  .like('email', 'woo-%@import.local')
if (phErr) { console.error(phErr); process.exit(1) }
console.log(`SB customers with placeholder email: ${placeholders.length}`)

console.log('Fetching order→customer mapping in batches ...')
// Fetch orders for these customers (need order_number → customer_id)
const customerIdToOrderNumbers = new Map()
const BATCH = 200
for (let i = 0; i < placeholders.length; i += BATCH) {
  const batch = placeholders.slice(i, i + BATCH).map(p => p.id)
  const { data, error } = await sb.from('orders').select('order_number, customer_id').in('customer_id', batch)
  if (error) { console.error(error); process.exit(1) }
  for (const o of data) {
    if (!customerIdToOrderNumbers.has(o.customer_id)) customerIdToOrderNumbers.set(o.customer_id, [])
    customerIdToOrderNumbers.get(o.customer_id).push(o.order_number)
  }
}

// --- 3. Build customer_id → chosen_email (mode) -----------------------
const updates = []
const noOrders = []
const noEmail = []
for (const cust of placeholders) {
  const orderNumbers = customerIdToOrderNumbers.get(cust.id) || []
  if (orderNumbers.length === 0) { noOrders.push(cust); continue }
  const emailCounts = new Map()
  for (const on of orderNumbers) {
    const em = emailByOrderNumber.get(on)
    if (em) emailCounts.set(em, (emailCounts.get(em) || 0) + 1)
  }
  if (emailCounts.size === 0) { noEmail.push(cust); continue }
  // Pick most-common email (ties broken alphabetically for determinism)
  const chosen = [...emailCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  updates.push({ id: cust.id, company_name: cust.company_name, old: cust.email, new: chosen, orders: orderNumbers.length })
}
console.log(`  with chosen email:           ${updates.length}`)
console.log(`  customer has no orders:      ${noOrders.length}`)
console.log(`  no real email on any order:  ${noEmail.length}`)

// --- 4. Detect UNIQUE(email) collisions -------------------------------
// Two sources of collision:
//   (a) multiple candidates map to the same new email
//   (b) a different existing customer already has this email (not placeholder)
console.log('\nChecking for collisions ...')
const byNewEmail = new Map()
for (const u of updates) {
  if (!byNewEmail.has(u.new)) byNewEmail.set(u.new, [])
  byNewEmail.get(u.new).push(u)
}
const intraCollisions = [...byNewEmail.entries()].filter(([, arr]) => arr.length > 1)

// Check existing emails in DB (non-placeholder) that match any new email
const uniqueNewEmails = [...byNewEmail.keys()]
const existingConflicts = new Set()
for (let i = 0; i < uniqueNewEmails.length; i += 200) {
  const batch = uniqueNewEmails.slice(i, i + 200)
  const { data, error } = await sb.from('customers').select('id, email').in('email', batch)
  if (error) { console.error(error); process.exit(1) }
  for (const row of data) if (!row.email.startsWith('woo-')) existingConflicts.add(row.email)
}

// Split updates into safe / skipped
const safe = []
const skipped = []
for (const u of updates) {
  const intra = byNewEmail.get(u.new).length
  const conflict = existingConflicts.has(u.new)
  if (intra > 1 || conflict) {
    skipped.push({ ...u, reason: conflict ? 'email_already_used_by_another_customer' : `email_shared_by_${intra}_customers_in_this_batch` })
  } else {
    safe.push(u)
  }
}
console.log(`  intra-batch collisions:      ${intraCollisions.length} emails across ${intraCollisions.reduce((s, [, a]) => s + a.length, 0)} customers`)
console.log(`  conflicts with existing:     ${[...existingConflicts].length} emails`)
console.log(`  safe to update:              ${safe.length}`)
console.log(`  skipped:                     ${skipped.length}`)

// --- 5. Write audit CSV -----------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const auditPath = resolve('migration-data', `backfill-emails-${today}.csv`)
const headers = 'action,customer_id,company_name,old_email,new_email,order_count,reason'
const rows = [
  ...safe.map(u => `update,${u.id},"${u.company_name.replace(/"/g, '""')}",${u.old},${u.new},${u.orders},`),
  ...skipped.map(u => `skip,${u.id},"${u.company_name.replace(/"/g, '""')}",${u.old},${u.new},${u.orders},${u.reason}`),
  ...noOrders.map(c => `skip,${c.id},"${c.company_name.replace(/"/g, '""')}",${c.email},,0,no_orders`),
  ...noEmail.map(c => `skip,${c.id},"${c.company_name.replace(/"/g, '""')}",${c.email},,,no_real_email_on_any_order`),
]
writeFileSync(auditPath, [headers, ...rows].join('\n'))
console.log(`\nAudit trail: ${auditPath}`)

if (DRY_RUN) {
  console.log('\nDRY RUN — first 3 safe updates:')
  console.log(safe.slice(0, 3))
  if (skipped.length) { console.log('\nFirst 3 skipped:'); console.log(skipped.slice(0, 3)) }
  process.exit(0)
}

// --- 6. Apply safe updates (concurrency 20) --------------------------
let done = 0, failed = 0
const errors = []
async function applyOne(u) {
  // Only update if email still matches the expected placeholder (preserves manual changes)
  const { data, error } = await sb
    .from('customers')
    .update({ email: u.new })
    .eq('id', u.id)
    .eq('email', u.old)
    .select('id')
  if (error) { failed++; errors.push({ id: u.id, err: error.message }); return }
  if ((data?.length ?? 0) === 0) return // email already changed — skip silently
  done++
}
console.log(`\nApplying ${safe.length} updates ...`)
const start = Date.now()
const CONCURRENCY = 20
for (let i = 0; i < safe.length; i += CONCURRENCY) {
  await Promise.all(safe.slice(i, i + CONCURRENCY).map(applyOne))
  if ((i / CONCURRENCY) % 25 === 0) process.stdout.write(`  ${done}/${safe.length}  failed=${failed}\r`)
}
console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s  applied=${done}  failed=${failed}`)
if (errors.length) for (const e of errors.slice(0, 10)) console.log(`  ${e.id}: ${e.err}`)
