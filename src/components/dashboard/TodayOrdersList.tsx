/**
 * TodayOrdersList - Today's orders with status progress bar and action/completed sections.
 * Shows a colored progress bar, "Actie Nodig" (non-completed) expanded,
 * "Voltooid" (completed) collapsed by default. Max 15 orders with "show more".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { formatPrice } from '../../utils/format'

interface OrderItem {
  id: string
  orderNumber: string
  customerName: string
  status: string
  total: number
}

interface TodayOrdersListProps {
  orders: OrderItem[] | null
  isOwner: boolean
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-400',
  pending_payment: 'bg-amber-500',
  on_hold: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
  refunded: 'bg-purple-400',
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-slate-400',
  pending_payment: 'bg-amber-500',
  on_hold: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
  refunded: 'bg-purple-400',
}

const VISIBLE_LIMIT = 15
const INITIAL_SHOW = 8

export default function TodayOrdersList({ orders, isOwner }: TodayOrdersListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showCompleted, setShowCompleted] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const allOrders = orders || []
  const actionOrders = allOrders.filter((o) => o.status !== 'completed')
  const completedOrders = allOrders.filter((o) => o.status === 'completed')

  // Status progress bar segments
  const total = allOrders.length
  const statusCounts: Record<string, number> = {}
  allOrders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('dashboard.todaysOrders')}
          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
            {total}
          </span>
        </h3>
        <button
          onClick={() => navigate('/orders')}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          {t('dashboard.viewAll')}
        </button>
      </div>

      {/* Status progress bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-slate-100 dark:bg-slate-700">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className={`${STATUS_COLORS[status] || 'bg-slate-400'}`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${status}: ${count}`}
            />
          ))}
        </div>
      )}

      {total === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">
          {t('dashboard.noOrdersToday')}
        </p>
      ) : (
        <>
          {/* Action Needed */}
          {actionOrders.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t('dashboard.orders.actionNeeded')} ({actionOrders.length})
              </p>
              <div className="space-y-1.5">
                {actionOrders.slice(0, showMore ? VISIBLE_LIMIT : INITIAL_SHOW).map((order) => (
                  <OrderRow key={order.id} order={order} isOwner={isOwner} navigate={navigate} />
                ))}
              </div>
            </div>
          )}

          {/* Completed - Collapsible */}
          {completedOrders.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('dashboard.orders.completed')} ({completedOrders.length})
              </button>
              {showCompleted && (
                <div className="space-y-1.5">
                  {completedOrders.slice(0, INITIAL_SHOW).map((order) => (
                    <OrderRow key={order.id} order={order} isOwner={isOwner} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Show more */}
          {allOrders.length > INITIAL_SHOW && !showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="w-full mt-3 text-xs text-center text-green-600 hover:text-green-700 font-medium py-1.5"
            >
              {t('dashboard.orders.showMore', { count: Math.min(allOrders.length, VISIBLE_LIMIT) - INITIAL_SHOW })}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function OrderRow({
  order,
  isOwner,
  navigate,
}: {
  order: OrderItem
  isOwner: boolean
  navigate: (path: string) => void
}) {
  return (
    <div
      onClick={() => navigate('/orders')}
      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[order.status] || 'bg-slate-400'}`} />
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {order.customerName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={order.status} />
        {isOwner && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatPrice(order.total)}
          </span>
        )}
        <Eye className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  )
}
