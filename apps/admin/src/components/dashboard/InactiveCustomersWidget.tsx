import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserX, ChevronRight, Minus } from 'lucide-react'
import { useCustomerActivity } from '../../hooks/useCustomerActivity'
import { formatDate } from '../../utils/format'

const MINIMIZE_KEY = 'inactiveCustomersWidget:minimized'

/**
 * Dashboard counterpart to the morning Klantactiviteit email: the customers who
 * stopped ordering, in the same "chase work" band as the overdue money widget.
 * Amber rather than red on purpose — a quiet customer is a risk, not a failure.
 *
 * Mirrors OverdueWidget: renders nothing when there is nothing to chase, and
 * "minimize" lasts the session only, so it resurfaces the next time the app is
 * opened rather than being dismissable for good.
 */
export default function InactiveCustomersWidget() {
  const { t } = useTranslation()
  const { stats, loading } = useCustomerActivity()
  const [minimized, setMinimized] = useState(() => sessionStorage.getItem(MINIMIZE_KEY) === '1')

  const minimize = () => { sessionStorage.setItem(MINIMIZE_KEY, '1'); setMinimized(true) }
  const restore = () => { sessionStorage.removeItem(MINIMIZE_KEY); setMinimized(false) }

  if (loading || stats.dueCount === 0) return null

  const top = stats.due.slice(0, 5)

  if (minimized) {
    return (
      <button
        onClick={restore}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
          <UserX className="w-4 h-4" />
          {t('customerActivity.widget.minimizedBar', { count: stats.dueCount })}
        </span>
        <ChevronRight className="w-4 h-4 text-amber-500" />
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('customerActivity.widget.title')}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('customerActivity.widget.summary', { count: stats.dueCount, days: stats.longestQuiet })}
            </p>
          </div>
        </div>
        <button
          onClick={minimize}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700"
          title={t('overdue.widget.minimize')}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
        {top.map(row => (
          <li key={row.customer_id}>
            <Link
              to={`/customers/${row.customer_id}`}
              className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {row.company_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {row.last_order_date
                    ? t('customerActivity.widget.lastOrder', { date: formatDate(row.last_order_date) })
                    : t('customerActivity.never')}
                </p>
              </div>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
                {t('customerActivity.daysValue', { count: row.days_since })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/overdue?tab=activity"
        className="flex items-center justify-center gap-1 px-5 py-3 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700"
      >
        {t('customerActivity.widget.viewAll')}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
