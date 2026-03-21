/**
 * StockAlerts - Low stock and zero stock product alerts.
 * Grouped into KRITIEK (red, stock = 0) and LAAG (amber, stock < threshold).
 * Owner sees cost value at risk. Max 10 items with link to products page.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Package, ExternalLink, CheckCircle2, ArrowRight } from 'lucide-react'
import { formatPrice } from '../../utils/format'

interface LowStockProduct {
  id: string
  name: string
  currentStock: number
  unitType: string
  costValue?: number
}

interface StockAlertsProps {
  lowStockProducts: LowStockProduct[] | null
  isOwner: boolean
}

const MAX_ITEMS = 10

export default function StockAlerts({ lowStockProducts, isOwner }: StockAlertsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const products = lowStockProducts || []
  const critical = products.filter((p) => p.currentStock === 0)
  const low = products.filter((p) => p.currentStock > 0)
  const totalAlerts = products.length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.stock.title')}
            </h3>
            {totalAlerts > 0 && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {totalAlerts}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            {t('dashboard.viewProducts')}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-green-500 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {t('dashboard.stock.allOk')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical section */}
            {critical.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                    {t('dashboard.stock.critical')}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {critical.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {critical.slice(0, MAX_ITEMS).map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isCritical
                      isOwner={isOwner}
                      navigate={navigate}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low section */}
            {low.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                    {t('dashboard.stock.low')}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {low.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {low.slice(0, MAX_ITEMS - critical.length).map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isCritical={false}
                      isOwner={isOwner}
                      navigate={navigate}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Overflow indicator */}
            {products.length > MAX_ITEMS && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-1">
                +{products.length - MAX_ITEMS} {t('dashboard.stock.more')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  isCritical,
  isOwner,
  navigate,
  t,
}: {
  product: LowStockProduct
  isCritical: boolean
  isOwner: boolean
  navigate: (path: string) => void
  t: (key: string) => string
}) {
  // Stock level bar: for critical=0%, for low show proportional (assume threshold ~20)
  const stockPercent = isCritical ? 0 : Math.min((product.currentStock / 20) * 100, 100)

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
        isCritical
          ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10'
          : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
      }`}
      onClick={() => navigate('/products')}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-full">
          {product.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-xs font-semibold truncate ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {product.currentStock} {product.unitType}
            {isOwner && product.costValue ? ` - ${formatPrice(product.costValue)}` : ''}
          </p>
        </div>
        {/* Stock level bar */}
        <div className="mt-1.5 w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); navigate('/products') }}
        className={`flex-shrink-0 ml-3 p-2 rounded-lg transition-colors ${
          isCritical
            ? 'hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400'
            : 'hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-500 dark:text-amber-400'
        }`}
        aria-label={t('common.view')}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
