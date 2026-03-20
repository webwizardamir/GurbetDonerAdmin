// WooCommerce Final Import — clean DB, products with cost prices, orders linked
// Handles duplicate column names in CSV (two "Item Cost", two "Order Status")
// Deduplicates customers by company_name, products by name
// Merges existing data if re-run

const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'https://pnimvwconhhmcwxcuxcz.supabase.co'
const SERVICE_KEY = process.argv[2]
const ORDERS_CSV = process.argv[3] || 'csv/orders-2026-03-19-23-39-06.csv'
const PRODUCTS_CSV = process.argv[4] || 'csv/wc-product-export-17-3-2026-1773704453132.csv'

if (!SERVICE_KEY) {
  console.error('Usage: node scripts/import-final.cjs <service-role-key> [orders-csv] [products-csv]')
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

// ===== CSV parser — returns array of arrays, preserves duplicate column names =====
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

// Build column map — handles duplicate column names by using first occurrence
function buildColMap(headers) {
  const col = {}
  headers.forEach((h, i) => {
    const key = h.trim()
    if (!(key in col)) col[key] = i // first occurrence wins
  })
  return col
}

function parsePrice(v) {
  if (!v || v === '') return 0
  let s = String(v).trim()
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  return parseFloat(s) || 0
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

async function main() {
  console.log('=== WooCommerce Final Import ===\n')

  // ===== Step 1: Load product cost prices from products CSV =====
  console.log('--- Step 1: Product cost prices ---')
  const prodText = fs.readFileSync(PRODUCTS_CSV, 'utf-8')
  const prodRows = [...parseCSV(prodText)]
  const prodCol = buildColMap(prodRows[0])

  const wooProdInfo = new Map() // woo_id -> info
  const wooProdByName = new Map() // name -> info

  for (let i = 1; i < prodRows.length; i++) {
    const row = prodRows[i]
    const wooId = row[prodCol['ID']]
    const name = (row[prodCol['Name']] || '').trim()
    const sku = row[prodCol['SKU']] || null
    const price = eurToCents(row[prodCol['Regular price']])
    const costPrice = Math.round(parsePrice(row[prodCol['Meta: _analytics_cost_price']]) * 100)
    const category = row[prodCol['Categories']] || ''

    const info = { wooId, name, sku, price, costPrice, category }
    if (wooId) wooProdInfo.set(wooId, info)
    if (name) wooProdByName.set(name, info)
  }
  console.log(`  ${wooProdInfo.size} products, ${[...wooProdInfo.values()].filter(p => p.costPrice > 0).length} with cost price`)

  // ===== Step 2: Parse orders CSV =====
  console.log('\n--- Step 2: Parsing orders ---')
  const text = fs.readFileSync(ORDERS_CSV, 'utf-8')
  const rows = [...parseCSV(text)]
  const headers = rows[0]
  const col = buildColMap(headers)
  const data = rows.slice(1)

  // Find the Product Id column (may be after the first set of order columns)
  // Also find Item Name — use the LAST "Item Name" if duplicated
  let productIdCol = col['Product Id']
  let categoryCol = col['Category']
  let itemNameCol = col['Item Name']
  let quantityCol = col['Quantity (- Refund)']
  let skuCol = col['SKU']

  // For Item Cost — there may be two. We want the one near Item Name (the selling price per unit)
  // The first Item Cost is near Product Name (position ~37), second is near Item Name (position ~42)
  // We want the second one (the actual line item cost)
  let itemCostCol = col['Item Cost']
  // Find ALL Item Cost columns
  const allItemCostCols = []
  headers.forEach((h, i) => { if (h.trim() === 'Item Cost') allItemCostCols.push(i) })
  if (allItemCostCols.length > 1) {
    itemCostCol = allItemCostCols[allItemCostCols.length - 1] // use the last one
  }

  console.log(`  Columns: ProductId=${productIdCol}, Category=${categoryCol}, ItemName=${itemNameCol}, ItemCost=${itemCostCol}, Qty=${quantityCol}, SKU=${skuCol}`)

  const allOrders = new Map()
  const allCustomers = new Map()
  const allProducts = new Map()

  for (const row of data) {
    const orderNum = row[col['Order Number']]; if (!orderNum) continue
    const company = row[col['Company (Billing)']] || ''
    const first = row[col['First Name (Billing)']] || ''
    const last = row[col['Last Name (Billing)']] || ''
    const email = row[col['Email (Billing)']] || ''
    const phone = row[col['Phone (Billing)']] || ''
    const companyName = company || `${first} ${last}`.trim() || email

    // Customer (deduplicate by company name)
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

    // Order item + product
    const itemName = (row[itemNameCol] || '').trim()
    if (!itemName) continue

    const sku = row[skuCol] || null
    const wooProductId = row[productIdCol] || null
    const sellingPrice = eurToCents(row[itemCostCol])
    const category = row[categoryCol] || ''

    // Look up cost from products CSV
    let costCents = 0
    let prodInfo = null
    if (wooProductId && wooProdInfo.has(wooProductId)) {
      prodInfo = wooProdInfo.get(wooProductId)
      costCents = prodInfo.costPrice
    } else if (wooProdByName.has(itemName)) {
      prodInfo = wooProdByName.get(itemName)
      costCents = prodInfo.costPrice
    }

    allOrders.get(orderNum).items.push({
      name: itemName, sku,
      qty: parseFloat(row[quantityCol]) || 0,
      price: sellingPrice, costCents,
      productKey: itemName,
    })

    // Product (deduplicate by name, merge info)
    if (!allProducts.has(itemName)) {
      allProducts.set(itemName, {
        name: itemName,
        sku: sku || prodInfo?.sku || null,
        base_price: prodInfo?.price || sellingPrice,
        cost_cents: costCents,
        category: category || prodInfo?.category || '',
      })
    } else {
      const ex = allProducts.get(itemName)
      if (sku && !ex.sku) ex.sku = sku
      if (sellingPrice > 0 && ex.base_price === 0) ex.base_price = sellingPrice
      if (costCents > 0 && ex.cost_cents === 0) ex.cost_cents = costCents
      if (category && !ex.category) ex.category = category
    }
  }

  console.log(`  Orders: ${allOrders.size} | Customers: ${allCustomers.size} | Products: ${allProducts.size}`)
  console.log(`  Products with cost: ${[...allProducts.values()].filter(p => p.cost_cents > 0).length}`)

  // ===== Step 3: Categories =====
  console.log('\n--- Step 3: Categories ---')
  const categorySet = new Set()
  for (const [, p] of allProducts) {
    if (p.category) p.category.split(',').forEach(c => { const t = c.trim(); if (t && t !== 'Uncategorized') categorySet.add(t) })
  }

  const existingCats = await request('GET', '/rest/v1/categories?select=id,name&limit=500')
  const categoryMap = new Map()
  for (const cat of existingCats) categoryMap.set(cat.name.toLowerCase(), cat.id)

  const newCats = []
  for (const cn of categorySet) {
    if (!categoryMap.has(cn.toLowerCase())) {
      newCats.push({ name: cn, slug: cn.toLowerCase().replace(/[^a-z0-9]+/g, '-'), is_active: true })
    }
  }
  if (newCats.length > 0) {
    const ins = await batchInsert('categories', newCats, 50)
    for (const c of ins) categoryMap.set(c.name.toLowerCase(), c.id)
  }
  console.log(`  Categories: ${categoryMap.size}`)

  // ===== Step 4: Products =====
  console.log('\n--- Step 4: Products ---')
  const productRows = []
  const productKeyOrder = []
  const seenSkus = new Set()
  const seenBarcodes = new Set()
  const productMap = new Map()

  for (const [key, p] of allProducts) {
    let catId = null
    if (p.category) {
      for (const cn of p.category.split(',').map(c => c.trim()).filter(c => c && c !== 'Uncategorized')) {
        const cid = categoryMap.get(cn.toLowerCase()); if (cid) { catId = cid; break }
      }
    }

    let sku = p.sku || null
    let barcode = p.sku || null
    if (sku && seenSkus.has(sku)) sku = null; else if (sku) seenSkus.add(sku)
    if (barcode && seenBarcodes.has(barcode)) barcode = null; else if (barcode) seenBarcodes.add(barcode)

    productRows.push({
      name: p.name, sku, barcode, category_id: catId,
      base_price: p.base_price, cost_cents: p.cost_cents,
      tax_rate: 9.00, unit_type: 'piece', is_active: true,
      track_stock: false, stock_quantity: 0,
    })
    productKeyOrder.push(key)
  }

  const insertedProducts = await batchInsert('products', productRows, 50)
  for (let i = 0; i < insertedProducts.length; i++) {
    productMap.set(productKeyOrder[i], insertedProducts[i].id)
  }
  console.log(`  Inserted: ${insertedProducts.length} | With cost: ${insertedProducts.filter(p => p.cost_cents > 0).length}`)

  // ===== Step 5: Customers =====
  console.log('\n--- Step 5: Customers ---')
  let emailCtr = 0
  const customerRows = []
  const customerKeyOrder = []

  for (const [key, c] of allCustomers) {
    emailCtr++
    const hasDiffShip = c.shipping_street && c.shipping_street !== c.billing_street
    customerRows.push({
      company_name: c.company_name, contact_person: c.contact_person,
      email: `woo-${emailCtr}@import.local`, phone: c.phone || null,
      billing_street: c.billing_street, billing_city: c.billing_city,
      billing_postal_code: c.billing_postal_code, billing_country: c.billing_country || 'NL',
      shipping_street: c.shipping_street, shipping_city: c.shipping_city,
      shipping_postal_code: c.shipping_postal_code, shipping_country: c.shipping_country || 'NL',
      shipping_same_as_billing: !hasDiffShip,
    })
    customerKeyOrder.push(key)
  }

  const insertedCust = await batchInsert('customers', customerRows, 50)
  const customerMap = new Map()
  for (let i = 0; i < insertedCust.length; i++) customerMap.set(customerKeyOrder[i], insertedCust[i].id)
  console.log(`  Inserted: ${insertedCust.length}`)

  // ===== Step 6: Orders + Items =====
  console.log('\n--- Step 6: Orders + Items ---')
  const orders = [...allOrders.values()]
  let ordersDone = 0, itemsDone = 0, skipped = 0, linked = 0

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

    let inserted
    try { inserted = await batchInsert('orders', orderRows, 50) }
    catch (err) { console.error(`\n  ERROR orders batch ${i}: ${err.message}`); continue }

    for (let j = 0; j < inserted.length; j++) {
      const orderId = inserted[j].id
      const o = batchData[j]
      if (!o || !o.items.length) continue

      const itemRows = o.items.map(it => {
        const pid = productMap.get(it.productKey) || null
        if (pid) linked++
        return {
          order_id: orderId, product_id: pid,
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

    ordersDone += inserted.length
    process.stdout.write(`  Orders: ${ordersDone}/${orders.length} | Items: ${itemsDone} | Linked: ${linked} | Skipped: ${skipped}\r`)
  }

  console.log(`\n\n=== IMPORT COMPLETE ===`)
  console.log(`  Products: ${insertedProducts.length} (${insertedProducts.filter(p => p.cost_cents > 0).length} with cost)`)
  console.log(`  Customers: ${insertedCust.length}`)
  console.log(`  Orders: ${ordersDone}`)
  console.log(`  Items: ${itemsDone} (${linked} linked to products)`)
  console.log(`  Skipped: ${skipped}`)
  console.log('\nDone!')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
