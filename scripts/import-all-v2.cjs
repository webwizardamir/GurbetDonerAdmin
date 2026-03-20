// WooCommerce Full Import v2 — with product creation and linking
// Processes single CSV file, deduplicates customers and products,
// links order_items to product_id

const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'https://pnimvwconhhmcwxcuxcz.supabase.co'
const SERVICE_KEY = process.argv[2]
const CSV_FILE = process.argv[3] || 'csv/orders-2026-03-17-00-19-35.csv'

if (!SERVICE_KEY) { console.error('Usage: node scripts/import-all-v2.cjs <service-role-key> [csv-file]'); process.exit(1) }

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
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode} ${method} ${path}: ${data.substring(0, 500)}`))
        else { try { resolve(JSON.parse(data || '[]')) } catch { resolve(data) } }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function batchInsert(table, rows, chunkSize = 50) {
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
  console.log('=== WooCommerce Full Import v2 (with products) ===\n')

  const text = fs.readFileSync(CSV_FILE, 'utf-8')
  const rows = [...parseCSV(text)]
  const headers = rows[0], data = rows.slice(1)
  const col = {}; headers.forEach((h, i) => col[h.trim()] = i)

  console.log(`CSV: ${data.length} rows\n`)

  // ===== PASS 1: Parse everything =====
  console.log('--- Pass 1: Parsing ---')

  const allOrders = new Map()
  const allCustomers = new Map()
  const allProducts = new Map() // key = productName (deduplicate by name)

  for (const row of data) {
    const orderNum = row[col['Order Number']]; if (!orderNum) continue
    const company = row[col['Company (Billing)']] || ''
    const first = row[col['First Name (Billing)']] || ''
    const last = row[col['Last Name (Billing)']] || ''
    const email = row[col['Email (Billing)']] || ''
    const phone = row[col['Phone (Billing)']] || ''
    const companyName = company || `${first} ${last}`.trim() || email

    // Customer
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

    // Order
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

    // Order item + product
    const itemName = row[col['Item Name']] || ''
    if (itemName) {
      const sku = row[col['SKU']] || null
      const productId = row[col['Product Id']] || null
      const costOfGoods = eurToCents(row[col['Cost of goods']])
      const category = row[col['Category']] || ''
      const sellingPrice = eurToCents(row[col['Item Cost']])

      allOrders.get(orderNum).items.push({
        name: itemName,
        sku,
        qty: parseFloat(row[col['Quantity (- Refund)']]) || 0,
        price: sellingPrice,
        costOfGoods,
        productKey: itemName, // link to product by name
      })

      // Product: deduplicate by name, keep latest price info
      if (!allProducts.has(itemName)) {
        allProducts.set(itemName, {
          name: itemName,
          sku: sku,
          woo_product_id: productId,
          category: category,
          base_price: sellingPrice, // latest selling price in cents
          cost_cents: costOfGoods,
          tax_rate: 9.00,
        })
      } else {
        // Update SKU if we find one (some rows have SKU, some don't)
        const existing = allProducts.get(itemName)
        if (sku && !existing.sku) existing.sku = sku
        if (productId && !existing.woo_product_id) existing.woo_product_id = productId
        if (category && !existing.category) existing.category = category
        // Use latest non-zero price
        if (sellingPrice > 0) existing.base_price = sellingPrice
        if (costOfGoods > 0) existing.cost_cents = costOfGoods
      }
    }
  }

  console.log(`  Orders: ${allOrders.size}`)
  console.log(`  Customers: ${allCustomers.size}`)
  console.log(`  Products: ${allProducts.size}`)

  // ===== PASS 2: Extract unique categories =====
  console.log('\n--- Pass 2: Categories ---')

  const categorySet = new Set()
  for (const [, p] of allProducts) {
    if (p.category) {
      // Categories can be comma-separated
      p.category.split(',').forEach(c => {
        const trimmed = c.trim()
        if (trimmed && trimmed !== 'Uncategorized') categorySet.add(trimmed)
      })
    }
  }

  // Fetch existing categories
  const existingCats = await request('GET', '/rest/v1/categories?select=id,name&limit=500')
  const categoryMap = new Map()
  for (const cat of existingCats) {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  }

  // Insert new categories
  const newCats = []
  for (const catName of categorySet) {
    if (!categoryMap.has(catName.toLowerCase())) {
      newCats.push({
        name: catName,
        slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        is_active: true,
      })
    }
  }

  if (newCats.length > 0) {
    const inserted = await batchInsert('categories', newCats, 50)
    for (const cat of inserted) {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    }
    console.log(`  Created ${inserted.length} new categories`)
  } else {
    console.log(`  No new categories needed (${categoryMap.size} existing)`)
  }

  // ===== PASS 3: Insert products =====
  console.log('\n--- Pass 3: Products ---')

  const productRows = []
  const productKeyOrder = []

  for (const [key, p] of allProducts) {
    // Use first category for category_id
    let categoryId = null
    if (p.category) {
      const cats = p.category.split(',').map(c => c.trim()).filter(c => c && c !== 'Uncategorized')
      for (const catName of cats) {
        const cid = categoryMap.get(catName.toLowerCase())
        if (cid) { categoryId = cid; break }
      }
    }

    productRows.push({
      name: p.name,
      sku: p.sku || null,
      barcode: p.sku || null, // use SKU as barcode
      category_id: categoryId,
      base_price: p.base_price,
      cost_cents: p.cost_cents,
      tax_rate: 9.00,
      unit_type: 'piece',
      is_active: true,
      track_stock: false, // don't track stock for imported products
      stock_quantity: 0,
    })
    productKeyOrder.push(key)
  }

  // Handle duplicate SKU/barcode: set to null if duplicate
  const seenSkus = new Set()
  const seenBarcodes = new Set()
  for (const row of productRows) {
    if (row.sku) {
      if (seenSkus.has(row.sku)) { row.sku = null }
      else seenSkus.add(row.sku)
    }
    if (row.barcode) {
      if (seenBarcodes.has(row.barcode)) { row.barcode = null }
      else seenBarcodes.add(row.barcode)
    }
  }

  const insertedProducts = await batchInsert('products', productRows, 50)
  console.log(`  Inserted ${insertedProducts.length} products`)

  // Build product map: name -> uuid
  const productMap = new Map()
  for (let i = 0; i < insertedProducts.length; i++) {
    productMap.set(productKeyOrder[i], insertedProducts[i].id)
  }

  // ===== PASS 4: Insert customers =====
  console.log('\n--- Pass 4: Customers ---')

  let emailCounter = 0
  const customerRows = []
  const customerKeyOrder = []

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

  const customerMap = new Map()
  for (let i = 0; i < insertedCustomers.length; i++) {
    customerMap.set(customerKeyOrder[i], insertedCustomers[i].id)
  }

  // ===== PASS 5: Insert orders + items =====
  console.log('\n--- Pass 5: Orders + Items ---')

  const orders = [...allOrders.values()]
  let ordersDone = 0, itemsDone = 0, skipped = 0

  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50)
    const orderRows = []
    const batchOrderData = [] // track which orders we're inserting

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
      batchOrderData.push(o)
    }

    let insertedOrders
    try {
      insertedOrders = await batchInsert('orders', orderRows, 50)
    } catch (err) {
      console.error(`\n  ERROR inserting orders batch ${i}: ${err.message}`)
      continue
    }

    // Insert items for each order
    for (let j = 0; j < insertedOrders.length; j++) {
      const orderId = insertedOrders[j].id
      const o = batchOrderData[j]
      if (!o || !o.items.length) continue

      const itemRows = o.items.map(it => {
        const productId = productMap.get(it.productKey) || null
        return {
          order_id: orderId,
          product_id: productId,
          product_name: it.name,
          product_sku: it.sku || null,
          unit_type: 'piece',
          quantity: it.qty,
          unit_price: it.price,
          cost_cents: it.costOfGoods,
          discount_amount: 0,
          tax_rate: 9.00,
          tax_amount: Math.round(it.price * it.qty * 0.09),
          line_total: it.price * it.qty,
          total: it.price * it.qty,
        }
      })

      try {
        await batchInsert('order_items', itemRows, 100)
        itemsDone += itemRows.length
      } catch (err) {
        console.error(`\n  ERROR inserting items for WOO-${o.woo}: ${err.message}`)
      }
    }

    ordersDone += insertedOrders.length
    process.stdout.write(`  Orders: ${ordersDone}/${orders.length} | Items: ${itemsDone} | Skipped: ${skipped}\r`)
  }

  console.log(`\n\n=== IMPORT COMPLETE ===`)
  console.log(`  Products: ${insertedProducts.length}`)
  console.log(`  Categories: ${categoryMap.size}`)
  console.log(`  Customers: ${insertedCustomers.length}`)
  console.log(`  Orders: ${ordersDone}`)
  console.log(`  Order Items: ${itemsDone}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Items linked to products: ${itemsDone} (by product name)`)
  console.log('\nDone!')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
