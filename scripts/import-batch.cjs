// Import a WooCommerce CSV batch into Supabase
// Usage: node scripts/import-batch.cjs <csv-file> <supabase-url> <service-role-key>
//
// Rules:
// - All customers are created new (no matching)
// - Products matched by SKU only (no name matching). No SKU = new product
// - Order items store exact sold price (immutable)
// - €0 prices imported as-is

const fs = require('fs')
const https = require('https')
const http = require('http')

const SUPABASE_URL = process.argv[3] || process.env.SUPABASE_URL
const SUPABASE_KEY = process.argv[4] || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Usage: node scripts/import-batch.cjs <csv-file> <supabase-url> <service-role-key>')
  process.exit(1)
}

// Simple Supabase REST client
async function supabaseRPC(method, path, body) {
  const url = new URL(path, SUPABASE_URL)
  const mod = url.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      }
    }

    const req = mod.request(opts, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data}`))
        } else {
          try { resolve(JSON.parse(data || '[]')) }
          catch { resolve(data) }
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function query(table, params = '') {
  return supabaseRPC('GET', `/rest/v1/${table}?${params}`)
}

async function insert(table, rows) {
  return supabaseRPC('POST', `/rest/v1/${table}`, rows)
}

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

// EUR string to cents
function eurToCents(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

// Map WooCommerce status to our system
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

async function main() {
  const file = process.argv[2]
  if (!file) { console.error('No CSV file specified'); process.exit(1) }

  console.log(`\n=== IMPORTING: ${file} ===\n`)

  const text = fs.readFileSync(file, 'utf-8')
  const rows = [...parseCSV(text)]
  const headers = rows[0]
  const data = rows.slice(1)

  const col = {}
  headers.forEach((h, i) => col[h.trim()] = i)

  // Parse orders and items from CSV
  const ordersMap = new Map()

  for (const row of data) {
    const orderNum = row[col['Order Number']]
    if (!orderNum) continue

    if (!ordersMap.has(orderNum)) {
      const mapped = mapStatus(row[col['Order Status']])
      ordersMap.set(orderNum, {
        woo_order_number: orderNum,
        status: mapped.status,
        payment_method: mapped.payment || (row[col['Payment Method Title']] || '').toLowerCase().trim() || null,
        order_date: row[col['Order Date']]?.split(' ')[0] || null,
        created_at: row[col['Order Date']] ? new Date(row[col['Order Date']]).toISOString() : new Date().toISOString(),
        customer_note: row[col['Customer Note']] || '',
        subtotal_cents: eurToCents(row[col['Order Subtotal Amount']]),
        discount_cents: eurToCents(row[col['Cart Discount Amount']]),
        tax_cents: eurToCents(row[col['Order Total Tax Amount']]),
        shipping_cents: eurToCents(row[col['Order Shipping Amount']]),
        total_cents: eurToCents(row[col['Order Total Amount']]),
        // Customer info
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
        sku: row[col['SKU']] || '',
        quantity: parseFloat(row[col['Quantity (- Refund)']]) || 0,
        unit_price_eur: parseFloat(row[col['Item Cost']]) || 0,
      })
    }
  }

  console.log(`Parsed ${ordersMap.size} orders with ${data.length} line items`)

  // Fix payment_method to valid enum values
  for (const [, order] of ordersMap) {
    let pm = order.payment_method
    if (!pm || pm === '' || pm === 'none') {
      order.payment_method = null
    } else if (pm.includes('bank') || pm.includes('overschrijving') || pm.includes('transfer')) {
      order.payment_method = 'bank'
    } else if (pm.includes('cash') || pm.includes('contant')) {
      order.payment_method = 'cash'
    } else {
      order.payment_method = null
    }
  }

  // ===== STEP 1: Create customers (all new, no matching) =====
  console.log('\n--- Step 1: Creating customers ---')

  // Group orders by customer key (company or email)
  const customerGroups = new Map()
  for (const [, order] of ordersMap) {
    const key = order.company || order.email || `${order.first_name} ${order.last_name}`.trim()
    if (!customerGroups.has(key)) {
      customerGroups.set(key, order)
    }
  }

  const customerMap = new Map() // customer_key -> uuid

  for (const [key, order] of customerGroups) {
    const contactPerson = `${order.first_name} ${order.last_name}`.trim()
    const customerRow = {
      company_name: order.company || contactPerson || key,
      contact_person: contactPerson || null,
      email: order.email || null,
      phone: order.phone || null,
      billing_street: order.billing_street || null,
      billing_city: order.billing_city || null,
      billing_postal_code: order.billing_postal_code || null,
      billing_country: order.billing_country || 'NL',
      shipping_street: order.shipping_street || null,
      shipping_city: order.shipping_city || null,
      shipping_postal_code: order.shipping_postal_code || null,
      shipping_country: order.shipping_country || 'NL',
      shipping_same_as_billing: !order.shipping_street,
    }

    try {
      const result = await insert('customers', [customerRow])
      customerMap.set(key, result[0].id)
    } catch (err) {
      console.error(`  ERROR creating customer "${key}": ${err.message}`)
    }
  }

  console.log(`  Created ${customerMap.size} customers`)

  // ===== STEP 2: Create orders =====
  console.log('\n--- Step 2: Creating orders ---')

  let ordersCreated = 0
  let itemsCreated = 0
  const orderErrors = []

  for (const [wooNum, order] of ordersMap) {
    // Find customer ID
    const custKey = order.company || order.email || `${order.first_name} ${order.last_name}`.trim()
    const customerId = customerMap.get(custKey)

    if (!customerId) {
      orderErrors.push(`Order ${wooNum}: no customer found for "${custKey}"`)
      continue
    }

    // Generate order number in our format
    const year = order.order_date ? order.order_date.split('-')[0] : '2024'
    const orderNumber = `WOO-${wooNum}`

    const orderRow = {
      order_number: orderNumber,
      customer_id: customerId,
      status: order.status,
      payment_method: order.payment_method,
      subtotal: order.subtotal_cents,
      discount_amount: order.discount_cents,
      tax_amount: order.tax_cents,
      delivery_fee: order.shipping_cents,
      total: order.total_cents,
      order_date: order.order_date,
      delivery_notes: order.customer_note || '',
      internal_notes: `Imported from WooCommerce order #${wooNum}`,
      created_at: order.created_at,
      updated_at: order.created_at,
    }

    try {
      const orderResult = await insert('orders', [orderRow])
      const orderId = orderResult[0].id
      ordersCreated++

      // Create order items
      const itemRows = order.items.map(item => ({
        order_id: orderId,
        product_id: null, // We don't match products
        product_name: item.product_name,
        product_sku: item.sku || null,
        unit_type: 'piece',
        quantity: item.quantity,
        unit_price: eurToCents(item.unit_price_eur.toString()),
        cost_cents: 0, // Unknown from WooCommerce
        discount_amount: 0,
        tax_rate: 9, // Default 9% BTW
        tax_amount: Math.round(eurToCents(item.unit_price_eur.toString()) * item.quantity * 0.09),
        line_total: eurToCents((item.unit_price_eur * item.quantity).toString()),
      }))

      if (itemRows.length > 0) {
        await insert('order_items', itemRows)
        itemsCreated += itemRows.length
      }

    } catch (err) {
      orderErrors.push(`Order ${wooNum}: ${err.message.substring(0, 200)}`)
    }
  }

  console.log(`  Created ${ordersCreated} orders`)
  console.log(`  Created ${itemsCreated} order items`)

  if (orderErrors.length > 0) {
    console.log(`\n--- ERRORS (${orderErrors.length}) ---`)
    orderErrors.forEach(e => console.log(`  ${e}`))
  }

  // ===== VERIFICATION =====
  console.log('\n--- Verification ---')

  try {
    const customers = await query('customers', 'select=id&limit=1&order=id&offset=0')
    const totalCustomers = await supabaseRPC('GET', '/rest/v1/customers?select=id', null)
    const totalOrders = await supabaseRPC('GET', '/rest/v1/orders?select=id', null)
    const totalItems = await supabaseRPC('GET', '/rest/v1/order_items?select=id', null)

    console.log(`  Total customers in DB: ${totalCustomers.length}`)
    console.log(`  Total orders in DB: ${totalOrders.length}`)
    console.log(`  Total order items in DB: ${totalItems.length}`)
  } catch (err) {
    console.log(`  Verification query failed: ${err.message}`)
  }

  console.log('\n=== IMPORT COMPLETE ===')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
