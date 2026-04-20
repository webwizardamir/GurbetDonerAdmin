// Phase B: Fix the 116 orders where WC is paid-by-(bank|cash)-fix but SB is stuck
// as pending_payment. Re-verifies each against live WC before writing.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/fix-status-mapping.mjs [--dry-run]

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wcAuth = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64')
const wcBase = `${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3`

// --- 1. Pick candidates from CSV --------------------------------------
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

const candidates = []
for (const line of lines) {
  const r = parseRow(line)
  const wcStatus = r[idx('wc_status')]
  const sbStatus = r[idx('sb_status')]
  if ((wcStatus === 'paid-by-bank-fix' || wcStatus === 'paid-by-cash-fix') && sbStatus === 'pending_payment') {
    candidates.push({
      wcId: Number(r[idx('wc_id')]),
      wcStatus,
      sbOrderNumber: r[idx('sb_order_number')],
      expectedPayment: wcStatus === 'paid-by-bank-fix' ? 'bank' : 'cash',
    })
  }
}
console.log(`Candidates from CSV: ${candidates.length}`)

// --- 2. Verify each against live WC (batched via ?include=) -----------
console.log('Re-verifying against live WC ...')
const verified = []
const BATCH = 100
for (let i = 0; i < candidates.length; i += BATCH) {
  const batch = candidates.slice(i, i + BATCH)
  const ids = batch.map(c => c.wcId).join(',')
  const r = await fetch(`${wcBase}/orders?include=${ids}&per_page=${BATCH}&status=any`, { headers: { Authorization: wcAuth } })
  if (!r.ok) throw new Error(`WC fetch failed: ${r.status} ${(await r.text()).slice(0, 200)}`)
  const orders = await r.json()
  const byId = new Map(orders.map(o => [o.id, o]))
  for (const c of batch) {
    const live = byId.get(c.wcId)
    if (!live) { console.warn(`  ! WC #${c.wcId} not returned by WC`); continue }
    if (live.status !== c.wcStatus) { console.warn(`  ! WC #${c.wcId} status changed: ${c.wcStatus} → ${live.status} — skipping`); continue }
    verified.push(c)
  }
}
console.log(`Verified as still paid-by-*-fix: ${verified.length} / ${candidates.length}`)

// --- 3. Write audit CSV before applying -------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const auditPath = resolve('migration-data', `fix-status-mapping-${new Date().toISOString().slice(0,10)}.csv`)
const auditLines = ['wc_id,sb_order_number,wc_status,new_sb_status,new_payment_method']
for (const c of verified) {
  auditLines.push(`${c.wcId},${c.sbOrderNumber},${c.wcStatus},completed,${c.expectedPayment}`)
}
writeFileSync(auditPath, auditLines.join('\n'))
console.log(`Audit trail: ${auditPath}`)

if (DRY_RUN) {
  console.log('\nDRY RUN — first 5:')
  console.log(verified.slice(0, 5))
  process.exit(0)
}

// --- 4. Apply updates --------------------------------------------------
let done = 0, skipped = 0, failed = 0
const errors = []

async function applyOne({ sbOrderNumber, expectedPayment }) {
  // Safety: only update if status is STILL pending_payment (preserves any manual changes)
  const { data, error, count } = await sb
    .from('orders')
    .update({ status: 'completed', payment_method: expectedPayment })
    .eq('order_number', sbOrderNumber)
    .eq('status', 'pending_payment')
    .select('id', { count: 'exact' })
  if (error) { failed++; errors.push({ sbOrderNumber, err: error.message }); return }
  if ((data?.length ?? 0) === 0) { skipped++; return }
  done++
}

console.log(`\nApplying ${verified.length} updates ...`)
const start = Date.now()
const CONCURRENCY = 10
for (let i = 0; i < verified.length; i += CONCURRENCY) {
  await Promise.all(verified.slice(i, i + CONCURRENCY).map(applyOne))
}
console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s  applied=${done}  skipped=${skipped}  failed=${failed}`)
if (errors.length) for (const e of errors.slice(0, 5)) console.log(`  ${e.sbOrderNumber}: ${e.err}`)
