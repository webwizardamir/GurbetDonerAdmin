import { portalSupabase } from './supabase'
import type { OrderItem, Document, OrderStatus, PaymentMethod } from '../types'

// Portal-specific order interface (uses raw database field names)
export interface PortalOrder {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  payment_method?: PaymentMethod
  subtotal: number
  discount: number
  tax: number
  delivery_fee: number
  total: number
  order_date: string
  delivery_notes?: string
  created_at: string
  updated_at: string
  items?: (OrderItem & { product?: { name: string; unit_type: string } })[]
  documents?: Document[]
}

export interface PortalStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalSpent: number
}

/**
 * Fetch orders for the current portal customer
 */
export async function fetchPortalOrders(customerId: string): Promise<PortalOrder[]> {
  const { data, error } = await portalSupabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single order with items and documents
 */
export async function fetchPortalOrder(orderId: string, customerId: string): Promise<PortalOrder | null> {
  const { data, error } = await portalSupabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      ),
      documents(*)
    `)
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

/**
 * Fetch all documents for the current portal customer
 */
export async function fetchPortalDocuments(customerId: string): Promise<Document[]> {
  const { data, error } = await portalSupabase
    .from('documents')
    .select(`
      *,
      order:orders!inner(
        id,
        order_number,
        customer_id,
        total
      )
    `)
    .eq('order.customer_id', customerId)
    .order('generated_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get stats for the portal dashboard
 */
export async function fetchPortalStats(customerId: string): Promise<PortalStats> {
  const { data: orders, error } = await portalSupabase
    .from('orders')
    .select('id, status, total')
    .eq('customer_id', customerId)

  if (error) throw error

  const stats: PortalStats = {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  }

  if (!orders) return stats

  stats.totalOrders = orders.length

  for (const order of orders) {
    if (order.status === 'completed' || order.status === 'delivered') {
      stats.completedOrders++
      stats.totalSpent += Number(order.total) || 0
    } else if (order.status === 'pending' || order.status === 'processing') {
      stats.pendingOrders++
    }
  }

  return stats
}

/**
 * Fetch recent orders (limited) for dashboard
 */
export async function fetchRecentPortalOrders(customerId: string, limit = 5): Promise<PortalOrder[]> {
  const { data, error } = await portalSupabase
    .from('orders')
    .select(`
      *,
      items:order_items(id)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
