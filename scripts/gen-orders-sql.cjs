// Generate order INSERT SQL from CSV batch, using woo_migration_map for customer lookup
// Outputs multiple SQL files, each with ~10 orders (to fit MCP query limits)

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

const file = process.argv[2] || 'csv/orders-2026-03-15-12-51-41_1.csv'
const text = fs.readFileSync(file, 'utf-8')
const rows = [...parseCSV(text)]
const headers = rows[0], data = rows.slice(1)
const col = {}; headers.forEach((h, i) => col[h.trim()] = i)

// Parse orders
const ordersMap = new Map()
for (const row of data) {
  const orderNum = row[col['Order Number']]; if (!orderNum) continue
  const company = row[col['Company (Billing)']] || ''
  const first = row[col['First Name (Billing)']] || ''
  const last = row[col['Last Name (Billing)']] || ''
  // company_name in DB = company || firstName+lastName
  const companyName = company || `${first} ${last}`.trim()

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
      custName: companyName,
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

// Generate SQL in chunks of 10 orders
const orders = [...ordersMap.values()]
const CHUNK = 10
let fileIdx = 0

for (let i = 0; i < orders.length; i += CHUNK) {
  fileIdx++
  const chunk = orders.slice(i, i + CHUNK)
  const sql = []

  for (const o of chunk) {
    const createdAt = o.created ? new Date(o.created).toISOString() : new Date().toISOString()
    const pmSql = o.pm ? `'${o.pm}'::payment_method` : 'NULL'

    sql.push(`WITH new_ord AS (`)
    sql.push(`  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)`)
    sql.push(`  SELECT 'WOO-${o.woo}', m.new_id, '${o.status}'::order_status, ${pmSql}, ${o.sub}, ${o.disc}, ${o.tax}, ${o.ship}, ${o.total}, ${o.date ? `'${o.date}'::date` : 'NULL'}, ${esc(o.note)}, 'WooCommerce #${o.woo}', '${createdAt}'::timestamptz, '${createdAt}'::timestamptz`)
    sql.push(`  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = ${esc(o.custName)}`)
    sql.push(`  RETURNING id`)
    sql.push(`)`)

    if (o.items.length > 0) {
      sql.push(`INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)`)
      sql.push(`SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int`)
      sql.push(`FROM new_ord o, (VALUES`)
      const vals = o.items.map(it => `  (${esc(it.name)}, ${it.sku ? esc(it.sku) : 'NULL'}, ${it.qty}::decimal, ${it.price}::int)`)
      sql.push(vals.join(',\n'))
      sql.push(`) AS v(pname, psku, qty, price);`)
    } else {
      sql.push(`SELECT 1 FROM new_ord;`) // consume the CTE
    }
    sql.push('')
  }

  const outFile = `migration-data/batch1_orders_part${fileIdx}.sql`
  fs.writeFileSync(outFile, sql.join('\n'))
  console.log(`${outFile}: ${chunk.length} orders (WOO-${chunk[0].woo} to WOO-${chunk[chunk.length-1].woo})`)
}

console.log(`\nTotal: ${orders.length} orders in ${fileIdx} files`)
