// Generate complete migration SQL from a WooCommerce CSV batch
// Outputs: customers SQL + order SQL chunks (10 orders each)
// Customer key = company_name (derived from Company || FirstName+LastName)
// This key is used both for INSERT and for lookup in woo_migration_map

const fs = require('fs')

function* parseCSV(text) {
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { if (inQuotes && text[i+1] === '"') { field += '"'; i++ } else inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { row.push(field); field = '' }
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (field || row.length > 0) { row.push(field); yield row; row = []; field = '' }
      if (ch === '\r' && text[i+1] === '\n') i++
    } else field += ch
  }
  if (field || row.length > 0) { row.push(field); yield row }
}

function esc(v) { return v === null || v === undefined || v === '' ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'" }
function eurToCents(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) }

function mapStatus(s) {
  s = (s || '').toLowerCase().trim()
  if (s === 'completed') return { status: 'completed', pm: null }
  if (s.startsWith('paid by bank')) return { status: 'completed', pm: 'bank' }
  if (s.startsWith('paid by cash')) return { status: 'completed', pm: 'cash' }
  if (s === 'refunded') return { status: 'refunded', pm: null }
  if (s === 'cancelled' || s === 'failed') return { status: 'cancelled', pm: null }
  if (s === 'processing' || s === 'pending payment') return { status: 'pending_payment', pm: null }
  if (s === 'on-hold' || s === 'on hold') return { status: 'on_hold', pm: null }
  return { status: 'draft', pm: null }
}

const batchNum = process.argv[3] || '1'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/gen-migration-sql.cjs <csv-file> [batch-number]'); process.exit(1) }

const text = fs.readFileSync(file, 'utf-8')
const rows = [...parseCSV(text)]
const headers = rows[0], data = rows.slice(1)
const col = {}; headers.forEach((h, i) => col[h.trim()] = i)

// Parse all orders and derive customer key consistently
const ordersMap = new Map()
const customersMap = new Map() // key -> customer data

for (const row of data) {
  const orderNum = row[col['Order Number']]; if (!orderNum) continue
  const company = row[col['Company (Billing)']] || ''
  const first = row[col['First Name (Billing)']] || ''
  const last = row[col['Last Name (Billing)']] || ''
  const email = row[col['Email (Billing)']] || ''
  const phone = row[col['Phone (Billing)']] || ''

  // THE KEY: always use company || firstName+lastName as the unique customer identifier
  // This is also what becomes the company_name in the DB
  const companyName = company || `${first} ${last}`.trim() || email

  if (!customersMap.has(companyName)) {
    customersMap.set(companyName, {
      company_name: companyName,
      contact_person: `${first} ${last}`.trim() || null,
      email,
      phone,
      billing_street: row[col['Address 1&2 (Billing)']] || '',
      billing_city: row[col['City (Billing)']] || '',
      billing_postal_code: row[col['Postcode (Billing)']] || '',
      billing_country: row[col['Country Code (Billing)']] || 'NL',
      shipping_street: row[col['Address 1&2 (Shipping)']] || '',
      shipping_city: row[col['City (Shipping)']] || '',
      shipping_postal_code: row[col['Postcode (Shipping)']] || '',
      shipping_country: row[col['Country Code (Shipping)']] || 'NL',
    })
  }

  if (!ordersMap.has(orderNum)) {
    const m = mapStatus(row[col['Order Status']])
    let pm = m.pm
    if (!pm) {
      const t = (row[col['Payment Method Title']] || '').toLowerCase()
      if (t.includes('bank') || t.includes('overschrijving')) pm = 'bank'
      else if (t.includes('cash') || t.includes('contant')) pm = 'cash'
    }
    ordersMap.set(orderNum, {
      woo: orderNum, status: m.status, pm,
      date: row[col['Order Date']]?.split(' ')[0] || null,
      created: row[col['Order Date']] || null,
      note: row[col['Customer Note']] || '',
      sub: eurToCents(row[col['Order Subtotal Amount']]),
      disc: eurToCents(row[col['Cart Discount Amount']]),
      tax: eurToCents(row[col['Order Total Tax Amount']]),
      ship: eurToCents(row[col['Order Shipping Amount']]),
      total: eurToCents(row[col['Order Total Amount']]),
      custKey: companyName, // SAME key used for mapping lookup
      items: []
    })
  }

  const itemName = row[col['Item Name']] || ''
  if (itemName) {
    ordersMap.get(orderNum).items.push({
      name: itemName,
      sku: row[col['SKU']] || null,
      qty: parseFloat(row[col['Quantity (- Refund)']]) || 0,
      price: eurToCents(row[col['Item Cost']]),
    })
  }
}

