// Analyze a WooCommerce CSV batch file
// Extracts unique customers, products, and orders for matching against existing DB data

const fs = require('fs')

function* parseCSVGen(text) {
  // Simple but handles quoted fields with commas
  const rows = []
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

const file = process.argv[2] || 'csv/orders-2026-03-15-12-51-41_1.csv'
const text = fs.readFileSync(file, 'utf-8')

const rows = [...parseCSVGen(text)]
const headers = rows[0]
const data = rows.slice(1)

// Build column index
const col = {}
headers.forEach((h, i) => col[h.trim()] = i)

// Extract unique orders
const orders = new Map()
const customers = new Map()
const products = new Map()

for (const row of data) {
  const orderNum = row[col['Order Number']]
  if (!orderNum) continue

  // Customer key: company name or email
  const company = row[col['Company (Billing)']] || ''
  const email = row[col['Email (Billing)']] || ''
  const firstName = row[col['First Name (Billing)']] || ''
  const lastName = row[col['Last Name (Billing)']] || ''
  const custKey = company || email || `${firstName} ${lastName}`.trim()

  if (custKey && !customers.has(custKey)) {
    customers.set(custKey, {
      company_name: company || `${firstName} ${lastName}`.trim(),
      contact_person: `${firstName} ${lastName}`.trim(),
      email,
      phone: row[col['Phone (Billing)']] || '',
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

  // Order (first occurrence sets the order data)
  if (!orders.has(orderNum)) {
    orders.set(orderNum, {
      order_number: orderNum,
      status: row[col['Order Status']],
      order_date: row[col['Order Date']],
      customer_key: custKey,
      customer_note: row[col['Customer Note']] || '',
      payment_method: row[col['Payment Method Title']] || '',
      subtotal: row[col['Order Subtotal Amount']] || '0',
      discount: row[col['Cart Discount Amount']] || '0',
      tax: row[col['Order Total Tax Amount']] || '0',
      shipping: row[col['Order Shipping Amount']] || '0',
      total: row[col['Order Total Amount']] || '0',
      refund: row[col['Order Refund Amount']] || '0',
      items: []
    })
  }

  // Order item
  const itemName = row[col['Item Name']] || ''
  const sku = row[col['SKU']] || ''
  const qty = row[col['Quantity (- Refund)']] || '0'
  const cost = row[col['Item Cost']] || '0'

  if (itemName) {
    orders.get(orderNum).items.push({
      product_name: itemName,
      sku,
      quantity: parseFloat(qty) || 0,
      unit_price: parseFloat(cost) || 0,
      line_total: (parseFloat(qty) || 0) * (parseFloat(cost) || 0)
    })

    // Track unique products by SKU or name
    const prodKey = sku || itemName
    if (!products.has(prodKey)) {
      products.set(prodKey, {
        name: itemName,
        sku,
        prices_seen: new Set()
      })
    }
    products.get(prodKey).prices_seen.add(parseFloat(cost) || 0)
  }
}

// Output summary
console.log('=== BATCH ANALYSIS ===')
console.log(`Total data rows: ${data.length}`)
console.log(`Unique orders: ${orders.size}`)
console.log(`Unique customers: ${customers.size}`)
console.log(`Unique products: ${products.size}`)

console.log('\n=== ORDERS BY STATUS ===')
const statusCount = {}
for (const [, o] of orders) {
  statusCount[o.status] = (statusCount[o.status] || 0) + 1
}
console.log(JSON.stringify(statusCount, null, 2))

console.log('\n=== DATE RANGE ===')
const dates = [...orders.values()].map(o => o.order_date).sort()
console.log(`First: ${dates[0]}`)
console.log(`Last: ${dates[dates.length - 1]}`)

console.log('\n=== CUSTOMERS ===')
for (const [key, c] of customers) {
  console.log(`  ${c.company_name || key} | ${c.email} | ${c.billing_city}`)
}

console.log('\n=== PRODUCTS (unique) ===')
for (const [key, p] of products) {
  const prices = [...p.prices_seen].sort((a,b) => a-b)
  console.log(`  ${p.sku || '(no sku)'} | ${p.name} | prices: ${prices.map(pr => '€' + pr.toFixed(2)).join(', ')}`)
}

console.log('\n=== SAMPLE ORDER ===')
const firstOrder = [...orders.values()][0]
console.log(JSON.stringify(firstOrder, null, 2))

// Write JSON for import script
const output = {
  customers: Object.fromEntries(customers),
  orders: Object.fromEntries([...orders.entries()].map(([k, v]) => [k, {...v}])),
  products: Object.fromEntries([...products.entries()].map(([k, v]) => [k, {...v, prices_seen: [...v.prices_seen]}])),
  stats: {
    total_rows: data.length,
    unique_orders: orders.size,
    unique_customers: customers.size,
    unique_products: products.size,
    date_range: { first: dates[0], last: dates[dates.length - 1] },
    status_counts: statusCount
  }
}
fs.writeFileSync('migration-data/batch1_analysis.json', JSON.stringify(output, null, 2))
console.log('\nJSON saved to migration-data/batch1_analysis.json')
