// Backfill orders.woo_invoice_number + woo_invoice_date from the reconciliation CSV.
// Requires migration 00037 to be applied first.
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/backfill-invoice-numbers.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const DRY_RUN = process.argv.includes('--dry-run')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// --- Read CSV ---------------------------------------------------------
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

// --- Build update list -----------------------------------------------
const updates = []
let sbNotFound = 0
let noInvoice = 0

for (const line of lines) {
  const row = parseRow(line)
  const invoiceNum = row[idx('wc_invoice_number')]
  const sbFound = row[idx('sb_found')]
  const wcId = row[idx('wc_id')]

  if (sbFound !== 'yes') { sbNotFound++; continue }
  if (!invoiceNum) { noInvoice++; continue }

  updates.push({
    order_number: `WOO-${wcId}`,
    woo_invoice_number: parseInt(invoiceNum, 10),
  })
}

console.log(`CSV rows:                   ${lines.length}`)
console.log(`Not found in Supabase:      ${sbNotFound}`)
console.log(`No WC invoice number:       ${noInvoice}`)
console.log(`To backfill:                ${updates.length}`)

if (DRY_RUN) {
  console.log('\nDRY RUN — sample of first 5 updates:')
  console.log(updates.slice(0, 5))
  console.log('\nRun without --dry-run to apply.')
  process.exit(0)
}

// --- Sanity check: column exists -------------------------------------
const probe = await sb.from('orders').select('id, woo_invoice_number').limit(1)
if (probe.error) {
  console.error('\nColumn check failed — has migration 00037 been applied?')
  console.error(probe.error.message)
  process.exit(1)
}

// --- Apply updates in batches ---------------------------------------
// Supabase doesn't support bulk UPDATE-from-values natively via JS, so we
// loop. To keep runtime reasonable we parallelise in chunks of 20.
const CONCURRENCY = 20
let done = 0, failed = 0
const errors = []

async function applyOne({ order_number, woo_invoice_number }) {
  const { error } = await sb
    .from('orders')
    .update({ woo_invoice_number })
    .eq('order_number', order_number)
    .is('woo_invoice_number', null)  // don't overwrite existing values
  if (error) { failed++; errors.push({ order_number, err: error.message }) }
  else done++
}

console.log(`\nApplying ${updates.length} updates (concurrency ${CONCURRENCY}) ...`)
const start = Date.now()
for (let i = 0; i < updates.length; i += CONCURRENCY) {
  const batch = updates.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map(applyOne))
  if ((i / CONCURRENCY) % 25 === 0) {
    process.stdout.write(`  ${done}/${updates.length}  failed=${failed}\r`)
  }
}
console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s  applied=${done}  failed=${failed}`)
if (errors.length) {
  console.log('\nFirst 10 errors:')
  for (const e of errors.slice(0, 10)) console.log(`  ${e.order_number}: ${e.err}`)
}
