// Phase E: Import 216 WC orders that post-date the migration cutoff.
// Mirrors the schema used by the prior migration (order_number = WOO-<id>,
// internal_notes = "WooCommerce #<id>", status mapping per observed mapping,
// product linking by SKU snapshot, stock NOT adjusted).
//
// Usage:
//   node --env-file=.env.local scripts/wc-reconcile/import-missing-orders.mjs [--dry-run]

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

const toCents = (s) => Math.round(parseFloat(s || '0') * 100)
const normalize = (s) => (s || '').trim().toLowerCase()

// --- Status mapping (observed from prior migration) -------------------
const STATUS_MAP = {
  'completed':         { status: 'completed',       payment: null },
  'processing':        { status: 'pending_payment', payment: null },
  'pending':           { status: 'pending_payment', payment: null },
  'on-hold':           { status: 'on_hold',         payment: null },
  'cancelled':         { status: 'cancelled',       payment: null },
  'refunded':          { status: 'refunded',        payment: null },
  'failed':            { status: 'cancelled',       payment: null },
  'paid-by-bank-fix':  { status: 'completed',       payment: 'bank' },
  'paid-by-cash-fix':  { status: 'completed',       payment: 'cash' },
  'paid-by-cash-2':    { status: 'completed',       payment: 'cash' },
}

// --- 1. Decide which WC IDs to import --------------------------------
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

const toImport = []
for (const line of lines) {
  const r = parseRow(line)
  if (r[idx('sb_found')] !== 'no') continue
  const wcId = Number(r[idx('wc_id')])
  const wcStatus = r[idx('wc_status')]
  if (wcStatus === 'auto-draft') continue
  if (wcId === 1043) continue // 2024 anomaly — flag, don't auto-import
  toImport.push(wcId)
}
toImport.sort((a, b) => a - b)
console.log(`To import: ${toImport.length} WC order IDs`)
console.log(`  range: ${toImport[0]} → ${toImport[toImport.length - 1]}`)

// --- 2. Preload SB customers + products ------------------------------
console.log('Preloading SB customers + products ...')
const { data: sbCustomers, error: cErr } = await sb.from('customers').select('id, company_name, email, vat_number')
if (cErr) { console.error(cErr); process.exit(1) }
const custByEmail = new Map()
const custByCompany = new Map()
for (const c of sbCustomers) {
  if (c.email && !c.email.startsWith('woo-')) custByEmail.set(normalize(c.email), c.id)
  if (c.company_name) custByCompany.set(normalize(c.company_name), c.id)
}
console.log(`  customers: ${sbCustomers.length} (email index: ${custByEmail.size}, company index: ${custByCompany.size})`)

const { data: sbProducts, error: pErr } = await sb.from('products').select('id, sku, name, cost_cents, tax_rate')
if (pErr) { console.error(pErr); process.exit(1) }
const prodBySku = new Map()
const prodByName = new Map()
for (const p of sbProducts) {
  if (p.sku) prodBySku.set(p.sku, p)
  if (p.name) prodByName.set(normalize(p.name), p)
}
console.log(`  products:  ${sbProducts.length}`)

