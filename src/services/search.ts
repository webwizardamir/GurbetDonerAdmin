import { supabase } from './supabase'

export interface SearchResult {
  type: 'order' | 'customer' | 'product'
  id: string
  title: string
  subtitle?: string
  url: string
}

// Global search across orders, customers, and products
export async function globalSearch(query: string, limit = 10): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  const searchTerm = `%${query}%`
  const results: SearchResult[] = []

  // Search in parallel
  const [ordersRes, customersRes, productsRes] = await Promise.all([
    // Orders search
    supabase
      .from('orders')
      .select('id, order_number, customer:customers(company_name)')
      .or(`order_number.ilike.${searchTerm}`)
      .limit(limit),

    // Customers search
    supabase
      .from('customers')
      .select('id, company_name, contact_person, phone')
      .or(`company_name.ilike.${searchTerm},contact_person.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .limit(limit),

    // Products search
    supabase
      .from('products')
      .select('id, name, sku, barcode')
      .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm},barcode.ilike.${searchTerm}`)
      .limit(limit),
  ])

  // Process orders
  if (ordersRes.data) {
    for (const order of ordersRes.data) {
      const customerData = order.customer as unknown
      const customer = Array.isArray(customerData)
        ? (customerData[0] as { company_name: string } | undefined)
        : (customerData as { company_name: string } | null)
      results.push({
        type: 'order',
        id: order.id,
        title: order.order_number,
        subtitle: customer?.company_name,
        url: `/orders`,
      })
    }
  }

  // Process customers
  if (customersRes.data) {
    for (const customer of customersRes.data) {
      results.push({
        type: 'customer',
        id: customer.id,
        title: customer.company_name,
        subtitle: customer.contact_person || customer.phone,
        url: `/customers/${customer.id}`,
      })
    }
  }

  // Process products
  if (productsRes.data) {
    for (const product of productsRes.data) {
      results.push({
        type: 'product',
        id: product.id,
        title: product.name,
        subtitle: product.sku || product.barcode,
        url: `/products`,
      })
    }
  }

  // Also search for invoice numbers in documents
  const docsRes = await supabase
    .from('documents')
    .select('id, document_number, document_type, order_id')
    .ilike('document_number', searchTerm)
    .limit(limit)

  if (docsRes.data) {
    for (const doc of docsRes.data) {
      results.push({
        type: 'order',
        id: doc.order_id || doc.id,
        title: doc.document_number,
        subtitle: doc.document_type === 'invoice' ? 'Invoice' : 'Document',
        url: `/orders`,
      })
    }
  }

  return results.slice(0, limit * 2)
}
