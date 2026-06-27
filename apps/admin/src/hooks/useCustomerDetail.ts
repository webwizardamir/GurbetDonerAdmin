import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { fetchCustomerItemsSummary, fetchCustomerOrders, type CustomerItemSummary, type CustomerOrderProfit } from '../services/customers'
import { useAuth } from '../context/AuthContext'
import type { Customer, Document, DocumentType, PaymentMethod } from '../types'

export interface CustomerOrder {
  id: string
  order_number: string
  order_date: string
  status: string
  payment_method?: PaymentMethod
  subtotal: number
  tax: number
  discount: number
  total: number
  refund_amount: number
  created_at: string
  // Owner-only per-order profit/margin (cents / %), from the server-gated
  // get_customer_orders RPC. NULL/undefined for non-owners so cost never leaks.
  profit?: number | null
  margin?: number | null
  items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_type: string
    unit_price: number
    total: number
  }>
  documents: Document[]
}

export interface CustomerStats {
  totalRevenue: number
  totalOrders: number
  completedOrders: number
  avgOrderValue: number
  totalItems: number
  // Owner-only: all-time profit (cents) and gross margin (%) over this
  // customer's non-cancelled/refunded line items. Sourced from the
  // server-gated get_customer_items_summary RPC (NULL profit for non-owners),
  // so cost data never reaches a Shop Manager's browser. 0 for non-owners.
  totalProfit: number
  profitMargin: number
  paymentBreakdown: {
    cash: number
    bank: number
  }
}

interface CustomerDetailState {
  loading: boolean
  error: string | null
  customer: Customer | null
  orders: CustomerOrder[]
  stats: CustomerStats
}

const emptyStats: CustomerStats = {
  totalRevenue: 0,
  totalOrders: 0,
  completedOrders: 0,
  avgOrderValue: 0,
  totalItems: 0,
  totalProfit: 0,
  profitMargin: 0,
  paymentBreakdown: { cash: 0, bank: 0 },
}