// ===== Generate customers SQL =====
const custSql = []
custSql.push(`-- Batch ${batchNum} customers: ${customersMap.size}`)
custSql.push(`CREATE TABLE IF NOT EXISTS woo_migration_map (entity_type TEXT NOT NULL, woo_id TEXT NOT NULL, new_id UUID NOT NULL, UNIQUE(entity_type, woo_id));`)
custSql.push('')

// Build VALUES for bulk insert
const custValues = []
const custKeys = []
let emailCounter = 0
for (const [key, c] of customersMap) {
  emailCounter++
  // Use woo{batchNum}-{counter} prefix for email uniqueness
  const safeEmail = `woo${batchNum}-${emailCounter}@import.local`
  const hasDiffShipping = c.shipping_street && c.shipping_street !== c.billing_street
  custValues.push(`(${esc(c.company_name)}, ${esc(c.contact_person)}, ${esc(safeEmail)}, ${esc(c.phone || null)}, ${esc(c.billing_street || null)}, ${esc(c.billing_city || null)}, ${esc(c.billing_postal_code || null)}, ${esc(c.billing_country)}, ${esc(c.shipping_street || null)}, ${esc(c.shipping_city || null)}, ${esc(c.shipping_postal_code || null)}, ${esc(c.shipping_country)}, ${hasDiffShipping ? 'FALSE' : 'TRUE'})`)
  custKeys.push(key)
}

custSql.push(`INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)`)
custSql.push(`VALUES`)
custSql.push(custValues.join(',\n') + ';')
custSql.push('')
custSql.push(`-- Map by email pattern woo${batchNum}-*`)
custSql.push(`INSERT INTO woo_migration_map (entity_type, woo_id, new_id)`)
custSql.push(`SELECT 'customer', company_name, id FROM customers WHERE email LIKE 'woo${batchNum}-%@import.local'`)
custSql.push(`ON CONFLICT (entity_type, woo_id) DO NOTHING;`)
custSql.push('')
custSql.push(`SELECT (SELECT COUNT(*) FROM woo_migration_map WHERE entity_type = 'customer') as mapped;`)

fs.writeFileSync(`migration-data/batch${batchNum}_customers.sql`, custSql.join('\n'))
console.log(`batch${batchNum}_customers.sql: ${customersMap.size} customers`)

// ===== Generate order SQL in chunks =====
const orders = [...ordersMap.values()]
const CHUNK = 10
let fileIdx = 0

for (let i = 0; i < orders.length; i += CHUNK) {
  fileIdx++
  const chunk = orders.slice(i, i + CHUNK)
  const sql = []

  for (const o of chunk) {
    const createdAt = o.created ? new Date(o.created).toISOString() : new Date().toISOString()
    const pmSql = o.pm ? esc(o.pm) : 'NULL'

    sql.push(`WITH new_ord AS (`)
    sql.push(`  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)`)
    sql.push(`  SELECT 'WOO-${o.woo}', m.new_id, '${o.status}'::order_status, ${pmSql}, ${o.sub}, ${o.disc}, ${o.disc}, ${o.tax}, ${o.tax}, ${o.ship}, ${o.total}, ${o.date ? `'${o.date}'::date` : 'NULL'}, ${esc(o.note)}, 'WooCommerce #${o.woo}', '${createdAt}'::timestamptz, '${createdAt}'::timestamptz`)
    sql.push(`  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = ${esc(o.custKey)}`)
    sql.push(`  RETURNING id`)
    sql.push(`)`)

    if (o.items.length > 0) {
      sql.push(`INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)`)
      sql.push(`SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int`)
      sql.push(`FROM new_ord o, (VALUES`)
      const vals = o.items.map(it => `  (${esc(it.name)}, ${it.sku ? esc(it.sku) : 'NULL'}, ${it.qty}::decimal, ${it.price}::int)`)
      sql.push(vals.join(',\n'))
      sql.push(`) AS v(pname, psku, qty, price);`)
    } else {
      sql.push(`SELECT 1 FROM new_ord;`)
    }
    sql.push('')
  }

  const outFile = `migration-data/batch${batchNum}_orders_part${fileIdx}.sql`
  fs.writeFileSync(outFile, sql.join('\n'))
}

console.log(`batch${batchNum}_orders: ${orders.length} orders in ${fileIdx} files`)
console.log(`Total items: ${orders.reduce((s, o) => s + o.items.length, 0)}`)
