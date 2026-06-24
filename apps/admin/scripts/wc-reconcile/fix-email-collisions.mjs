// Resolve the 14 customers in 7 email-sharing groups: give the email to the
// customer with the most orders in each group; others keep placeholder.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/fix-email-collisions.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Load the earlier audit CSV — it lists all skipped customers with their proposed new_email
const auditFile = resolve('migration-data', 'backfill-emails-2026-04-20.csv')
const raw = readFileSync(auditFile, 'utf8')
const [h, ...lines] = raw.trim().split('\n')
const cols = h.split(',')
const idx = (n) => cols.indexOf(n)
function parseRow(s) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) { const c = s[i]
    if (q) { if (c === '"' && s[i+1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  }
  out.push(cur); return out
}

// Extract collision-skipped rows (action=skip, reason=email_shared_by_N_customers_in_this_batch)
const collisions = []
for (const line of lines) {
  const r = parseRow(line)
  if (r[idx('action')] !== 'skip') continue
  if (!r[idx('reason')]?.startsWith('email_shared_by_')) continue
  collisions.push({
    customer_id: r[idx('customer_id')],
    company_name: r[idx('company_name')],
    old_email: r[idx('old_email')],
    new_email: r[idx('new_email')],
  })
}
console.log(`Collision-skipped customers: ${collisions.length}`)

// Group by proposed new_email
const groups = new Map()
for (const c of collisions) {
  if (!groups.has(c.new_email)) groups.set(c.new_email, [])
  groups.get(c.new_email).push(c)
}
console.log(`Groups: ${groups.size}`)

// Score each candidate: strong bonus if company name tokens match the email
// (local part or domain). Fall back to order count. This prefers the real
// business entity over accounting/sub-departments that share a billing inbox.
function nameEmailScore(companyName, email) {
  const nameTokens = companyName.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3)
  const [local, domain] = email.toLowerCase().split('@')
  const domainBase = (domain || '').split('.')[0]
  let hit = false
  for (const t of nameTokens) {
    if (local.includes(t) || domainBase.includes(t) || t.includes(domainBase)) { hit = true; break }
  }
  return hit ? 100 : 0
}

const winners = []
const losers = []
for (const [email, members] of groups) {
  const counts = await Promise.all(members.map(async m => {
    const { count } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', m.customer_id)
    const nameScore = nameEmailScore(m.company_name, email)
    return { ...m, order_count: count ?? 0, score: nameScore + (count ?? 0) / 10 }
  }))
  // Highest score wins; tiebreak by order count desc, then alphabetical
  counts.sort((a, b) => b.score - a.score || b.order_count - a.order_count || a.company_name.localeCompare(b.company_name))
  winners.push(counts[0])
  losers.push(...counts.slice(1))
  console.log(`  ${email}`)
  for (const c of counts) console.log(`    ${c === counts[0] ? '→ WINNER' : '  keep placeholder'}  ${c.company_name.padEnd(35)} orders=${c.order_count}  name_match=${c.score >= 100}`)
}

if (DRY_RUN) { console.log('\nDRY RUN — no writes.'); process.exit(0) }

// Apply: update winners only
console.log('\nApplying ...')
let done = 0, failed = 0
for (const w of winners) {
  const { error } = await sb.from('customers').update({ email: w.new_email }).eq('id', w.customer_id).eq('email', w.old_email)
  if (error) { failed++; console.error(`  ${w.company_name}: ${error.message}`) }
  else done++
}
console.log(`Winners updated: ${done}/${winners.length}  failed: ${failed}`)
console.log(`Losers (kept placeholder): ${losers.length}`)

// Audit
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
writeFileSync(resolve('migration-data', `fix-email-collisions-${today}.csv`), [
  'action,customer_id,company_name,email,order_count',
  ...winners.map(w => `update,${w.customer_id},"${w.company_name.replace(/"/g,'""')}",${w.new_email},${w.order_count}`),
  ...losers.map(l => `keep_placeholder,${l.customer_id},"${l.company_name.replace(/"/g,'""')}",${l.old_email},${l.order_count}`),
].join('\n'))
