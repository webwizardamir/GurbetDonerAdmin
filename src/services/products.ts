import { supabase } from './supabase'
import type { Product, UnitType } from '../types'

export interface ProductFilters {
  search?: string
  category_id?: string
  limit?: number
  offset?: number
}

// Fetch products with optional filters
export async function fetchProducts(filters: ProductFilters = {}): Promise<Product[]> {
  // Build base query
  const buildQuery = (includeUnitPrices: boolean) => {
    const selectQuery = includeUnitPrices
      ? `*, category:categories(*), unit_prices:product_unit_prices(*)`
      : `*, category:categories(*)`

    let query = supabase
      .from('products')
      .select(selectQuery)
      .order('name', { ascending: true })

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`
      )
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters.offset !== undefined && filters.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1)
    } else if (filters.limit) {
      query = query.limit(filters.limit)
    }

    return query
  }

  // Try with unit_prices first, fall back without if table doesn't exist
  let { data, error } = await buildQuery(true)

  if (error && error.message?.includes('product_unit_prices')) {
    // Table doesn't exist yet, retry without unit_prices
    const result = await buildQuery(false)
    data = result.data
    error = result.error
  }

  if (error) throw error
  return (data as unknown as Product[]) || []
}

/**
 * Fetch every product (with category + unit prices) in batches of 1000,
 * since Supabase caps a single response at 1000 rows. Used for exporting
 * the full product master to Excel.
 */
export async function fetchAllProducts(): Promise<Product[]> {
  const PAGE_SIZE = 1000
  const all: Product[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select(`*, category:categories(*), unit_prices:product_unit_prices(*)`)
      .order('product_code', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data as unknown as Product[]) ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

// Fetch product count with filters (for pagination)
export async function fetchProductCount(filters: ProductFilters = {}): Promise<number> {
  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`
    )
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

// Fetch single product by ID
export async function fetchProductById(id: string): Promise<Product | null> {
  // Try with unit_prices first
  let { data, error } = await supabase
    .from('products')
    .select(`*, category:categories(*), unit_prices:product_unit_prices(*)`)
    .eq('id', id)
    .single()

  if (error && error.message?.includes('product_unit_prices')) {
    // Table doesn't exist yet, retry without unit_prices
    const result = await supabase
      .from('products')
      .select(`*, category:categories(*)`)
      .eq('id', id)
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw error
  return data as unknown as Product | null
}

// Fetch product by barcode
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  // Try with unit_prices first
  let { data, error } = await supabase
    .from('products')
    .select(`*, category:categories(*), unit_prices:product_unit_prices(*)`)
    .eq('barcode', barcode)
    .single()

  if (error && error.message?.includes('product_unit_prices')) {
    // Table doesn't exist yet, retry without unit_prices
    const result = await supabase
      .from('products')
      .select(`*, category:categories(*)`)
      .eq('barcode', barcode)
      .single()
    data = result.data
    error = result.error
  }

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data as unknown as Product | null
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
  stock_unit_type?: UnitType
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
    stock_unit_type: product.stock_unit_type || product.unit_type,
    track_stock: product.track_stock ?? true,
    description: product.description || null,
    created_by: userId,
  }

  // Only include cost_cents if provided (Owner only field)
  if (product.cost_cents !== undefined) {
    insertData.cost_cents = product.cost_cents
  }

  // Try with unit_prices first
  let { data, error } = await supabase
    .from('products')
    .insert(insertData)
    .select(`*, category:categories(*), unit_prices:product_unit_prices(*)`)
    .single()

  if (error && error.message?.includes('product_unit_prices')) {
    // Table doesn't exist yet, retry without unit_prices
    const result = await supabase
      .from('products')
      .insert(insertData)
      .select(`*, category:categories(*)`)
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw error
  return data as unknown as Product
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
    stock_unit_type?: UnitType
    track_stock?: boolean
    description?: string
  }
): Promise<Product> {
  // Try with unit_prices first
  let { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select(`*, category:categories(*), unit_prices:product_unit_prices(*)`)
    .single()

  if (error && error.message?.includes('product_unit_prices')) {
    // Table doesn't exist yet, retry without unit_prices
    const result = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(`*, category:categories(*)`)
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw error
  return data as unknown as Product
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

// ===========================================================================
// Bulk Excel import
// ===========================================================================

export interface ImportProductInput {
  product_code?: string | null
  sku?: string | null
  name: string
  category_id: string
  barcode?: string | null
  default_unit_type: UnitType
  unit_prices: Partial<Record<UnitType, number>>   // cents
  cost_cents?: number | null
  tax_rate?: number | null
  stock_quantity?: number | null
  track_stock?: boolean
  description?: string | null
}

export interface ImportProductsResult {
  created: number
  updated: number
  errors: string[]
}

/**
 * Upsert products from a validated Excel import.
 *
 * - Rows with a product_code matching an existing row → UPDATE
 * - Rows with an unknown product_code → INSERT with that code (admin-set)
 * - Rows with blank product_code → INSERT; trigger auto-assigns MHF-NNNNN
 *
 * Caller is expected to have run client-side validation already; errors
 * returned here are infrastructural (DB constraint violations, etc.).
 */
export async function upsertProductsFromImport(
  rows: ImportProductInput[],
): Promise<ImportProductsResult> {
  const result: ImportProductsResult = { created: 0, updated: 0, errors: [] }
  if (rows.length === 0) return result

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // Resolve existing IDs by product_code in a single query
  const codes = rows.map(r => r.product_code?.trim()).filter((c): c is string => !!c)
  const existing: Record<string, string> = {}   // product_code -> id
  if (codes.length > 0) {
    const { data, error } = await supabase
      .from('products')
      .select('id, product_code')
      .in('product_code', codes)
    if (error) {
      result.errors.push(`Lookup failed: ${error.message}`)
      return result
    }
    for (const row of data ?? []) {
      if (row.product_code) existing[row.product_code] = row.id
    }
  }

  // Apply unit prices for one product (after its main row has been written)
  const applyUnitPrices = async (productId: string, prices: Partial<Record<UnitType, number>>) => {
    const entries = (Object.entries(prices) as [UnitType, number][])
      .filter(([, price]) => typeof price === 'number' && price >= 0)
    if (entries.length === 0) return
    const upserts = entries.map(([unit_type, price]) => ({
      product_id: productId,
      unit_type,
      price,
    }))
    const { error } = await supabase
      .from('product_unit_prices')
      .upsert(upserts, { onConflict: 'product_id,unit_type' })
    if (error) result.errors.push(`Unit prices for ${productId}: ${error.message}`)
  }

  // Process rows in batches of 50 to limit single-call payload
  const BATCH_SIZE = 50
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const code = row.product_code?.trim() || null
      const matchedId = code ? existing[code] : undefined

      const payload: Record<string, unknown> = {
        name: row.name,
        category_id: row.category_id,
        unit_type: row.default_unit_type,
        sku: row.sku?.trim() || null,
        barcode: row.barcode?.trim() || null,
        tax_rate: row.tax_rate ?? 9.00,
        stock_quantity: row.stock_quantity ?? 0,
        stock_unit_type: row.default_unit_type,
        track_stock: row.track_stock ?? true,
        description: row.description ?? null,
        base_price: row.unit_prices[row.default_unit_type] ?? 0,
      }
      if (row.cost_cents !== undefined && row.cost_cents !== null) {
        payload.cost_cents = row.cost_cents
      }

      if (matchedId) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', matchedId)
        if (error) {
          result.errors.push(`Update ${code}: ${error.message}`)
          continue
        }
        await applyUnitPrices(matchedId, row.unit_prices)
        result.updated += 1
      } else {
        const insertData: Record<string, unknown> = { ...payload, created_by: userId }
        if (code) insertData.product_code = code
        const { data, error } = await supabase
          .from('products')
          .insert(insertData)
          .select('id')
          .single()
        if (error || !data) {
          result.errors.push(`Insert ${row.name}: ${error?.message ?? 'unknown error'}`)
          continue
        }
        await applyUnitPrices(data.id, row.unit_prices)
        result.created += 1
      }
    }
  }

  return result
}
