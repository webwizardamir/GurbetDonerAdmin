// Script to create test data for document layout testing
// Run with: node scripts/create-test-data.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestData() {
  console.log('Creating test data...')

  // Get current user session or use service role
  const { data: { user } } = await supabase.auth.getUser()

  // Create test customer
  console.log('Creating test customer...')
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      company_name: 'Test Groothandel B.V.',
      contact_person: 'Jan de Vries',
      email: 'jan@testgroothandel.nl',
      phone: '+31 20 123 4567',
      billing_street: 'Teststraat 123',
      billing_city: 'Amsterdam',
      billing_postal_code: '1012 AB',
      billing_country: 'Nederland',
      vat_number: 'NL123456789B01',
    })
    .select()
    .single()

  if (customerError) {
    console.error('Error creating customer:', customerError)
    return
  }
  console.log('Created customer:', customer.company_name)

  // Get or create category
  let { data: category } = await supabase
    .from('categories')
    .select()
    .eq('name', 'Test Producten')
    .single()

  if (!category) {
    const { data: newCat } = await supabase
      .from('categories')
      .insert({ name: 'Test Producten', is_active: true })
      .select()
      .single()
    category = newCat
  }

  // Create 30 test products
  console.log('Creating 30 test products...')
  const productNames = [
    // Chicken (1-10)
    'Halal Kip Filet 1kg',
    'Halal Kip Drumsticks 500g',
    'Halal Kip Vleugels 1kg',
    'Halal Kip Gehakt 500g',
    'Halal Kip Worst 400g',
    'Halal Kip Kebab 500g',
    'Halal Kip Shoarma 1kg',
    'Halal Kip Nuggets 300g',
    'Halal Kip Schnitzels 4st',
    'Halal Kip Burgers 4st',
    // Beef (11-20)
    'Halal Rund Biefstuk 500g',
    'Halal Rund Gehakt 500g',
    'Halal Rund Stoofvlees 1kg',
    'Halal Rund Rib 1kg',
    'Halal Rund Sucuk 400g',
    'Halal Rund Pastirma 200g',
    'Halal Rund Lever 500g',
    'Halal Rund Ossenhaas 500g',
    'Halal Rund Entrecote 400g',
    'Halal Rund Tartaar 300g',
    // Other (21-30)
    'Halal Lam Kotelet 500g',
    'Halal Lam Gehakt 500g',
    'Halal Lam Schouder 1kg',
    'Halal Geit Stoofvlees 1kg',
    'Halal Kalkoen Filet 500g',
    'Halal Kalkoen Gehakt 500g',
    'Halal Eend Heel 2kg',
    'Halal Merguez Worst 400g',
    'Halal Mixed Grill 1kg',
    'Halal BBQ Pakket 2kg',
  ]

  const products = []
  for (let i = 0; i < 30; i++) {
    const basePrice = 500 + (i * 50) + Math.floor(Math.random() * 500)
    const costCents = 300 + (i * 30) + Math.floor(Math.random() * 300)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: productNames[i],
        sku: `TST-${String(i + 1).padStart(3, '0')}`,
        barcode: `87${String(i + 1).padStart(11, '0')}`,
        category_id: category?.id,
        unit_type: i % 3 === 0 ? 'kg' : (i % 3 === 1 ? 'package' : 'piece'),
        base_price: basePrice,
        cost_cents: costCents,
        tax_rate: i % 5 === 0 ? 21 : 9,
        stock_quantity: 50 + Math.floor(Math.random() * 100),
        track_stock: true,
        description: `Test product ${i + 1} voor document layout testing`,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error(`Error creating product ${i + 1}:`, error)
    } else {
      products.push(product)
    }
  }
  console.log(`Created ${products.length} products`)

  // Create order
  console.log('Creating test order...')
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      order_date: new Date().toISOString().split('T')[0],
      status: 'pending_payment',
      delivery_notes: 'Test bestelling voor document layout. Bezorgen voor 12:00.',
      internal_notes: 'Dit is een test order met 30 items om PDF layouts te testen.',
    })
    .select()
    .single()

  if (orderError) {
    console.error('Error creating order:', orderError)
    return
  }
  console.log('Created order:', order.order_number)

  // Create order items
  console.log('Creating order items...')
  for (const product of products) {
    const quantity = 1 + Math.floor(Math.random() * 5)
    const { error } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        unit_type: product.unit_type,
        quantity: quantity,
        unit_price: product.base_price,
        tax_rate: product.tax_rate,
      })

    if (error) {
      console.error(`Error creating order item for ${product.name}:`, error)
    }
  }

  console.log('\n✅ Test data created successfully!')
  console.log(`Customer: ${customer.company_name}`)
  console.log(`Products: ${products.length} items`)
  console.log(`Order: ${order.order_number}`)
  console.log('\nGo to Orders page and click on the order to test document generation.')
}

createTestData().catch(console.error)
