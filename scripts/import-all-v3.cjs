// WooCommerce Full Import v3 — with products (incl. cost price) and linking
// 1. Reads products CSV for cost prices
// 2. Reads orders CSV for everything else
// 3. Creates categories, products, customers, orders, order_items
// 4. Links order_items to product_id and includes cost_cents

const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'https://pnimvwconhhmcwxcuxcz.supabase.co'
const SERVICE_KEY = process.argv[2]
const ORDERS_CSV = process.argv[3] || 'csv/orders-2026-03-17-00-19-35.csv'
const PRODUCTS_CSV = process.argv[4] || 'csv/wc-product-export-17-3-2026-1773704453132.csv'

if (!SERVICE_KEY) {
  console.error('Usage: node scripts/import-all-v3.cjs <service-role-key> [orders-csv] [products-csv]')
  process.exit(1)
}

// ===== HTTP =====
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL)
    const opts = {
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
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

// ===== CSV =====
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

// Parse price: handles both "5,80" (Dutch) and "5.80" formats
function parsePrice(v) {
  if (!v || v === '') return 0
  // Replace comma with dot for Dutch format, but only if no dot exists
  let s = String(v).trim()
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function eurToCents(v) { return Math.round(parsePrice(v) * 100) }

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
  console.log('=== WooCommerce Full Import v3 ===\n')

  // ===== Step 1: Parse products CSV for cost prices =====
  console.log('--- Step 1: Loading product cost prices ---')
  const prodText = fs.readFileSync(PRODUCTS_CSV, 'utf-8')
  const prodRows = [...parseCSV(prodText)]
  const prodHeaders = prodRows[0]
  const prodCol = {}; prodHeaders.forEach((h, i) => prodCol[h.trim()] = i)

  // Build cost price map: woo_product_id -> cost_price_cents
  // Also build product info map: woo_product_id -> { name, sku, category, price, cost }
  const wooProdInfo = new Map() // woo_id -> product info
  const wooProdByName = new Map() // product name -> product info (fallback)

  for (let i = 1; i < prodRows.length; i++) {
    const row = prodRows[i]
    const wooId = row[prodCol['ID']]
    const name = row[prodCol['Name']] || ''
    const sku = row[prodCol['SKU']] || null
    const price = eurToCents(row[prodCol['Regular price']])
    const costPrice = Math.round(parsePrice(row[prodCol['Meta: _analytics_cost_price']]) * 100)
    const category = row[prodCol['Categories']] || ''

    const info = { wooId, name, sku, price, costPrice, category }
    if (wooId) wooProdInfo.set(wooId, info)
    if (name) wooProdByName.set(name.trim(), info)
  }

  console.log(`  ${wooProdInfo.size} products with IDs, ${[...wooProdInfo.values()].filter(p => p.costPrice > 0).length} with cost prices`)

  // ===== Step 2: Parse orders CSV =====
  console.log('\n--- Step 2: Parsing orders CSV ---')
  const text = fs.readFileSync(ORDERS_CSV, 'utf-8')
  const rows = [...parseCSV(text)]
  const headers = rows[0], data = rows.slice(1)
  const col = {}; headers.forEach((h, i) => col[h.trim()] = i)

  const allOrders = new Map()
  const allCustomers = new Map()
  const allProducts = new Map() // product name -> product data

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
        refund: eurToCents(row[col['Order Refund Amount']]),
        custName: companyName,
        items: []
      })
    }

    // Order item
    const itemName = row[col['Item Name']] || ''
    if (itemName) {
      const sku = row[col['SKU']] || null
      const wooProductId = row[col['Product Id']] || null
      const sellingPrice = eurToCents(row[col['Item Cost']])
      const category = row[col['Category']] || ''

      // Look up cost price from products CSV
      let costCents = 0
      if (wooProductId && wooProdInfo.has(wooProductId)) {
        costCents = wooProdInfo.get(wooProductId).costPrice
      } else if (wooProdByName.has(itemName.trim())) {
        costCents = wooProdByName.get(itemName.trim()).costPrice
      }

      allOrders.get(orderNum).items.push({
        name: itemName, sku, qty: parseFloat(row[col['Quantity (- Refund)']]) || 0,
        price: sellingPrice, costCents, productKey: itemName,
      })

      // Collect product info (deduplicate by name)
      if (!allProducts.has(itemName)) {
        // Try to get full info from products CSV
        let prodInfo = null
        if (wooProductId && wooProdInfo.has(wooProductId)) {
          prodInfo = wooProdInfo.get(wooProductId)
        } else if (wooProdByName.has(itemName.trim())) {
          prodInfo = wooProdByName.get(itemName.trim())
        }

        allProducts.set(itemName, {
          name: itemName,
          sku: sku || (prodInfo?.sku) || null,
          base_price: prodInfo?.price || sellingPrice,
          cost_cents: prodInfo?.costPrice || 0,
          category: category || (prodInfo?.category) || '',
        })
      } else {
        const existing = allProducts.get(itemName)
        if (sku && !existing.sku) existing.sku = sku
        if (sellingPrice > 0 && existing.base_price === 0) existing.base_price = sellingPrice
      }
    }
  }

  console.log(`  Orders: ${allOrders.size}`)
  console.log(`  Customers: ${allCustomers.size}`)
  console.log(`  Products: ${allProducts.size}`)
  console.log(`  Products with cost price: ${[...allProducts.values()].filter(p => p.cost_cents > 0).length}`)

  // ===== Step 3: Categories =====
  console.log('\n--- Step 3: Categories ---')
  const categorySet = new Set()
  for (const [, p] of allProducts) {
    if (p.category) {
      p.category.split(',').forEach(c => {
        const t = c.trim()
        if (t && t !== 'Uncategorized') categorySet.add(t)
      })
    }
  }

  const existingCats = await request('GET', '/rest/v1/categories?select=id,name&limit=500')
  const categoryMap = new Map()
  for (const cat of existingCats) categoryMap.set(cat.name.toLowerCase(), cat.id)

  const newCats = []
  for (const catName of categorySet) {
    if (!categoryMap.has(catName.toLowerCase())) {
      newCats.push({ name: catName, slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), is_active: true })
    }
  }
  if (newCats.length > 0) {
    const inserted = await batchInsert('categories', newCats, 50)
    for (const cat of inserted) categoryMap.set(cat.name.toLowerCase(), cat.id)
    console.log(`  Created ${inserted.length} new categories`)
  }
  console.log(`  Total categories: ${categoryMap.size}`)

  // ===== Step 4: Products =====
  console.log('\n--- Step 4: Products ---')

  // Fetch existing products to avoid duplicates
  const existingProducts = await request('GET', '/rest/v1/products?select=id,name,sku,barcode&limit=5000')
  const existingByName = new Map()
  const existingSkus = new Set()
  const existingBarcodes = new Set()
  for (const ep of existingProducts) {
    existingByName.set(ep.name.trim().toLowerCase(), ep.id)
    if (ep.sku) existingSkus.add(ep.sku)
    if (ep.barcode) existingBarcodes.add(ep.barcode)
  }
  console.log(`  ${existingProducts.length} existing products in DB`)

  const productMap = new Map() // product name -> uuid
  const productRows = []
  const productKeyOrder = []
  const seenSkus = new Set([...existingSkus])
  const seenBarcodes = new Set([...existingBarcodes])
  let matchedExisting = 0

  for (const [key, p] of allProducts) {
    // Check if product already exists by name
    const existingId = existingByName.get(p.name.trim().toLowerCase())
    if (existingId) {
      productMap.set(key, existingId)
      matchedExisting++
      continue
    }

    let categoryId = null
    if (p.category) {
      const cats = p.category.split(',').map(c => c.trim()).filter(c => c && c !== 'Uncategorized')
      for (const cn of cats) { const cid = categoryMap.get(cn.toLowerCase()); if (cid) { categoryId = cid; break } }
    }

    let sku = p.sku || null
    let barcode = p.sku || null
    if (sku && seenSkus.has(sku)) sku = null
    else if (sku) seenSkus.add(sku)
    if (barcode && seenBarcodes.has(barcode)) barcode = null
    else if (barcode) seenBarcodes.add(barcode)

    productRows.push({
      name: p.name, sku, barcode, category_id: categoryId,
      base_price: p.base_price, cost_cents: p.cost_cents,
      tax_rate: 9.00, unit_type: 'piece', is_active: true,
      track_stock: false, stock_quantity: 0,
    })
    productKeyOrder.push(key)
  }

  let insertedProducts = []
  if (productRows.length > 0) {
    insertedProducts = await batchInsert('products', productRows, 50)
    for (let i = 0; i < insertedProducts.length; i++) {
      productMap.set(productKeyOrder[i], insertedProducts[i].id)
    }
  }

  console.log(`  Matched existing: ${matchedExisting}`)
  console.log(`  Inserted new: ${insertedProducts.length}`)
  console.log(`  With cost price: ${insertedProducts.filter(p => p.cost_cents > 0).length}`)
  console.log(`  Total mapped: ${productMap.size}`)

  // ===== Step 5: Customers =====
  console.log('\n--- Step 5: Customers ---')
  let emailCounter = 0
  const customerRows = []
  const customerKeyOrder = []

  for (const [key, c] of allCustomers) {
    emailCounter++
    const hasDiffShipping = c.shipping_street && c.shipping_street !== c.billing_street
    customerRows.push({
      company_name: c.company_name, contact_person: c.contact_person,
      email: `woo-import-${emailCounter}@import.local`,
      phone: c.phone || null,
      billing_street: c.billing_street, billing_city: c.billing_city,
      billing_postal_code: c.billing_postal_code, billing_country: c.billing_country || 'NL',
      shipping_street: c.shipping_street, shipping_city: c.shipping_city,
      shipping_postal_code: c.shipping_postal_code, shipping_country: c.shipping_country || 'NL',
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

  // ===== Step 6: Orders + Items =====
  console.log('\n--- Step 6: Orders + Items ---')
  const orders = [...allOrders.values()]
  let ordersDone = 0, itemsDone = 0, skipped = 0, linkedItems = 0

  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50)
    const orderRows = []
    const batchData = []

    for (const o of batch) {
      const custId = customerMap.get(o.custName)
      if (!custId) { skipped++; continue }
      const createdAt = o.created ? new Date(o.created).toISOString() : new Date().toISOString()
      orderRows.push({
        order_number: `WOO-${o.woo}`, customer_id: custId,
        status: o.status, payment_method: o.pm || null,
        subtotal: o.sub, discount_amount: o.disc, discount: o.disc,
        tax_amount: o.tax, tax: o.tax, delivery_fee: o.ship, total: o.total,
        refund_amount: o.refund || 0,
        order_date: o.date, delivery_notes: o.note || '',
        internal_notes: `WooCommerce #${o.woo}`,
        created_at: createdAt, updated_at: createdAt,
      })
      batchData.push(o)
    }

    let insertedOrders
    try { insertedOrders = await batchInsert('orders', orderRows, 50) }
    catch (err) { console.error(`\n  ERROR orders batch ${i}: ${err.message}`); continue }

    for (let j = 0; j < insertedOrders.length; j++) {
      const orderId = insertedOrders[j].id
      const o = batchData[j]
      if (!o || !o.items.length) continue

      const itemRows = o.items.map(it => {
        const productId = productMap.get(it.productKey) || null
        if (productId) linkedItems++
        return {
          order_id: orderId, product_id: productId,
          product_name: it.name, product_sku: it.sku || null,
          unit_type: 'piece', quantity: it.qty,
          unit_price: it.price, cost_cents: it.costCents,
          discount_amount: 0, tax_rate: 9.00,
          tax_amount: Math.round(it.price * it.qty * 0.09),
          line_total: it.price * it.qty, total: it.price * it.qty,
        }
      })

      try {
        await batchInsert('order_items', itemRows, 100)
        itemsDone += itemRows.length
      } catch (err) {
        console.error(`\n  ERROR items WOO-${o.woo}: ${err.message}`)
      }
    }

    ordersDone += insertedOrders.length
    process.stdout.write(`  Orders: ${ordersDone}/${orders.length} | Items: ${itemsDone} | Linked: ${linkedItems} | Skipped: ${skipped}\r`)
  }

  console.log(`\n\n=== IMPORT COMPLETE ===`)
  console.log(`  Categories: ${categoryMap.size}`)
  console.log(`  Products: ${insertedProducts.length} (${insertedProducts.filter(p => p.cost_cents > 0).length} with cost price)`)
  console.log(`  Customers: ${insertedCustomers.length}`)
  console.log(`  Orders: ${ordersDone}`)
  console.log(`  Order Items: ${itemsDone} (${linkedItems} linked to products)`)
  console.log(`  Skipped: ${skipped}`)
  console.log('\nDone!')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
