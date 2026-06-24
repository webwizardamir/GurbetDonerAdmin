/** TodayOrdersList - Today's orders with status progress bar and grouped sections. */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Eye, ShoppingCart, ArrowRight } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { formatPrice } from '../../utils/format'

interface OrderItem { id: string; orderNumber: string; customerName: string; status: string; total: number }
interface TodayOrdersListProps { orders: OrderItem[] | null; isOwner: boolean }

const SC: Record<string, string> = {
  draft: 'bg-slate-400', pending_payment: 'bg-amber-500', on_hold: 'bg-blue-500',
  completed: 'bg-green-500', cancelled: 'bg-red-400', refunded: 'bg-purple-400',
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

  const total = allOrders.length
  const statusCounts: Record<string, number> = {}
  allOrders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {t('dashboard.todaysOrders')}
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
              {total}
            </span>
          </h3>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            {t('dashboard.viewAll')}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Status progress bar */}
        {total > 0 && (
          <div className="mb-4">
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className={`${SC[status] || 'bg-slate-400'} rounded-full first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                  style={{ width: `${(count / total) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                  title={`${status}: ${count}`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${SC[status] || 'bg-slate-400'}`} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {t('dashboard.noOrdersToday')}
            </p>
          </div>
        ) : (
          <>
            {/* Action Needed */}
            {actionOrders.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                    {t('dashboard.orders.actionNeeded')}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {actionOrders.length}
                  </span>
                </div>
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
                  className="flex items-center gap-2 mb-2.5 group"
                >
                  {showCompleted ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    {t('dashboard.orders.completed')}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {completedOrders.length}
                  </span>
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
                className="w-full mt-3 text-xs font-semibold text-green-600 dark:text-green-400 py-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                {t('dashboard.orders.showMore', { count: Math.min(allOrders.length, VISIBLE_LIMIT) - INITIAL_SHOW })}
              </button>
            )}
          </>
        )}
      </div>
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
      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:translate-x-0.5 transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SC[order.status] || 'bg-slate-400'}`} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {order.customerName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        <span className="hidden sm:inline"><StatusBadge status={order.status} /></span>
        <span className={`sm:hidden w-2 h-2 rounded-full flex-shrink-0 ${SC[order.status] || 'bg-slate-400'}`} />
        {isOwner && (
          <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
            {formatPrice(order.total)}
          </span>
        )}
        <Eye className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors hidden sm:block" />
      </div>
    </div>
  )
}