export function useCustomerDetail(customerId: string | undefined) {
  const { isOwner } = useAuth()
  const [state, setState] = useState<CustomerDetailState>({
    loading: true,
    error: null,
    customer: null,
    orders: [],
    stats: emptyStats,
  })

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setState(prev => ({ ...prev, loading: false, error: 'No customer ID provided' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch customer, orders, and (owner-only) the all-time profit summary
      // in parallel. The items-summary RPC is server-gated: it returns NULL
      // profit for non-owners, so we only bother calling it for owners.
      const allTimeStart = '2000-01-01'
      const allTimeEnd = new Date().toISOString().split('T')[0]
      const [customerResult, ordersResult, itemsSummary, orderProfits] = await Promise.all([
        supabase
          .from('customers')
          .select('*, price_list:price_lists(id, name, is_active)')
          .eq('id', customerId)
          .single(),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            order_date,
            status,
            payment_method,
            subtotal,
            tax,
            discount,
            total,
            refund_amount,
            created_at,
            items:order_items(id, product_name, quantity, unit_type, unit_price, total)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        isOwner
          // Don't let a profit-summary failure break the whole page — fall
          // back to an empty set (profit shows as €0,00).
          ? fetchCustomerItemsSummary(customerId, allTimeStart, allTimeEnd).catch(() => [] as CustomerItemSummary[])
          : Promise.resolve([] as CustomerItemSummary[]),
        // Owner-only: per-order profit (refund-correct, server-gated). Non-owners
        // skip the call entirely so cost never reaches their browser.
        isOwner
          ? fetchCustomerOrders(customerId, allTimeStart, allTimeEnd).catch(() => [] as CustomerOrderProfit[])
          : Promise.resolve([] as CustomerOrderProfit[]),
      ])

      if (customerResult.error) throw customerResult.error
      if (ordersResult.error) throw ordersResult.error

      const customer = customerResult.data
      const rawOrders = ordersResult.data || []

      // Per-order profit lookup (owner-only; empty for non-owners).
      const profitByOrder = new Map<string, CustomerOrderProfit>()
      for (const p of orderProfits) profitByOrder.set(p.order_id, p)

      // Fetch documents for all orders
      const orderIds = rawOrders.map(o => o.id)
      let documents: Document[] = []

      if (orderIds.length > 0) {
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .in('order_id', orderIds)

        if (docsError) throw docsError
        documents = docsData || []
      }

      // Group documents by order
      const docsByOrder = new Map<string, Document[]>()
      for (const doc of documents) {
        if (!doc.order_id) continue
        const existing = docsByOrder.get(doc.order_id) || []
        existing.push(doc)
        docsByOrder.set(doc.order_id, existing)
      }

      // Transform orders with their documents
      const orders: CustomerOrder[] = rawOrders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        order_date: order.order_date || order.created_at?.split('T')[0],
        status: order.status,
        payment_method: order.payment_method,
        subtotal: Number(order.subtotal) || 0,
        tax: Number(order.tax) || 0,
        discount: Number(order.discount) || 0,
        total: Number(order.total) || 0,
        refund_amount: Number(order.refund_amount) || 0,
        created_at: order.created_at,
        profit: profitByOrder.get(order.id)?.profit ?? null,
        margin: profitByOrder.get(order.id)?.profit_margin ?? null,
        items: (order.items || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          product_name: item.product_name as string,
          quantity: Number(item.quantity) || 0,
          unit_type: (item.unit_type as string) || 'piece',
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.total) || 0,
        })),
        documents: docsByOrder.get(order.id) || [],
      }))

      // Calculate stats from completed orders
      const completedOrders = orders.filter(o =>
        o.status === 'completed' || o.status === 'delivered'
      )

      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
      const totalItems = completedOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
        0
      )

      const cashOrders = completedOrders.filter(o => o.payment_method === 'cash')
      const bankOrders = completedOrders.filter(o => o.payment_method === 'bank')

      // All-time profit + gross margin (owner only). Both the profit and its
      // revenue base come from the same RPC rows, so the margin is internally
      // consistent (computed on net-of-VAT line revenue, not the gross order
      // totals shown in the Revenue card).
      let totalProfit = 0
      let profitRevenue = 0
      for (const r of itemsSummary) {
        totalProfit += Number(r.total_profit) || 0
        profitRevenue += Number(r.total_revenue) || 0
      }
      const profitMargin = profitRevenue > 0
        ? Math.round((totalProfit / profitRevenue) * 1000) / 10
        : 0

      const stats: CustomerStats = {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        avgOrderValue: completedOrders.length > 0
          ? Math.round(totalRevenue / completedOrders.length)
          : 0,
        totalItems: Math.round(totalItems),
        totalProfit,
        profitMargin,
        paymentBreakdown: {
          cash: cashOrders.reduce((sum, o) => sum + o.total, 0),
          bank: bankOrders.reduce((sum, o) => sum + o.total, 0),
        },
      }

      setState({
        loading: false,
        error: null,
        customer,
        orders,
        stats,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load customer data',
      }))
    }
  }, [customerId, isOwner])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check if a document type exists for an order
  const hasDocument = useCallback(
    (orderId: string, docType: DocumentType): boolean => {
      const order = state.orders.find(o => o.id === orderId)
      if (!order) return false
      return order.documents.some(d => d.document_type === docType)
    },
    [state.orders]
  )

  // Get document for an order by type
  const getDocument = useCallback(
    (orderId: string, docType: DocumentType): Document | undefined => {
      const order = state.orders.find(o => o.id === orderId)
      if (!order) return undefined
      return order.documents.find(d => d.document_type === docType)
    },
    [state.orders]
  )

  return {
    ...state,
    refresh: fetchData,
    hasDocument,
    getDocument,
  }
}
