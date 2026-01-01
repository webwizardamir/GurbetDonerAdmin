import { supabase } from './supabase'
import type { Product, UnitType } from '../types'

export interface ProductFilters {
  search?: string
  category_id?: string
  limit?: number
}

// Fetch products with optional filters
export async function fetchProducts(filters: ProductFilters = {}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .order('name', { ascending: true })

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`
    )
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  // Apply limit for performance
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Fetch single product by ID
export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Fetch product by barcode
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('barcode', barcode)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data
}

// Create product
export async function createProduct(product: {
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  unit_type: UnitType
  base_price: number // in cents
  cost_cents?: number // Cost of goods in cents (Owner only)
  tax_rate?: number
  stock_quantity?: number
  track_stock?: boolean
  description?: string
}): Promise<Product> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const insertData: Record<string, unknown> = {
    name: product.name,
    sku: product.sku || null,
    barcode: product.barcode || null,
    category_id: product.category_id || null,
    unit_type: product.unit_type,
    base_price: product.base_price,
    tax_rate: product.tax_rate ?? 9.00,
    stock_quantity: product.stock_quantity ?? 0,
    track_stock: product.track_stock ?? true,
    description: product.description || null,
    created_by: userId,
  }

  // Only include cost_cents if provided (Owner only field)
  if (product.cost_cents !== undefined) {
    insertData.cost_cents = product.cost_cents
  }

  const { data, error } = await supabase
    .from('products')
    .insert(insertData)
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) throw error
  return data
}

// Update product
export async function updateProduct(
  id: string,
  updates: {
    name?: string
    sku?: string
    barcode?: string
    category_id?: string | null
    unit_type?: UnitType
    base_price?: number
    cost_cents?: number
    tax_rate?: number
    stock_quantity?: number
    track_stock?: boolean
    description?: string
  }
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) throw error
  return data
}

// Delete product
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Check if barcode is unique
export async function isBarcodeUnique(barcode: string, excludeId?: string): Promise<boolean> {
  if (!barcode) return true

  let query = supabase
    .from('products')
    .select('id')
    .eq('barcode', barcode)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return !data || data.length === 0
}

// Check if SKU is unique
export async function isSkuUnique(sku: string, excludeId?: string): Promise<boolean> {
  if (!sku) return true

  let query = supabase
    .from('products')
    .select('id')
    .eq('sku', sku)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return !data || data.length === 0
}