// --- 3. Fetch WC orders in batches via ?include= ---------------------
console.log('Fetching WC orders ...')
const wcOrders = []
const BATCH = 50
for (let i = 0; i < toImport.length; i += BATCH) {
  const ids = toImport.slice(i, i + BATCH).join(',')
  const r = await fetch(`${wcBase}/orders?include=${ids}&per_page=${BATCH}&status=any`, { headers: { Authorization: wcAuth } })
  if (!r.ok) { console.error(`WC ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1) }
  const batch = await r.json()
  wcOrders.push(...batch)
  process.stdout.write(`  fetched ${wcOrders.length}/${toImport.length}\r`)
}
console.log(`\n  got ${wcOrders.length} WC orders`)

// --- 4. Resolve / build customer for each order ----------------------
// To avoid duplicates within this batch we track (email|company) → id and new-customer payloads
const newCustomers = new Map()  // key → payload
const orderCustomerKey = new Map()  // wc_id → key (used after inserts to look up uuid)

function customerKeyForOrder(wo) {
  const email = normalize(wo.billing?.email)
  if (email && custByEmail.has(email)) return { existingId: custByEmail.get(email) }
  const company = normalize(wo.billing?.company) || normalize(`${wo.billing?.first_name ?? ''} ${wo.billing?.last_name ?? ''}`.trim())
  if (company && custByCompany.has(company)) return { existingId: custByCompany.get(company) }
  // New customer
  const displayName = wo.billing?.company?.trim() || `${wo.billing?.first_name ?? ''} ${wo.billing?.last_name ?? ''}`.trim() || 'Unknown'
  const key = email ? `email:${email}` : `company:${normalize(displayName)}`
  if (!newCustomers.has(key)) {
    newCustomers.set(key, {
      company_name: displayName,
      contact_person: `${wo.billing?.first_name ?? ''} ${wo.billing?.last_name ?? ''}`.trim() || null,
      email: email || null,
      phone: wo.billing?.phone || null,
      billing_street: [wo.billing?.address_1, wo.billing?.address_2].filter(Boolean).join(' ') || null,
      billing_city: wo.billing?.city || null,
      billing_postal_code: wo.billing?.postcode || null,
      billing_country: wo.billing?.country || 'NL',
      shipping_street: [wo.shipping?.address_1, wo.shipping?.address_2].filter(Boolean).join(' ') || null,
      shipping_city: wo.shipping?.city || null,
      shipping_postal_code: wo.shipping?.postcode || null,
      shipping_country: wo.shipping?.country || 'NL',
    })
  }
  return { newCustomerKey: key }
}

const customerResolution = new Map()  // wc_id → { id }
for (const wo of wcOrders) {
  customerResolution.set(wo.id, customerKeyForOrder(wo))
}
console.log(`  new customers needed: ${newCustomers.size}`)

// --- 5. Dry-run preview ---------------------------------------------
if (DRY_RUN) {
  console.log('\nDRY RUN — first 3 orders preview:')
  for (const wo of wcOrders.slice(0, 3)) {
    const cres = customerResolution.get(wo.id)
    console.log({
      wc_id: wo.id,
      status: wo.status,
      mapped_status: STATUS_MAP[wo.status]?.status ?? 'UNKNOWN',
      total: wo.total,
      customer: cres.existingId ? `existing:${cres.existingId}` : `new:${cres.newCustomerKey}`,
      line_items: wo.line_items?.length,
      date: wo.date_created,
    })
  }
  // Unknown-status check
  const unknown = wcOrders.filter(o => !STATUS_MAP[o.status])
  if (unknown.length) console.log(`\n⚠ UNKNOWN status orders: ${unknown.map(o => `#${o.id}=${o.status}`).join(', ')}`)
  process.exit(0)
}

// --- 6. Insert new customers in one batch ----------------------------
let newCustIdByKey = new Map()
if (newCustomers.size) {
  console.log(`Inserting ${newCustomers.size} new customers ...`)
  const payloads = [...newCustomers.values()]
  const { data: inserted, error } = await sb.from('customers').insert(payloads).select('id, company_name, email')
  if (error) { console.error('Customer insert failed:', error); process.exit(1) }
  for (const c of inserted) {
    const key = c.email ? `email:${normalize(c.email)}` : `company:${normalize(c.company_name)}`
    newCustIdByKey.set(key, c.id)
  }
}

// --- 7. Build + insert orders (serially, then batch items) ----------
mkdirSync(resolve('migration-data'), { recursive: true })
const today = new Date().toISOString().slice(0, 10)
const audit = [['wc_id', 'sb_order_id', 'customer_id', 'status', 'total_eur', 'items', 'outcome', 'error']]

let inserted = 0, skipped = 0, failed = 0

for (const wo of wcOrders) {
  const mapping = STATUS_MAP[wo.status]
  if (!mapping) {
    audit.push([wo.id, '', '', wo.status, wo.total, wo.line_items?.length ?? 0, 'skipped', 'unknown_status'])
    skipped++; continue
  }
  const cres = customerResolution.get(wo.id)
  const customerId = cres.existingId || newCustIdByKey.get(cres.newCustomerKey)
  if (!customerId) {
    audit.push([wo.id, '', '', wo.status, wo.total, wo.line_items?.length ?? 0, 'failed', 'customer_unresolved'])
    failed++; continue
  }

  const invoiceNum = wo.meta_data?.find(m => m.key === '_wcpdf_invoice_number')?.value
  const invoiceDate = wo.meta_data?.find(m => m.key === '_wcpdf_invoice_date_formatted')?.value

  const subtotalCents = toCents(wo.line_items?.reduce((s, i) => s + parseFloat(i.subtotal || '0'), 0) || 0)
  const orderPayload = {
    order_number: `WOO-${wo.id}`,
    customer_id: customerId,
    status: mapping.status,
    payment_method: mapping.payment,
    subtotal: subtotalCents,
    discount: toCents(wo.discount_total),
    discount_amount: toCents(wo.discount_total),
    tax: toCents(wo.total_tax),
    tax_amount: toCents(wo.total_tax),
    delivery_fee: toCents(wo.shipping_total),
    total: toCents(wo.total),
    order_date: wo.date_created?.slice(0, 10),
    created_at: wo.date_created,
    delivery_notes: wo.customer_note || '',
    internal_notes: `WooCommerce #${wo.id}`,
    woo_invoice_number: invoiceNum ? parseInt(invoiceNum, 10) : null,
    woo_invoice_date: invoiceDate || null,
  }

  const { data: insO, error: oErr } = await sb.from('orders').insert(orderPayload).select('id').single()
  if (oErr) {
    audit.push([wo.id, '', customerId, mapping.status, wo.total, wo.line_items?.length ?? 0, 'failed', oErr.message.replace(/"/g, '""')])
    failed++; continue
  }

  const items = (wo.line_items ?? []).map(li => {
    const p = (li.sku && prodBySku.get(li.sku)) || prodByName.get(normalize(li.name))
    return {
      order_id: insO.id,
      product_id: p?.id ?? null,
      product_name: li.name,
      product_sku: li.sku || null,
      quantity: parseFloat(li.quantity) || 0,
      unit_price: toCents(li.price),
      cost_cents: p?.cost_cents ?? 0,
      discount_amount: 0,
      tax_rate: p?.tax_rate ?? 9,
      tax_amount: toCents(li.total_tax),
      total: toCents(li.total),
      line_total: toCents(li.total),
      unit_type: 'piece',
    }
  })
  if (items.length) {
    const { error: iErr } = await sb.from('order_items').insert(items)
    if (iErr) {
      audit.push([wo.id, insO.id, customerId, mapping.status, wo.total, items.length, 'partial', iErr.message.replace(/"/g, '""')])
      failed++; continue
    }
  }
  audit.push([wo.id, insO.id, customerId, mapping.status, wo.total, items.length, 'inserted', ''])
  inserted++
  if (inserted % 20 === 0) process.stdout.write(`  inserted ${inserted}/${wcOrders.length}\r`)
}

const auditPath = resolve('migration-data', `import-missing-orders-${today}.csv`)
writeFileSync(auditPath, audit.map(r => r.map(x => {
  const s = String(x ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n'))

console.log(`\nDone.  inserted=${inserted}  skipped=${skipped}  failed=${failed}`)
console.log(`Audit trail: ${auditPath}`)
