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

// All portal reads go through SECURITY DEFINER RPCs (migration 00071) that return
// only safe columns (no cost_cents / internal_notes) scoped to the logged-in customer
// server-side. The `customerId` args are kept for call-site compatibility but the RPCs
// resolve the customer from the session — they're not trusted from the client.

/**
 * Fetch orders for the current portal customer
 */
export async function fetchPortalOrders(_customerId?: string): Promise<PortalOrder[]> {
  const { data, error } = await portalSupabase.rpc('get_portal_orders')
  if (error) throw error
  return (data as PortalOrder[]) || []
}

/**
 * Fetch a single order with items and documents
 */
export async function fetchPortalOrder(orderId: string, _customerId?: string): Promise<PortalOrder | null> {
  const { data, error } = await portalSupabase.rpc('get_portal_order', { p_id: orderId })
  if (error) throw error
  return (data as PortalOrder) || null
}

/**
 * Fetch all documents for the current portal customer
 */
export async function fetchPortalDocuments(_customerId?: string): Promise<Document[]> {
  const { data, error } = await portalSupabase.rpc('get_portal_documents')
  if (error) throw error
  return (data as Document[]) || []
}

/**
 * Get stats for the portal dashboard
 */
export async function fetchPortalStats(_customerId?: string): Promise<PortalStats> {
  const { data, error } = await portalSupabase.rpc('get_portal_stats')
  if (error) throw error
  return (data as PortalStats) || { totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalSpent: 0 }
}

/**
 * Fetch recent orders (limited) for dashboard
 */
export async function fetchRecentPortalOrders(_customerId?: string, limit = 5): Promise<PortalOrder[]> {
  const orders = await fetchPortalOrders()
  return orders.slice(0, limit)
}
