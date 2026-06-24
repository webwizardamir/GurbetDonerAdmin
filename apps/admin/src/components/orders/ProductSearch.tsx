// Product search and add section for the order form.
// Includes text search and barcode scanning button with product results dropdown.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Loader2, Package, ScanBarcode } from 'lucide-react'
import type { Product } from '../../types'
import { formatPrice } from '../../utils/format'

interface ProductSearchProps {
  products: Product[]
  productsLoading: boolean
  loadingPrices: boolean
  onAddProduct: (product: Product) => void
  onOpenScanner: () => void
  /** When provided, override the displayed price per product (customer-aware
   *  resolver). Falls back to product.base_price when undefined. */
  getDisplayPrice?: (product: Product) => number
  /** When provided, only products with these IDs are searchable. Used when
   *  the selected customer is on a price list — only listed products appear. */
  allowedProductIds?: Set<string> | null
  /** Note shown under the search input when the picker is scoped to a list. */
  scopeNote?: string
}

export default function ProductSearch({
  products,
  productsLoading,
  loadingPrices,
  onAddProduct,
  onOpenScanner,
  getDisplayPrice,
  allowedProductIds,
  scopeNote,
}: ProductSearchProps) {
  const { t } = useTranslation()
  const [productSearch, setProductSearch] = useState('')

  const filteredProducts = products.filter(p => {
    if (allowedProductIds && !allowedProductIds.has(p.id)) return false
    if (!productSearch) return true
    const query = productSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    )
  })

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {t('orders.form.addProducts')}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder={t('orders.form.searchProducts')}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="button"
          onClick={onOpenScanner}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          title={t('scanner.scanBarcode')}
        >
          <ScanBarcode className="w-5 h-5" />
          <span className="hidden sm:inline">{t('scanner.scanBarcode')}</span>
        </button>
      </div>
      {scopeNote && (
        <p className="mt-1.5 text-xs text-purple-700 dark:text-purple-400">{scopeNote}</p>
      )}
      {productSearch && (
        <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
          {productsLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
              {t('orders.form.noProductsFound')}
            </p>
          ) : (
            filteredProducts.slice(0, 10).map(product => (
              <button
                key={product.id}
                onClick={() => {
                  onAddProduct(product)
                  setProductSearch('')
                }}
                disabled={loadingPrices}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {formatPrice(getDisplayPrice ? getDisplayPrice(product) : product.base_price)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
