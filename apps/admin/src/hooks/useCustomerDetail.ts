import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { fetchOrders, type OrderWithItems } from '../services/orders'
import { fetchCustomerItemsSummary, fetchCustomerOrders, type CustomerItemSummary, type CustomerOrderProfit } from '../services/customers'
import { useAuth } from '../context/AuthContext'
import type { Customer } from '../types'

// Per-order profit shape consumed by OrdersTable.getProfit (owner-only).
export interface OrderProfitInfo {
  profit: number
  margin: number
  totalCost: number
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
  orders: OrderWithItems[]
  profitByOrder: Map<string, OrderProfitInfo>
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
    profitByOrder: new Map(),
    stats: emptyStats,
  })

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setState(prev => ({ ...prev, loading: false, error: 'No customer ID provided' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Customer, the customer's full orders (OrderWithItems incl. cost_cents so the
      // shared OrdersTable + OrderDetail can show line-item profit), and the two
      // owner-only profit RPCs in parallel. The RPCs are server-gated (NULL profit
      // for non-owners) and skipped entirely for non-owners.
      const allTimeStart = '2000-01-01'
      const allTimeEnd = new Date().toISOString().split('T')[0]
      const [customerResult, orders, itemsSummary, orderProfits] = await Promise.all([
        supabase
          .from('customers')
          .select('*, price_list:price_lists(id, name, is_active)')
          .eq('id', customerId)
          .single(),
        fetchOrders({ customerId, limit: 1000 }),
        isOwner
          ? fetchCustomerItemsSummary(customerId, allTimeStart, allTimeEnd).catch(() => [] as CustomerItemSummary[])
          : Promise.resolve([] as CustomerItemSummary[]),
        isOwner
          ? fetchCustomerOrders(customerId, allTimeStart, allTimeEnd).catch(() => [] as CustomerOrderProfit[])
          : Promise.resolve([] as CustomerOrderProfit[]),
      ])

      if (customerResult.error) throw customerResult.error
      const customer = customerResult.data

      // Refund-correct per-order profit lookup (owner-only; empty for non-owners).
      const profitByOrder = new Map<string, OrderProfitInfo>()
      for (const p of orderProfits) {
        if (p.profit != null) {
          profitByOrder.set(p.order_id, { profit: Number(p.profit), margin: Number(p.profit_margin ?? 0), totalCost: Number(p.total_cost) })
        }
      }

      // Stats from completed orders.
      const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered')
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
      const totalItems = completedOrders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
      const cashOrders = completedOrders.filter(o => o.payment_method === 'cash')
      const bankOrders = completedOrders.filter(o => o.payment_method === 'bank')

      // All-time profit + gross margin (owner only), from the same RPC rows so the margin is consistent.
      let totalProfit = 0
      let profitRevenue = 0
      for (const r of itemsSummary) {
        totalProfit += Number(r.total_profit) || 0
        profitRevenue += Number(r.total_revenue) || 0
      }
      const profitMargin = profitRevenue > 0 ? Math.round((totalProfit / profitRevenue) * 1000) / 10 : 0

      const stats: CustomerStats = {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        avgOrderValue: completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0,
        totalItems: Math.round(totalItems),
        totalProfit,
        profitMargin,
        paymentBreakdown: {
          cash: cashOrders.reduce((sum, o) => sum + o.total, 0),
          bank: bankOrders.reduce((sum, o) => sum + o.total, 0),
        },
      }

      setState({ loading: false, error: null, customer, orders, profitByOrder, stats })
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

  return {
    ...state,
    refresh: fetchData,
  }
}
