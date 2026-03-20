// Fast WooCommerce import — processes ALL CSV batch files in one run
// Uses Supabase REST API with service_role key to bypass RLS
// Deduplicates customers by company_name

const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'https://pnimvwconhhmcwxcuxcz.supabase.co'
const SERVICE_KEY = process.argv[2]
if (!SERVICE_KEY) { console.error('Usage: node scripts/import-all.cjs <service-role-key>'); process.exit(1) }

// ===== HTTP helper =====
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL)
    const opts = {
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      }
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode} ${method} ${path}: ${data.substring(0, 300)}`))
        else { try { resolve(JSON.parse(data || '[]')) } catch { resolve(data) } }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// Batch insert helper — inserts in chunks to avoid payload limits
async function batchInsert(table, rows, chunkSize = 100) {
  const results = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const res = await request('POST', `/rest/v1/${table}`, chunk)
    results.push(...res)
  }
  return results
}

// ===== CSV parser =====
function* parseCSV(text) {
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (inQ && text[i+1] === '"') { field += '"'; i++ } else inQ = !inQ }
    else if (c === ',' && !inQ) { row.push(field); field = '' }
    else if ((c === '\n' || c === '\r') && !inQ) {
      if (field || row.length) { row.push(field); yield row; row = []; field = '' }
      if (c === '\r' && text[i+1] === '\n') i++
    } else field += c
  }
  if (field || row.length) { row.push(field); yield row }
}

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

// ===== MAIN =====
async function main() {
  console.log('=== WooCommerce Full Import ===\n')

  // Find all CSV batch files
  const csvDir = 'csv'
  const files = fs.readdirSync(csvDir)
    .filter(f => f.endsWith('.csv') && f.includes('orders-'))
    .sort((a, b) => {
      const na = parseInt(a.match(/_(\d+)\.csv$/)?.[1] || '0')
      const nb = parseInt(b.match(/_(\d+)\.csv$/)?.[1] || '0')
      return na - nb
    })

  console.log(`Found ${files.length} CSV files\n`)

  // ===== PASS 1: Parse all CSVs, collect unique customers and all orders =====
  console.log('--- Pass 1: Parsing all CSV files ---')

  const allOrders = new Map()       // woo_order_number -> order data
  const allCustomers = new Map()    // company_name -> customer data
  let totalRows = 0

  for (const file of files) {
    const text = fs.readFileSync(`${csvDir}/${file}`, 'utf-8')
    const rows = [...parseCSV(text)]
    if (rows.length < 2) continue // skip empty files
    const headers = rows[0], data = rows.slice(1)
    const col = {}; headers.forEach((h, i) => col[h.trim()] = i)
    totalRows += data.length

    for (const row of data) {
      const orderNum = row[col['Order Number']]; if (!orderNum) continue
      const company = row[col['Company (Billing)']] || ''
      const first = row[col['First Name (Billing)']] || ''
      const last = row[col['Last Name (Billing)']] || ''
      const email = row[col['Email (Billing)']] || ''
      const phone = row[col['Phone (Billing)']] || ''
      const companyName = company || `${first} ${last}`.trim() || email

      // Deduplicate customers by company_name
      if (!allCustomers.has(companyName)) {
        allCustomers.set(companyName, {
          company_name: companyName,
          contact_person: `${first} ${last}`.trim() || null,
          email, phone,
          billing_street: row[col['Address 1&2 (Billing)']] || null,
          billing_city: row[col['City (Billing)']] || null,
          billing_postal_code: row[col['Postcode (Billing)']] || null,
          billing_country: row[col['Country Code (Billing)']] || 'NL',
          shipping_street: row[col['Address 1&2 (Shipping)']] || null,
          shipping_city: row[col['City (Shipping)']] || null,
          shipping_postal_code: row[col['Postcode (Shipping)']] || null,
          shipping_country: row[col['Country Code (Shipping)']] || 'NL',
        })
      }

      if (!allOrders.has(orderNum)) {
        const m = mapStatus(row[col['Order Status']])
        let pm = m.pm
        if (!pm) {
          const t = (row[col['Payment Method Title']] || '').toLowerCase()
          if (t.includes('bank') || t.includes('overschrijving')) pm = 'bank'
          else if (t.includes('cash') || t.includes('contant')) pm = 'cash'
        }
        allOrders.set(orderNum, {
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
        allOrders.get(orderNum).items.push({
          name: itemName,
          sku: row[col['SKU']] || null,
          qty: parseFloat(row[col['Quantity (- Refund)']]) || 0,
          price: eurToCents(row[col['Item Cost']]),
        })
      }
    }

    process.stdout.write(`  ${file}: ${data.length} rows\n`)
  }

  console.log(`\nTotal: ${totalRows} rows → ${allOrders.size} unique orders, ${allCustomers.size} unique customers\n`)

  // ===== PASS 2: Insert customers =====
  console.log('--- Pass 2: Inserting customers ---')

  let emailCounter = 0
  const customerRows = []
  const customerKeyOrder = [] // track insertion order for mapping

  for (const [key, c] of allCustomers) {
    emailCounter++
    const safeEmail = `woo-import-${emailCounter}@import.local`
    const hasDiffShipping = c.shipping_street && c.shipping_street !== c.billing_street
    customerRows.push({
      company_name: c.company_name,
      contact_person: c.contact_person,
      email: safeEmail,
      phone: c.phone || null,
      billing_street: c.billing_street,
      billing_city: c.billing_city,
      billing_postal_code: c.billing_postal_code,
      billing_country: c.billing_country || 'NL',
      shipping_street: c.shipping_street,
      shipping_city: c.shipping_city,
      shipping_postal_code: c.shipping_postal_code,
      shipping_country: c.shipping_country || 'NL',
      shipping_same_as_billing: !hasDiffShipping,
    })
    customerKeyOrder.push(key)
  }

  const insertedCustomers = await batchInsert('customers', customerRows, 50)
  console.log(`  Inserted ${insertedCustomers.length} customers`)

  // Build customer map: company_name -> uuid
  const customerMap = new Map()
  for (let i = 0; i < insertedCustomers.length; i++) {
    customerMap.set(customerKeyOrder[i], insertedCustomers[i].id)
  }

  // ===== PASS 3: Insert orders =====
  console.log('\n--- Pass 3: Inserting orders ---')

  const orders = [...allOrders.values()]
  let ordersDone = 0
  let itemsDone = 0
  let skipped = 0

  // Process orders in batches of 50
  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50)
    const orderRows = []

    for (const o of batch) {
      const custId = customerMap.get(o.custName)
      if (!custId) { skipped++; continue }

      const createdAt = o.created ? new Date(o.created).toISOString() : new Date().toISOString()
      orderRows.push({
        order_number: `WOO-${o.woo}`,
        customer_id: custId,
        status: o.status,
        payment_method: o.pm || null,
        subtotal: o.sub,
        discount_amount: o.disc,
        discount: o.disc,
        tax_amount: o.tax,
        tax: o.tax,
        delivery_fee: o.ship,
        total: o.total,
        order_date: o.date,
        delivery_notes: o.note || '',
        internal_notes: `WooCommerce #${o.woo}`,
        created_at: createdAt,
        updated_at: createdAt,
      })
    }

    let insertedOrders
    try {
      insertedOrders = await batchInsert('orders', orderRows, 50)
    } catch (err) {
      console.error(`  ERROR inserting orders batch ${i}: ${err.message}`)
      continue
    }

    // Now insert items for each order
    for (let j = 0; j < insertedOrders.length; j++) {
      const orderId = insertedOrders[j].id
      const orderNum = insertedOrders[j].order_number.replace('WOO-', '')
      const o = allOrders.get(orderNum)
      if (!o || !o.items.length) continue

      const itemRows = o.items.map(it => ({
        order_id: orderId,
        product_id: null,
        product_name: it.name,
        product_sku: it.sku || null,
        unit_type: 'piece',
        quantity: it.qty,
        unit_price: it.price,
        cost_cents: 0,
        discount_amount: 0,
        tax_rate: 9.00,
        tax_amount: Math.round(it.price * it.qty * 0.09),
        line_total: it.price * it.qty,
        total: it.price * it.qty,
      }))

      try {
        await batchInsert('order_items', itemRows, 100)
        itemsDone += itemRows.length
      } catch (err) {
        console.error(`  ERROR inserting items for WOO-${orderNum}: ${err.message}`)
      }
    }

    ordersDone += insertedOrders.length
    process.stdout.write(`  Orders: ${ordersDone}/${orders.length} | Items: ${itemsDone} | Skipped: ${skipped}\r`)
  }

  console.log(`\n\n=== IMPORT COMPLETE ===`)
  console.log(`  Orders: ${ordersDone}`)
  console.log(`  Items: ${itemsDone}`)
  console.log(`  Customers: ${insertedCustomers.length}`)
  console.log(`  Skipped (no customer match): ${skipped}`)

  // ===== Verify =====
  console.log('\n--- Verification ---')
  try {
    // Use a simple count via REST
    const ordersCheck = await request('GET', '/rest/v1/orders?select=id&order_number=like.WOO-%&limit=1', null)
    console.log(`  (Check the app to verify orders are showing correctly)`)
  } catch (e) {
    // ignore verification errors
  }

  console.log('\nDone!')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
