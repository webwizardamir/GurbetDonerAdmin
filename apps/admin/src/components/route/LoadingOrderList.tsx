import { useTranslation } from 'react-i18next'
import { PackageCheck } from 'lucide-react'
import type { PlannedStop } from '../../services/route'
import { formatQuantityWithUnit } from '../../utils/format'
import { formatPieceBreakdown } from '../../utils/catchWeight'

interface Props {
  loadingOrder: PlannedStop[]   // already reversed (last delivery first)
}

/**
 * Read-only truck loading list. The order is the reverse of the delivery
 * order: the last stop is loaded first (deepest), the first stop last (by the
 * doors). Manifests are expanded so the loader can see what to grab.
 */
export default function LoadingOrderList({ loadingOrder }: Props) {
  const { t } = useTranslation()
  const total = loadingOrder.length

  return (
    <div className="space-y-2">
      <div className="border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-r-lg">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <span className="font-semibold">{t('route.loadingOrder')} ({t('route.reverseOfDelivery')}).</span>{' '}
          {t('route.loadingBanner')}
        </p>
      </div>

      {loadingOrder.map((stop, i) => (
        <div key={stop.customerId} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-semibold flex items-center justify-center shrink-0 tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {stop.customerName}
                {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">{t('route.deepest')}</span>}
                {i === total - 1 && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">{t('route.byDoors')}</span>}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('route.deliveryStop')} <span className="font-medium text-green-600 dark:text-green-400">#{stop.sequence}</span>
              </p>
            </div>
            <PackageCheck className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
          </div>
          <ul className="mt-1.5 pl-9 divide-y divide-slate-100 dark:divide-slate-700/60">
            {stop.items.map((it, idx) => (
              <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1">
                <span className="text-sm text-slate-900 dark:text-white truncate">{it.productName}</span>
                <span className="text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                  {formatQuantityWithUnit(it.quantity, it.unitType, t)}
                  {formatPieceBreakdown(it) && (
                    <span className="ml-1 text-slate-400 dark:text-slate-500">({formatPieceBreakdown(it)})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
