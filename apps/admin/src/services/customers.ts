import { supabase } from './supabase'
import { Customer } from '../types'

export interface CustomerFormData {
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  vat_number?: string
  payment_due_days?: number | null
  billing_street?: string
  billing_city?: string
  billing_postal_code?: string
  billing_country?: string
  shipping_same_as_billing?: boolean
  shipping_street?: string
  shipping_city?: string
  shipping_postal_code?: string
  shipping_country?: string
  internal_notes?: string
  price_list_id?: string | null
}

export interface CustomerFilters {
  search?: string
  city?: string
  limit?: number
  offset?: number
}

// Fetch all customers
export async function fetchCustomers(filters?: CustomerFilters): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*, price_list:price_lists(id, name, is_active)')
    .order('company_name', { ascending: true })

  if (filters?.city) {
    query = query.eq('billing_city', filters.city)
  }

  if (filters?.search) {
    query = query.or(
      `company_name.ilike.%${filters.search}%,` +
      `contact_person.ilike.%${filters.search}%,` +
      `email.ilike.%${filters.search}%,` +
      `phone.ilike.%${filters.search}%,` +
      `vat_number.ilike.%${filters.search}%`
    )
  }

  if (filters?.offset !== undefined && filters?.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  } else {
    query = query.limit(filters?.limit || 5000)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Fetch customer count with filters (for pagination)
export async function fetchCustomerCount(filters?: CustomerFilters): Promise<number> {
  let query = supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })

  if (filters?.city) {
    query = query.eq('billing_city', filters.city)
  }

  if (filters?.search) {
    query = query.or(
      `company_name.ilike.%${filters.search}%,` +
      `contact_person.ilike.%${filters.search}%,` +
      `email.ilike.%${filters.search}%,` +
      `phone.ilike.%${filters.search}%,` +
      `vat_number.ilike.%${filters.search}%`
    )
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

// Fetch a single customer by ID
export async function fetchCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*, price_list:price_lists(id, name, is_active)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

// Create a new customer
export async function createCustomer(customer: CustomerFormData): Promise<Customer> {
  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...customer,
      created_by: userData?.user?.id,
      billing_country: customer.billing_country || 'NL',
      shipping_same_as_billing: customer.shipping_same_as_billing ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a customer
export async function updateCustomer(id: string, updates: Partial<CustomerFormData>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a customer
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get customer stats for dashboard
export async function getCustomerStats(): Promise<{
  total: number
  newThisMonth: number
}> {
  const { data, error } = await supabase.rpc('get_customer_stats')

  if (error) throw error

  return {
    total: data?.[0]?.total_customers || 0,
    newThisMonth: data?.[0]?.new_this_month || 0,
  }
}

// Get unique cities for filter dropdown
export async function getCustomerCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('billing_city')
    .not('billing_city', 'is', null)
    .order('billing_city')

  if (error) throw error

  // Get unique cities
  const cities = [...new Set(data?.map(c => c.billing_city).filter(Boolean))]
  return cities as string[]
}

export interface CustomerItemSummary {
  product_id: string | null
  product_code: string | null
  product_name: string
  category_name: string
  unit_type: string
  total_quantity: number
  order_count: number
  last_ordered: string
  avg_unit_price: number   // cents
  total_revenue: number    // cents
  total_profit: number     // cents (owner-only display)
}

export interface CustomerProductOrder {
  order_id: string
  order_number: string
  order_date: string
  status: string
  quantity: number
  unit_price: number   // cents (immutable snapshot)
  line_total: number   // cents (qty × unit_price)
}

/**
 * Drill-down for the Products tab expandable row: list every order from a
 * customer that contained a specific (product, unit). Matches by product_id
 * when set, else falls back to product_name. Excludes cancelled / fully-
 * refunded orders (matches the summary RPC). No new SQL function needed —
 * order_items already carries the immutable snapshot we want to show.
 */
export async function fetchCustomerProductOrders(args: {
  customerId: string
  productId: string | null
  productName: string
  unitType: string
  startDate: string
  endDate: string
}): Promise<CustomerProductOrder[]> {
  let q = supabase
    .from('order_items')
    .select('quantity, unit_price, unit_type, product_id, product_name, order:orders!inner(id, order_number, order_date, status, customer_id)')
    .eq('unit_type', args.unitType)
    .eq('order.customer_id', args.customerId)
    .gte('order.order_date', args.startDate)
    .lte('order.order_date', args.endDate)
    .not('order.status', 'in', '(cancelled,refunded)')

  if (args.productId) {
    q = q.eq('product_id', args.productId)
  } else {
    q = q.eq('product_name', args.productName).is('product_id', null)
  }

  const { data, error } = await q
  if (error) throw error

  type Row = {
    quantity: number
    unit_price: number
    order: { id: string; order_number: string; order_date: string; status: string } | null
  }
  return ((data as unknown as Row[]) ?? [])
    .filter(r => r.order != null)
    .map(r => ({
      order_id:     r.order!.id,
      order_number: r.order!.order_number,
      order_date:   r.order!.order_date,
      status:       r.order!.status,
      quantity:     Number(r.quantity) || 0,
      unit_price:   Number(r.unit_price) || 0,
      line_total:   Math.round((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)),
    }))
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
}

/**
 * Per-(product, unit) summary of everything sold to one customer in a date
 * range. Backed by the get_customer_items_summary RPC (migration 00045).
 */
export async function fetchCustomerItemsSummary(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<CustomerItemSummary[]> {
  const { data, error } = await supabase.rpc('get_customer_items_summary', {
    p_customer_id: customerId,
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw error
  return (data as CustomerItemSummary[]) ?? []
}

export interface CustomerOrderProfit {
  order_id: string
  order_number: string
  order_date: string
  status: string
  subtotal: number          // cents, ex-VAT, net of refunds
  total_cost: number        // cents
  profit: number | null     // cents (NULL for non-owners)
  profit_margin: number | null
}

/**
 * Per-order profit for one customer in a date range. Backed by the
 * get_customer_orders RPC (migration 00069). Refund-correct and owner-gated:
 * profit/profit_margin come back NULL for non-owner roles, so cost never
 * reaches a Shop Manager. Callers should only invoke this for owners.
 */
export async function fetchCustomerOrders(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<CustomerOrderProfit[]> {
  const { data, error } = await supabase.rpc('get_customer_orders', {
    p_customer_id: customerId,
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw error
  return (data as CustomerOrderProfit[]) ?? []
}

// Check if email is already used by another customer
export async function checkEmailExists(email: string, excludeCustomerId?: string): Promise<boolean> {
  if (!email || email.trim() === '') return false

  let query = supabase
    .from('customers')
    .select('id')
    .ilike('email', email.trim())

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId)
  }

  const { data } = await query.limit(1)
  return (data?.length || 0) > 0
}
