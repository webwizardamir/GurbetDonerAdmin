// Go-live fresh import: WC registered customers -> SB customers (clean slate).
// Source of truth is the WC /customers endpoint (NOT order billing), which avoids
// the old guest-billing duplicate / placeholder-email / sparse-address mess.
//
// Run AFTER the wipe. Deduplicates by lowercased email within the batch.
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/import-customers-fresh.mjs [--dry-run]

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

const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','CH','NO'])
const norm = (s) => (s || '').trim()
const lc = (s) => norm(s).toLowerCase()

function cleanVat(raw) {
  const v = norm(raw).toUpperCase().replace(/\s+/g, ' ')
  return v || null
}
function inferCountryFromVat(rawVat) {
  const v = norm(rawVat).toUpperCase()
  const m = v.match(/^([A-Z]{2})/)
  if (m && EU.has(m[1])) return m[1]
  return null
}

// --- 1. Pull WC customers (paged) ------------------------------------
console.log('Loading WC customers ...')
const wcCustomers = []
{
  let page = 1
  while (true) {
    const r = await fetch(`${wcBase}/customers?per_page=100&page=${page}&orderby=id&order=asc`, { headers: { Authorization: wcAuth } })
    if (!r.ok) { console.error(`WC ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1) }
    const batch = await r.json()
    wcCustomers.push(...batch)
    if (batch.length < 100) break
    page++
  }
}
console.log(`  WC customers: ${wcCustomers.length}`)

// --- 2. Build payloads + dedup by email ------------------------------
const seenEmail = new Map()   // lc(email) -> payload (first wins, but prefer one with company/vat)
const noEmail = []            // customers with no email (cannot insert — email NOT NULL)
let inferredCountryCount = 0

for (const c of wcCustomers) {
  const b = c.billing || {}
  const s = c.shipping || {}
  const email = lc(c.email || b.email)
  const vatRaw = (c.meta_data || []).find(m => m.key === 'btw_address')?.value
  const vat = cleanVat(vatRaw)

  const fullName = `${norm(b.first_name) || norm(c.first_name)} ${norm(b.last_name) || norm(c.last_name)}`.trim()
  const company = norm(b.company) || norm(c.username) || fullName || (email ? email.split('@')[0] : '')
  if (!email) { noEmail.push({ wcId: c.id, company }); continue }

  let country = norm(b.country).toUpperCase()
  let inferred = false
  if (!country) {
    const fromVat = inferCountryFromVat(vatRaw)
    if (fromVat) { country = fromVat; inferred = true; inferredCountryCount++ }
    else country = 'NL'
  }

  const billingStreet = [norm(b.address_1), norm(b.address_2)].filter(Boolean).join(' ') || null
  const hasShip = !!norm(s.address_1)
  const payload = {
    company_name: company || 'Onbekend',
    contact_person: fullName || null,
    email,
    phone: norm(b.phone) || null,
    vat_number: vat,
    // billing = source of truth for app + PDFs
    billing_street: billingStreet,
    billing_city: norm(b.city) || null,
    billing_postal_code: norm(b.postcode) || null,
    billing_country: country,
    // legacy mirrors (some list/detail views read these)
    address: billingStreet,
    city: norm(b.city) || null,
    postal_code: norm(b.postcode) || null,
    country,
    // shipping
    shipping_same_as_billing: !hasShip,
    shipping_street: hasShip ? ([norm(s.address_1), norm(s.address_2)].filter(Boolean).join(' ') || null) : null,
    shipping_city: hasShip ? (norm(s.city) || null) : null,
    shipping_postal_code: hasShip ? (norm(s.postcode) || null) : null,
    shipping_country: hasShip ? (norm(s.country).toUpperCase() || country) : country,
    is_active: true,
    _wcId: c.id,
    _inferred: inferred,
  }

  const prev = seenEmail.get(email)
  if (!prev) seenEmail.set(email, payload)
  else {
    // keep the richer record (prefer one with vat, then company length)
    const score = (p) => (p.vat_number ? 2 : 0) + (p.company_name && p.company_name !== 'Onbekend' ? 1 : 0)
    if (score(payload) > score(prev)) seenEmail.set(email, payload)
  }
}

const payloads = [...seenEmail.values()]
console.log(`\nPlan:`)
console.log(`  unique customers to insert: ${payloads.length}`)
console.log(`  skipped (no email):         ${noEmail.length}`)
console.log(`  country inferred from VAT:   ${inferredCountryCount}`)
console.log(`  non-NL (reverse charge):     ${payloads.filter(p => p.billing_country !== 'NL').length}`)
console.log(`  with VAT number:             ${payloads.filter(p => p.vat_number).length}`)

if (DRY_RUN) {
  console.log('\nFirst 10:')
  for (const p of payloads.slice(0, 10)) {
    console.log(`  WC#${p._wcId}  ${p.company_name.padEnd(34).slice(0,34)}  ${p.billing_country}${p._inferred?'*':' '}  vat=${p.vat_number ?? '—'}  ${p.email}`)
  }
  if (noEmail.length) console.log('\nNo-email (skipped):', noEmail.slice(0, 10).map(x => `WC#${x.wcId} ${x.company}`).join(' | '))
  process.exit(0)
}

// --- 3. Insert in batches --------------------------------------------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['action','wc_id','company','email','country','inferred','vat','error']]
let inserted = 0, failed = 0
const CHUNK = 100
for (let i = 0; i < payloads.length; i += CHUNK) {
  const chunk = payloads.slice(i, i + CHUNK)
  const rows = chunk.map(({ _wcId, _inferred, ...r }) => r)
  const { data, error } = await sb.from('customers').insert(rows).select('id, email')
  if (error) {
    // fall back to per-row to isolate the offender
    for (const p of chunk) {
      const { _wcId, _inferred, ...row } = p
      const { error: e2 } = await sb.from('customers').insert(row)
      if (e2) { failed++; audit.push(['insert_failed', _wcId, p.company_name, p.email, p.billing_country, _inferred, p.vat_number ?? '', e2.message]) }
      else { inserted++; audit.push(['insert', _wcId, p.company_name, p.email, p.billing_country, _inferred, p.vat_number ?? '', '']) }
    }
  } else {
    for (const p of chunk) { inserted++; audit.push(['insert', p._wcId, p.company_name, p.email, p.billing_country, p._inferred, p.vat_number ?? '', '']) }
  }
  process.stdout.write(`  inserted ${inserted}/${payloads.length}\r`)
}
for (const x of noEmail) audit.push(['skip_no_email', x.wcId, x.company, '', '', '', '', 'no_email'])

const auditPath = resolve('migration-data', `import-customers-fresh-${today}.csv`)
writeFileSync(auditPath, audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nDone.  inserted=${inserted}  failed=${failed}  skipped_no_email=${noEmail.length}`)
console.log(`Audit trail: ${auditPath}`)
