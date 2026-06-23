import { supabase } from './supabase'
import type { CustomerPrice, PriceHistory, Product, UnitType, ProductUnitPrice } from '../types'

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

// Get effective price for a customer/product/unit-type
// Priority:
//   1. customer_prices for this unit_type
//   2. customer_prices with null unit_type (applies to all unit types)
//   3. price_list_items (if priceListId provided — i.e. customer is on a list)
//   4. product_unit_prices for this unit_type
//   5. products.base_price
export async function getEffectivePrice(
  customerId: string,
  productId: string,
  unitType?: UnitType,
  priceListId?: string | null,
): Promise<number> {
  if (!productId || !customerId) return 0

  // 1. customer-specific price for this unit type
  if (unitType) {
    const { data: customerPriceForUnit } = await supabase
      .from('customer_prices')
      .select('custom_price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .eq('unit_type', unitType)
      .maybeSingle()

    if (customerPriceForUnit) {
      return customerPriceForUnit.custom_price
    }
  }

  // 2. customer price with null unit_type (applies to all unit types)
  const { data: customerPrice } = await supabase
    .from('customer_prices')
    .select('custom_price')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .is('unit_type', null)
    .maybeSingle()

  if (customerPrice) {
    return customerPrice.custom_price
  }

  // 3. price-list override (customer is on a list)
  if (priceListId && unitType) {
    const { data: listItem } = await supabase
      .from('price_list_items')
      .select('price_cents')
      .eq('price_list_id', priceListId)
      .eq('product_id', productId)
      .eq('unit_type', unitType)
      .maybeSingle()

    if (listItem && typeof listItem.price_cents === 'number') {
      return listItem.price_cents
    }
  }

  // 4. product_unit_prices for this unit type (if table exists)
  if (unitType) {
    try {
      const { data: unitPrice, error } = await supabase
        .from('product_unit_prices')
        .select('price')
        .eq('product_id', productId)
        .eq('unit_type', unitType)
        .maybeSingle()

      if (!error && unitPrice?.price !== null && unitPrice?.price !== undefined) {
        return unitPrice.price
      }
    } catch {
      // Table doesn't exist yet, continue to fallback
    }
  }

  // 5. base price
  const { data: product } = await supabase
    .from('products')
    .select('base_price')
    .eq('id', productId)
    .maybeSingle()

  return product?.base_price || 0
}

// Get available unit prices for a customer/product combination
// Priority per unit_type (matches getEffectivePrice):
//   1. customer_prices for this unit_type
//   2. customer_prices with null unit_type
//   3. price_list_items (if priceListId provided)
//   4. product_unit_prices
export async function getAvailableUnitPricesForCustomer(
  customerId: string,
  productId: string,
  priceListId?: string | null,
): Promise<{ unitType: UnitType; price: number; isDefault: boolean }[]> {
  if (!productId || !customerId) return []

  // Get all unit prices for this product (if table exists)
  let unitPrices: ProductUnitPrice[] | null = null
  try {
    const { data, error } = await supabase
      .from('product_unit_prices')
      .select('*')
      .eq('product_id', productId)
      .not('price', 'is', null)
      .order('is_default', { ascending: false })
      .order('unit_type', { ascending: true })

    if (!error) {
      unitPrices = data
    }
  } catch {
    // Table doesn't exist yet
  }

  if (!unitPrices || unitPrices.length === 0) {
    return []
  }

  // Get customer prices for this product
  const { data: customerPrices } = await supabase
    .from('customer_prices')
    .select('unit_type, custom_price')
    .eq('customer_id', customerId)
    .eq('product_id', productId)

  const customerPriceMap = new Map<UnitType | null, number>()
  if (customerPrices) {
    for (const cp of customerPrices) {
      customerPriceMap.set(cp.unit_type, cp.custom_price)
    }
  }
  const defaultCustomerPrice = customerPriceMap.get(null)

  // Get price-list items for this product on the customer's list
  const priceListMap = new Map<UnitType, number>()
  if (priceListId) {
    const { data: listItems } = await supabase
      .from('price_list_items')
      .select('unit_type, price_cents')
      .eq('price_list_id', priceListId)
      .eq('product_id', productId)
    if (listItems) {
      for (const it of listItems as { unit_type: UnitType; price_cents: number }[]) {
        priceListMap.set(it.unit_type, it.price_cents)
      }
    }
  }

  return unitPrices.map((up: ProductUnitPrice) => {
    let price = up.price!
    if (customerPriceMap.has(up.unit_type)) {
      price = customerPriceMap.get(up.unit_type)!
    } else if (defaultCustomerPrice !== undefined) {
      price = defaultCustomerPrice
    } else if (priceListMap.has(up.unit_type)) {
      price = priceListMap.get(up.unit_type)!
    }

    return {
      unitType: up.unit_type,
      price,
      isDefault: up.is_default,
    }
  })
}

// Set or update customer price
export async function setCustomerPrice(
  customerId: string,
  productId: string,
  customPrice: number,
  unitType?: UnitType
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
        unit_type: unitType ?? null,
        created_by: userId,
      },
      {
        onConflict: 'customer_id,product_id,unit_type',
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
  prices: { productId: string; customPrice: number; unitType?: UnitType }[]
): Promise<CustomerPrice[]> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const records = prices.map(p => ({
    customer_id: customerId,
    product_id: p.productId,
    custom_price: p.customPrice,
    unit_type: p.unitType ?? null,
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('customer_prices')
    .upsert(records, { onConflict: 'customer_id,product_id,unit_type' })
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

// Clear a remembered customer price by composite key (customer + product + unit).
// `unitType = null` clears the unit-less (applies-to-all) row. Reverts that line
// to the next-tier price (list / product / base).
export async function clearCustomerPrice(
  customerId: string,
  productId: string,
  unitType: UnitType | null,
): Promise<void> {
  let query = supabase
    .from('customer_prices')
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', productId)
  query = unitType === null ? query.is('unit_type', null) : query.eq('unit_type', unitType)
  const { error } = await query

  if (error) throw error
}

// Get all products with their effective prices for a customer
// Uses base price as the effective price for display (customer can have per-unit-type pricing)
export async function getProductsWithPricesForCustomer(
  customerId: string
): Promise<(Product & { effective_price: number; has_custom_price: boolean })[]> {
  // Get all products with unit_prices (if table exists)
  let products: Product[] | null = null
  let productsError: Error | null = null

  // Try with unit_prices first
  const result1 = await supabase
    .from('products')
    .select(`*, unit_prices:product_unit_prices(*)`)
    .order('name')

  if (result1.error && result1.error.message?.includes('product_unit_prices')) {
    // Table doesn't exist, retry without
    const result2 = await supabase
      .from('products')
      .select('*')
      .order('name')
    products = result2.data
    productsError = result2.error as Error | null
  } else {
    products = result1.data
    productsError = result1.error as Error | null
  }

  if (productsError) throw productsError

  // Get customer prices (including those with null unit_type, which apply to all)
  const { data: customerPrices, error: pricesError } = await supabase
    .from('customer_prices')
    .select('product_id, unit_type, custom_price')
    .eq('customer_id', customerId)

  if (pricesError) throw pricesError

  // Create a map for quick lookup (product_id -> has any custom price)
  const hasCustomPriceMap = new Set(
    (customerPrices || []).map(p => p.product_id)
  )

  // Create a map for default price lookup (product_id -> price for null unit_type)
  const defaultPriceMap = new Map(
    (customerPrices || [])
      .filter(p => p.unit_type === null)
      .map(p => [p.product_id, p.custom_price])
  )

  // Combine products with their effective prices
  return (products || []).map(product => ({
    ...product,
    effective_price: defaultPriceMap.get(product.id) ?? product.base_price,
    has_custom_price: hasCustomPriceMap.has(product.id),
  }))
}
