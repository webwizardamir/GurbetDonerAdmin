/**
 * StockAlerts - Low stock and zero stock product alerts.
 * Grouped into KRITIEK (red, stock = 0) and LAAG (amber, stock < threshold).
 * Owner sees cost value at risk. Max 10 items with link to products page.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Package, ExternalLink } from 'lucide-react'
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboard.stock.title')}
          </h3>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          {t('dashboard.viewProducts')}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
          {t('dashboard.allStockOk')}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Critical section */}
          {critical.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">
                {t('dashboard.stock.critical')} ({critical.length})
              </p>
              <div className="space-y-1">
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
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                {t('dashboard.stock.low')} ({low.length})
              </p>
              <div className="space-y-1">
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
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg ${
        isCritical
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-amber-50 dark:bg-amber-900/20'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {product.name}
        </p>
        <p className={`text-xs font-semibold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {product.currentStock} {product.unitType}
          {isOwner && product.costValue ? ` - ${formatPrice(product.costValue)}` : ''}
        </p>
      </div>
      <button
        onClick={() => navigate('/products')}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
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
