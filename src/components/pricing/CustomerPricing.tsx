import { useState } from 'react'
import {
  X,
  Loader2,
  DollarSign,
  Search,
  Check,
  RotateCcw,
  History,
} from 'lucide-react'
import { useCustomerPricing, type ProductWithPrice } from '../../hooks/usePricing'
import type { Customer } from '../../types'
import PriceHistoryModal from './PriceHistoryModal'

interface CustomerPricingProps {
  customer: Customer
  onClose: () => void
}

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export default function CustomerPricing({ customer, onClose }: CustomerPricingProps) {
  const {
    customerPrices,
    productsWithPrices,
    loading,
    error,
    setPrice,
    removePrice,
  } = useCustomerPricing(customer.id)

  const [searchQuery, setSearchQuery] = useState('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyPriceId, setHistoryPriceId] = useState<string | null>(null)

  // Filter products by search
  const filteredProducts = productsWithPrices.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    )
  })

  const handleEditClick = (product: ProductWithPrice) => {
    setEditingProductId(product.id)
    setEditPrice((product.effective_price / 100).toFixed(2))
  }

  const handleSavePrice = async (product: ProductWithPrice) => {
    const priceInCents = Math.round(parseFloat(editPrice) * 100)
    if (isNaN(priceInCents) || priceInCents < 0) return

    try {
      setSaving(true)
      await setPrice(product.id, priceInCents)
      setEditingProductId(null)
    } catch {
      // Error handled by hook
    } finally {
      setSaving(false)
    }
  }

  const handleResetPrice = async (product: ProductWithPrice) => {
    // Find the customer price ID to delete
    const customerPrice = customerPrices.find(cp => cp.product_id === product.id)
    if (!customerPrice) return

    if (!confirm(`Reset price to base price (${formatPrice(product.base_price)})?`)) return

    try {
      setSaving(true)
      await removePrice(customerPrice.id)
    } catch {
      // Error handled by hook
    } finally {
      setSaving(false)
    }
  }

  const handleShowHistory = (product: ProductWithPrice) => {
    const customerPrice = customerPrices.find(cp => cp.product_id === product.id)
    if (customerPrice) {
      setHistoryPriceId(customerPrice.id)
    }
  }

  const handleCancelEdit = () => {
    setEditingProductId(null)
    setEditPrice('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Custom Pricing
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {customer.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No products found matching your search' : 'No products available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    product.has_custom_price
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {product.name}
                      </span>
                      {product.has_custom_price && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <span>Base: {formatPrice(product.base_price)}</span>
                    </div>
                  </div>

                  {/* Price / Edit */}
                  <div className="flex items-center gap-3">
                    {editingProductId === product.id ? (
                      <>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                            &euro;
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="w-28 pl-8 pr-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSavePrice(product)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleSavePrice(product)}
                          disabled={saving}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                          title="Save"
                        >
                          {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Check className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(product)}
                          className="px-4 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                        >
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatPrice(product.effective_price)}
                          </span>
                        </button>
                        {product.has_custom_price && (
                          <>
                            <button
                              onClick={() => handleShowHistory(product)}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                              title="View history"
                            >
                              <History className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleResetPrice(product)}
                              className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                              title="Reset to base price"
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              {customerPrices.length} custom price{customerPrices.length !== 1 ? 's' : ''} set
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Price History Modal */}
      {historyPriceId && (
        <PriceHistoryModal
          customerPriceId={historyPriceId}
          onClose={() => setHistoryPriceId(null)}
        />
      )}
    </div>
  )
}
