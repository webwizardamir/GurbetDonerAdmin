// Parse a WooCommerce CSV batch and generate SQL INSERT statements
// Usage: node scripts/csv-to-sql.cjs <csv-file>
// Output: SQL file in migration-data/

const fs = require('fs')
const path = require('path')

// CSV parser
function* parseCSV(text) {
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (field || row.length > 0) {
        row.push(field)
        yield row
        row = []
        field = ''
      }
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      field += ch
    }
  }
  if (field || row.length > 0) {
    row.push(field)
    yield row
  }
}

// Escape single quotes for SQL
function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL'
  return "'" + String(val).replace(/'/g, "''") + "'"
}

// EUR string to cents integer
function eurToCents(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

// Map WooCommerce status
function mapStatus(wooStatus) {
  const s = (wooStatus || '').toLowerCase().trim()
  if (s === 'completed') return { status: 'completed', payment: null }
  if (s.startsWith('paid by bank')) return { status: 'completed', payment: 'bank' }
  if (s.startsWith('paid by cash')) return { status: 'completed', payment: 'cash' }
  if (s === 'refunded') return { status: 'refunded', payment: null }
  if (s === 'cancelled' || s === 'failed') return { status: 'cancelled', payment: null }
  if (s === 'processing' || s === 'pending payment') return { status: 'pending_payment', payment: null }
  if (s === 'on-hold' || s === 'on hold') return { status: 'on_hold', payment: null }
  if (s === 'draft') return { status: 'draft', payment: null }
  return { status: 'draft', payment: null }
}

function main() {
  const file = process.argv[2]
  if (!file) { console.error('No CSV file specified'); process.exit(1) }

  const batchName = path.basename(file, '.csv')
  const text = fs.readFileSync(file, 'utf-8')
  const rows = [...parseCSV(text)]
  const headers = rows[0]
  const data = rows.slice(1)

  const col = {}
  headers.forEach((h, i) => col[h.trim()] = i)

  // Parse orders from CSV
  const ordersMap = new Map()

  for (const row of data) {
    const orderNum = row[col['Order Number']]
    if (!orderNum) continue

    if (!ordersMap.has(orderNum)) {
      const mapped = mapStatus(row[col['Order Status']])

      // Determine payment method
      let pm = mapped.payment
      if (!pm) {
        const pmTitle = (row[col['Payment Method Title']] || '').toLowerCase()
        if (pmTitle.includes('bank') || pmTitle.includes('overschrijving') || pmTitle.includes('transfer')) pm = 'bank'
        else if (pmTitle.includes('cash') || pmTitle.includes('contant')) pm = 'cash'
        else pm = null
      }

      ordersMap.set(orderNum, {
        woo_order_number: orderNum,
        status: mapped.status,
        payment_method: pm,
        order_date: row[col['Order Date']]?.split(' ')[0] || null,
        created_at: row[col['Order Date']] || null,
        customer_note: row[col['Customer Note']] || '',
        subtotal_cents: eurToCents(row[col['Order Subtotal Amount']]),
        discount_cents: eurToCents(row[col['Cart Discount Amount']]),
        tax_cents: eurToCents(row[col['Order Total Tax Amount']]),
        shipping_cents: eurToCents(row[col['Order Shipping Amount']]),
        total_cents: eurToCents(row[col['Order Total Amount']]),
        company: row[col['Company (Billing)']] || '',
        first_name: row[col['First Name (Billing)']] || '',
        last_name: row[col['Last Name (Billing)']] || '',
        email: row[col['Email (Billing)']] || '',
        phone: row[col['Phone (Billing)']] || '',
        billing_street: row[col['Address 1&2 (Billing)']] || '',
        billing_city: row[col['City (Billing)']] || '',
        billing_postal_code: row[col['Postcode (Billing)']] || '',
        billing_country: row[col['Country Code (Billing)']] || 'NL',
        shipping_street: row[col['Address 1&2 (Shipping)']] || '',
        shipping_city: row[col['City (Shipping)']] || '',
        shipping_postal_code: row[col['Postcode (Shipping)']] || '',
        shipping_country: row[col['Country Code (Shipping)']] || 'NL',
        items: []
      })
    }

    const itemName = row[col['Item Name']] || ''
    if (itemName) {
      ordersMap.get(orderNum).items.push({
        product_name: itemName,
        sku: row[col['SKU']] || null,
        quantity: parseFloat(row[col['Quantity (- Refund)']]) || 0,
        unit_price_cents: eurToCents(row[col['Item Cost']]),
      })
    }
  }

  // Group by customer key
  const customerKeys = new Map()
  for (const [, order] of ordersMap) {
    const key = order.company || order.email || `${order.first_name} ${order.last_name}`.trim()
    if (!customerKeys.has(key)) {
      customerKeys.set(key, order)
    }
  }

  // Build SQL
  const sql = []

  sql.push(`-- WooCommerce Import: ${batchName}`)
  sql.push(`-- Generated: ${new Date().toISOString()}`)
  sql.push(`-- Orders: ${ordersMap.size}, Customers: ${customerKeys.size}`)
  sql.push('')
  sql.push('BEGIN;')
  sql.push('')

  // Create temp mapping table for this batch
  sql.push('-- Mapping table for WooCommerce IDs to new UUIDs')
  sql.push('CREATE TABLE IF NOT EXISTS woo_migration_map (')
  sql.push('  entity_type TEXT NOT NULL,')
  sql.push('  woo_id TEXT NOT NULL,')
  sql.push('  new_id UUID NOT NULL,')
  sql.push('  UNIQUE(entity_type, woo_id)')
  sql.push(');')
  sql.push('')

  // Insert customers
  sql.push('-- ========== CUSTOMERS ==========')
  let custIndex = 0
  for (const [key, order] of customerKeys) {
    custIndex++
    const contactPerson = `${order.first_name} ${order.last_name}`.trim()
    const companyName = order.company || contactPerson || key
    const hasDiffShipping = order.shipping_street && order.shipping_street !== order.billing_street

    sql.push(`-- Customer ${custIndex}: ${companyName}`)
    sql.push(`WITH new_cust AS (`)
    sql.push(`  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)`)
    sql.push(`  VALUES (${esc(companyName)}, ${esc(contactPerson || null)}, ${esc(order.email || null)}, ${esc(order.phone || null)}, ${esc(order.billing_street || null)}, ${esc(order.billing_city || null)}, ${esc(order.billing_postal_code || null)}, ${esc(order.billing_country)}, ${esc(order.shipping_street || null)}, ${esc(order.shipping_city || null)}, ${esc(order.shipping_postal_code || null)}, ${esc(order.shipping_country)}, ${hasDiffShipping ? 'FALSE' : 'TRUE'})`)
    sql.push(`  RETURNING id`)
    sql.push(`)`)
    sql.push(`INSERT INTO woo_migration_map (entity_type, woo_id, new_id)`)
    sql.push(`SELECT 'customer', ${esc(key)}, id FROM new_cust;`)
    sql.push('')
  }

  // Insert orders and their items
  sql.push('-- ========== ORDERS ==========')
  for (const [wooNum, order] of ordersMap) {
    const custKey = order.company || order.email || `${order.first_name} ${order.last_name}`.trim()
    const orderNumber = `WOO-${wooNum}`
    const createdAt = order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString()

    sql.push(`-- Order WOO-${wooNum} (${order.status})`)
    sql.push(`WITH cust AS (`)
    sql.push(`  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = ${esc(custKey)}`)
    sql.push(`), new_order AS (`)
    sql.push(`  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)`)
    sql.push(`  SELECT ${esc(orderNumber)}, cust.new_id, ${esc(order.status)}::order_status, ${order.payment_method ? esc(order.payment_method) + '::payment_method' : 'NULL'}, ${order.subtotal_cents}, ${order.discount_cents}, ${order.tax_cents}, ${order.shipping_cents}, ${order.total_cents}, ${order.order_date ? esc(order.order_date) : 'NULL'}::date, ${esc(order.customer_note)}, ${esc('Imported from WooCommerce order #' + wooNum)}, ${esc(createdAt)}::timestamptz, ${esc(createdAt)}::timestamptz`)
    sql.push(`  FROM cust`)
    sql.push(`  RETURNING id`)
    sql.push(`)`)

    // Insert order items
    if (order.items.length > 0) {
      sql.push(`INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)`)
      sql.push(`SELECT new_order.id,`)
      sql.push(`  NULL,`) // product_id — not matched
      sql.push(`  v.product_name,`)
      sql.push(`  v.product_sku,`)
      sql.push(`  'piece',`)
      sql.push(`  v.quantity,`)
      sql.push(`  v.unit_price,`)
      sql.push(`  0,`) // cost_cents unknown
      sql.push(`  0,`) // discount per item
      sql.push(`  9.00,`) // default BTW
      sql.push(`  ROUND(v.unit_price * v.quantity * 0.09)::int,`)
      sql.push(`  ROUND(v.unit_price * v.quantity)::int`)
      sql.push(`FROM new_order, (VALUES`)

      const itemValues = order.items.map((item, idx) => {
        const lineCents = item.unit_price_cents * item.quantity
        return `  (${esc(item.product_name)}, ${item.sku ? esc(item.sku) : 'NULL'}, ${item.quantity}::decimal, ${item.unit_price_cents})`
      })
      sql.push(itemValues.join(',\n'))
      sql.push(`) AS v(product_name, product_sku, quantity, unit_price);`)
    }

    sql.push('')
  }

  sql.push('COMMIT;')
  sql.push('')
  sql.push(`-- Verification queries:`)
  sql.push(`-- SELECT COUNT(*) FROM customers;`)
  sql.push(`-- SELECT COUNT(*) FROM orders;`)
  sql.push(`-- SELECT COUNT(*) FROM order_items;`)
  sql.push(`-- SELECT COUNT(*) FROM woo_migration_map;`)

  const outFile = `migration-data/${batchName}.sql`
  fs.writeFileSync(outFile, sql.join('\n'))
  console.log(`SQL written to ${outFile}`)
  console.log(`  ${customerKeys.size} customers`)
  console.log(`  ${ordersMap.size} orders`)
  console.log(`  ${[...ordersMap.values()].reduce((sum, o) => sum + o.items.length, 0)} order items`)
}

main()
