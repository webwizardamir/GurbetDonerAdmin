import { supabase } from './supabase'
import type { CustomerPrice, PriceHistory, Product } from '../types'

// Extended type with product info for display
export interface CustomerPriceWithProduct extends CustomerPrice {
  product?: Product
}

// Fetch all custom prices for a customer
export async function fetchCustomerPrices(customerId: string): Promise<CustomerPriceWithProduct[]> {
  const { data, error } = await supabase
    .from('customer_prices')
    .select(`
      *,
      product:products(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Fetch price history for a customer price
export async function fetchPriceHistory(customerPriceId: string): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('customer_price_id', customerPriceId)
    .order('changed_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Get effective price for a customer/product (customer price or base price)
export async function getEffectivePrice(customerId: string, productId: string): Promise<number> {
  // First try to get customer-specific price
  const { data: customerPrice } = await supabase
    .from('customer_prices')
    .select('custom_price')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .single()

  if (customerPrice) {
    return customerPrice.custom_price
  }

  // Fall back to base price
  const { data: product } = await supabase
    .from('products')
    .select('base_price')
    .eq('id', productId)
    .single()

  return product?.base_price || 0
}

// Set or update customer price
export async function setCustomerPrice(
  customerId: string,
  productId: string,
  customPrice: number
): Promise<CustomerPrice> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // Upsert - insert or update if exists
  const { data, error } = await supabase
    .from('customer_prices')
    .upsert(
      {
        customer_id: customerId,
        product_id: productId,
        custom_price: customPrice,
        created_by: userId,
      },
      {
        onConflict: 'customer_id,product_id',
      }
    )
    .select(`
      *,
      product:products(*)
    `)
    .single()

  if (error) throw error
  return data
}

// Bulk set customer prices
export async function bulkSetCustomerPrices(
  customerId: string,
  prices: { productId: string; customPrice: number }[]
): Promise<CustomerPrice[]> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const records = prices.map(p => ({
    customer_id: customerId,
    product_id: p.productId,
    custom_price: p.customPrice,
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('customer_prices')
    .upsert(records, { onConflict: 'customer_id,product_id' })
    .select('*')

  if (error) throw error
  return data || []
}

// Delete customer price (revert to base price)
export async function deleteCustomerPrice(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_prices')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get all products with their effective prices for a customer
export async function getProductsWithPricesForCustomer(
  customerId: string
): Promise<(Product & { effective_price: number; has_custom_price: boolean })[]> {
  // Get all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (productsError) throw productsError

  // Get customer prices
  const { data: customerPrices, error: pricesError } = await supabase
    .from('customer_prices')
    .select('product_id, custom_price')
    .eq('customer_id', customerId)

  if (pricesError) throw pricesError

  // Create a map for quick lookup
  const priceMap = new Map(
    (customerPrices || []).map(p => [p.product_id, p.custom_price])
  )

  // Combine products with their effective prices
  return (products || []).map(product => ({
    ...product,
    effective_price: priceMap.get(product.id) ?? product.base_price,
    has_custom_price: priceMap.has(product.id),
  }))
}
