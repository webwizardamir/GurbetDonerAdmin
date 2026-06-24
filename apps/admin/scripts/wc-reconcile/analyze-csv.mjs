// Analyze the reconciliation-report.csv we already produced.
// Pure CSV reader — no network calls.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raw = readFileSync(resolve('migration-data', 'reconciliation-report.csv'), 'utf8')
const [headerLine, ...lines] = raw.trim().split('\n')
const cols = headerLine.split(',')
const idx = (name) => cols.indexOf(name)

// Simple CSV parser (handles quoted fields)
function parseRow(s) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"' && s[i+1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else {
      if (c === '"') q = true
      else if (c === ',') { out.push(cur); cur = '' }
      else cur += c
    }
  }
  out.push(cur)
  return out
}
const rows = lines.map(parseRow)

// Distribution: WC status of "missing in supabase" orders
const missing = rows.filter(r => r[idx('sb_found')] === 'no')
console.log(`Total rows: ${rows.length}`)
console.log(`Missing in SB: ${missing.length}`)

const missingIds = missing.map(r => Number(r[idx('wc_id')])).sort((a, b) => a - b)
console.log(`  min WC id: ${missingIds[0]}`)
console.log(`  max WC id: ${missingIds[missingIds.length - 1]}`)
console.log(`  first 5: ${missingIds.slice(0, 5).join(', ')}`)
console.log(`  last 5:  ${missingIds.slice(-5).join(', ')}`)

const byStatus = {}
for (const r of missing) {
  const s = r[idx('wc_status')]
  byStatus[s] = (byStatus[s] || 0) + 1
}
console.log('\nMissing-in-SB by WC status:')
for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(25)} ${n}`)

// WC status distribution overall
const statusDist = {}
for (const r of rows) {
  const s = r[idx('wc_status')]
  statusDist[s] = (statusDist[s] || 0) + 1
}
console.log('\nAll WC orders by status (in our scan):')
for (const [s, n] of Object.entries(statusDist).sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(25)} ${n}`)

// Status mismatches — for orders found in SB, what's the WC→SB status pairing?
console.log('\nWC status → SB status distribution (found in SB only):')
const pair = {}
for (const r of rows) {
  if (r[idx('sb_found')] !== 'yes') continue
  const k = `${r[idx('wc_status')]} → ${r[idx('sb_status')]}`
  pair[k] = (pair[k] || 0) + 1
}
for (const [k, n] of Object.entries(pair).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(45)} ${n}`)

// Revenue overage — which WC statuses contribute to SB completed revenue?
// Sum SB total grouped by WC status for SB completed orders
const sbCompletedByWcStatus = {}
for (const r of rows) {
  if (r[idx('sb_found')] !== 'yes') continue
  if (r[idx('sb_status')] !== 'completed') continue
  const ws = r[idx('wc_status')]
  const tot = parseFloat(r[idx('sb_total')] || '0')
  sbCompletedByWcStatus[ws] = (sbCompletedByWcStatus[ws] || 0) + tot
}
console.log('\nSB revenue (status=completed) broken down by the WC status of the same order:')
for (const [ws, total] of Object.entries(sbCompletedByWcStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ws.padEnd(25)} €${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
}
