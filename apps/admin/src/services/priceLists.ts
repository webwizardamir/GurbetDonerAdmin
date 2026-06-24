import { supabase } from './supabase'
import type { PriceList, PriceListItem, UnitType } from '../types'

// ===========================================================================
// price_lists CRUD
// ===========================================================================

export async function fetchPriceLists(opts: { activeOnly?: boolean } = {}): Promise<PriceList[]> {
  let query = supabase.from('price_lists').select('*').order('name', { ascending: true })
  if (opts.activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return (data as PriceList[]) ?? []
}

export async function fetchPriceListById(id: string): Promise<PriceList | null> {
  const { data, error } = await supabase.from('price_lists').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null   // no rows
    throw error
  }
  return data as PriceList
}

export interface CreatePriceListInput {
  name: string
  description?: string | null
  currency?: string
  is_active?: boolean
}

export async function createPriceList(input: CreatePriceListInput): Promise<PriceList> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user?.id) throw new Error('Sessie verlopen — log opnieuw in.')
  const { data, error } = await supabase
    .from('price_lists')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      currency: input.currency ?? 'EUR',
      is_active: input.is_active ?? true,
      created_by: userData?.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as PriceList
}

export async function updatePriceList(id: string, patch: Partial<CreatePriceListInput>): Promise<PriceList> {
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name.trim()
  if (patch.description !== undefined) update.description = patch.description?.trim() || null
  if (patch.currency !== undefined) update.currency = patch.currency
  if (patch.is_active !== undefined) update.is_active = patch.is_active
  const { data, error } = await supabase
    .from('price_lists')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as PriceList
}

export async function deletePriceList(id: string): Promise<void> {
  const { error } = await supabase.from('price_lists').delete().eq('id', id)
  if (error) throw error
}

// ===========================================================================
// price_list_items
// ===========================================================================

export type PriceListItemWithProduct = Omit<PriceListItem, 'product'> & {
  product: {
    id: string
    product_code: string | null
    name: string
    base_price: number
    unit_type: UnitType
    cost_cents: number | null
    // Per-unit prices/costs so the detail view can show margin and offer the
    // product's other (still unpriced) unit types for editing.
    unit_prices: { unit_type: UnitType; price: number | null; cost_cents: number | null }[]
  }
}

export async function fetchPriceListItems(priceListId: string): Promise<PriceListItemWithProduct[]> {
  const { data, error } = await supabase
    .from('price_list_items')
    .select(
      '*, product:products(id, product_code, name, base_price, unit_type, cost_cents, unit_prices:product_unit_prices(unit_type, price, cost_cents))',
    )
    .eq('price_list_id', priceListId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as unknown as PriceListItemWithProduct[]) ?? []
}

/**
 * Resolve the per-unit cost (cents) for a price-list item, mirroring the
 * picker's logic: the matching unit's cost_cents, falling back to the product
 * cost. Returns 0 when unknown (cost 0 = unknown, not a 100% margin).
 */
export function resolveItemCostCents(item: PriceListItemWithProduct): number {
  const unit = item.product?.unit_prices?.find(u => u.unit_type === item.unit_type)
  return unit?.cost_cents ?? item.product?.cost_cents ?? 0
}

/**
 * Lightweight count helper for the list view — fetches just the row count
 * per list in a single query.
 */
export async function fetchPriceListItemCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('price_list_items')
    .select('price_list_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of (data as { price_list_id: string }[]) ?? []) {
    counts[row.price_list_id] = (counts[row.price_list_id] ?? 0) + 1
  }
  return counts
}

export async function fetchPriceListCustomerCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('customers')
    .select('price_list_id')
    .not('price_list_id', 'is', null)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of (data as { price_list_id: string | null }[]) ?? []) {
    if (row.price_list_id) counts[row.price_list_id] = (counts[row.price_list_id] ?? 0) + 1
  }
  return counts
}

// ===========================================================================
// Customer ↔ price-list assignment (one list per customer via customers.price_list_id)
// ===========================================================================

export interface PriceListCustomer {
  id: string
  company_name: string
  contact_person: string | null
  billing_city: string | null
}

/** Customers currently assigned to this price list. */
export async function fetchCustomersByPriceList(priceListId: string): Promise<PriceListCustomer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, company_name, contact_person, billing_city')
    .eq('price_list_id', priceListId)
    .order('company_name', { ascending: true })
    .limit(1000)
  if (error) throw error
  return (data as PriceListCustomer[]) ?? []
}

/**
 * Assign one or more customers to this price list. Because a customer can only
 * have a single list, this *moves* any customer already on another list.
 */
export async function assignCustomersToPriceList(customerIds: string[], priceListId: string): Promise<void> {
  if (customerIds.length === 0) return
  const { error } = await supabase
    .from('customers')
    .update({ price_list_id: priceListId })
    .in('id', customerIds)
  if (error) throw error
}

/** Unassign a customer from any price list (clears customers.price_list_id). */
export async function removeCustomerFromPriceList(customerId: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ price_list_id: null })
    .eq('id', customerId)
  if (error) throw error
}

// ===========================================================================
// Bulk import (Excel)
// ===========================================================================

export interface ImportPriceListItemInput {
  product_id: string
  unit_type: UnitType
  price_cents: number
  tax_rate?: number | null
}

export interface ImportPriceListResult {
  inserted: number
  updated: number
  errors: string[]
}

/**
 * Upsert price-list items from a validated Excel import.
 *
 * Uniqueness is (price_list_id, product_id, unit_type), so re-importing the
 * same Product ID + Unit pair just updates the price/tax. Caller is expected
 * to have run client-side validation already.
 */
export async function upsertPriceListItems(
  priceListId: string,
  rows: ImportPriceListItemInput[],
): Promise<ImportPriceListResult> {
  const result: ImportPriceListResult = { inserted: 0, updated: 0, errors: [] }
  if (rows.length === 0) return result

  // Resolve which (product_id, unit_type) pairs already exist on this list
  const productIds = Array.from(new Set(rows.map(r => r.product_id)))
  const existing = new Set<string>()
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from('price_list_items')
      .select('product_id, unit_type')
      .eq('price_list_id', priceListId)
      .in('product_id', productIds)
    if (error) {
      result.errors.push(`Lookup failed: ${error.message}`)
      return result
    }
    for (const row of (data as { product_id: string; unit_type: string }[]) ?? []) {
      existing.add(`${row.product_id}::${row.unit_type}`)
    }
  }

  // Build upsert payload
  const payload = rows.map(r => ({
    price_list_id: priceListId,
    product_id: r.product_id,
    unit_type: r.unit_type,
    price_cents: r.price_cents,
    tax_rate: r.tax_rate ?? null,
  }))

  const { error } = await supabase
    .from('price_list_items')
    .upsert(payload, { onConflict: 'price_list_id,product_id,unit_type' })
  if (error) {
    result.errors.push(error.message)
    return result
  }

  for (const r of rows) {
    if (existing.has(`${r.product_id}::${r.unit_type}`)) result.updated += 1
    else result.inserted += 1
  }
  return result
}

export async function deletePriceListItem(id: string): Promise<void> {
  const { error } = await supabase.from('price_list_items').delete().eq('id', id)
  if (error) throw error
}

export interface UpdatePriceListItemInput {
  price_cents: number
  tax_rate: number | null
}

export async function updatePriceListItem(id: string, patch: UpdatePriceListItemInput): Promise<void> {
  const { error } = await supabase
    .from('price_list_items')
    .update({
      price_cents: patch.price_cents,
      tax_rate: patch.tax_rate,
    })
    .eq('id', id)
  if (error) throw error
}
