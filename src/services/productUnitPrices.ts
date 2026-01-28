import { supabase } from './supabase'
import type { ProductUnitPrice, UnitType } from '../types'

// Fetch all unit prices for a product
export async function fetchProductUnitPrices(productId: string): Promise<ProductUnitPrice[]> {
  const { data, error } = await supabase
    .from('product_unit_prices')
    .select('*')
    .eq('product_id', productId)
    .order('is_default', { ascending: false })
    .order('unit_type', { ascending: true })

  if (error) throw error
  return data || []
}

// Set or update unit prices for a product (replaces all)
export async function setProductUnitPrices(
  productId: string,
  unitPrices: {
    unit_type: UnitType
    price: number | null
    cost_cents?: number | null
    is_default: boolean
  }[]
): Promise<ProductUnitPrice[]> {
  // Delete existing unit prices for this product
  const { error: deleteError } = await supabase
    .from('product_unit_prices')
    .delete()
    .eq('product_id', productId)

  if (deleteError) throw deleteError

  // If no new prices, return empty
  if (unitPrices.length === 0) {
    return []
  }

  // Insert new unit prices
  const records = unitPrices.map(up => ({
    product_id: productId,
    unit_type: up.unit_type,
    price: up.price,
    cost_cents: up.cost_cents ?? null,
    is_default: up.is_default,
  }))

  const { data, error } = await supabase
    .from('product_unit_prices')
    .insert(records)
    .select('*')

  if (error) throw error
  return data || []
}

// Add or update a single unit price
export async function upsertProductUnitPrice(
  productId: string,
  unitType: UnitType,
  price: number | null,
  costCents?: number | null,
  isDefault: boolean = false
): Promise<ProductUnitPrice> {
  const { data, error } = await supabase
    .from('product_unit_prices')
    .upsert(
      {
        product_id: productId,
        unit_type: unitType,
        price,
        cost_cents: costCents ?? null,
        is_default: isDefault,
      },
      { onConflict: 'product_id,unit_type' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Delete a specific unit price
export async function deleteProductUnitPrice(
  productId: string,
  unitType: UnitType
): Promise<void> {
  const { error } = await supabase
    .from('product_unit_prices')
    .delete()
    .eq('product_id', productId)
    .eq('unit_type', unitType)

  if (error) throw error
}

// Get the default unit price for a product
export async function getDefaultUnitPrice(productId: string): Promise<ProductUnitPrice | null> {
  const { data, error } = await supabase
    .from('product_unit_prices')
    .select('*')
    .eq('product_id', productId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// Get available unit types for a product (those with prices set)
export async function getAvailableUnitTypes(productId: string): Promise<ProductUnitPrice[]> {
  const { data, error } = await supabase
    .from('product_unit_prices')
    .select('*')
    .eq('product_id', productId)
    .not('price', 'is', null)
    .order('is_default', { ascending: false })
    .order('unit_type', { ascending: true })

  if (error) throw error
  return data || []
}
