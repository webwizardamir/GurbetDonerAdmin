import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronRight, Minus, Bell } from 'lucide-react'
import { useOverdueInvoices } from '../../hooks/useOverdueInvoices'
import { formatPrice } from '../../utils/format'

const MINIMIZE_KEY = 'overdueWidget:minimized'

/**
 * Persistent dashboard widget surfacing overdue invoices so admins focus on
 * chasing payments. "Minimize" is per-session (sessionStorage) — the data
 * resurfaces on the next app open. Authoritative snooze lives in the DB and is
 * managed from the Overdue invoices page.
 */
export default function OverdueWidget() {
  const { t } = useTranslation()
  const { active, loading } = useOverdueInvoices()
  // Minimize persists for the session only, so it resurfaces next open.
  const [minimized, setMinimized] = useState(() => sessionStorage.getItem(MINIMIZE_KEY) === '1')

  const minimize = () => { sessionStorage.setItem(MINIMIZE_KEY, '1'); setMinimized(true) }
  const restore = () => { sessionStorage.removeItem(MINIMIZE_KEY); setMinimized(false) }

  if (loading || active.length === 0) return null

  const total = active.reduce((sum, i) => sum + i.total, 0)
  const top = active.slice(0, 5)

  if (minimized) {
    return (
      <button
        onClick={restore}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-left hover:bg-red-100/70 dark:hover:bg-red-900/30 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
          <Bell className="w-4 h-4" />
          {t('overdue.widget.minimizedBar', { count: active.length, total: formatPrice(total) })}
        </span>
        <ChevronRight className="w-4 h-4 text-red-500" />
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('overdue.widget.title')}
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400">
              {t('overdue.widget.summary', { count: active.length, total: formatPrice(total) })}
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
        {top.map(inv => (
          <li key={inv.order_id}>
            <Link
              to="/overdue"
              className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {inv.customer_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {inv.invoice_number || inv.order_number} · {t('overdue.daysLabel', { count: inv.days_overdue })}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white shrink-0">
                {formatPrice(inv.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/overdue"
        className="flex items-center justify-center gap-1 px-5 py-3 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700"
      >
        {t('overdue.widget.viewAll')}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
