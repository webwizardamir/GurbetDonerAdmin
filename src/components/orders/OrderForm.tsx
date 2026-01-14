import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Loader2,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Building2,
  Package,
  ScanBarcode,
} from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import { useProducts } from '../../hooks/useProducts'
import { useOrders } from '../../hooks/useOrders'
import { getEffectivePrice } from '../../services/pricing'
import BarcodeScanner from './BarcodeScanner'
import type { Customer, Product } from '../../types'
import { formatPrice } from '../../utils/format'

interface OrderFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface OrderLineItem {
  product: Product
  quantity: number
  unit_price: number // cents
  tax_rate: number
}

export default function OrderForm({ onClose, onSuccess }: OrderFormProps) {
  const { t } = useTranslation()
  const { customers, loading: customersLoading } = useCustomers()
  const { products, loading: productsLoading } = useProducts()
  const { create } = useOrders()

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [items, setItems] = useState<OrderLineItem[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Filter customers by search
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true
    const query = customerSearch.toLowerCase()
    return (
      c.company_name.toLowerCase().includes(query) ||
      c.contact_person?.toLowerCase().includes(query)
    )
  })

  // Filter products by search
  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const query = productSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    )
  })

  // Add product to order
  const addProduct = async (product: Product) => {
    // Check if already in order
    const existing = items.find(i => i.product.id === product.id)
    if (existing) {
      setItems(items.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ))
      return
    }

    // Get effective price for customer
    setLoadingPrices(true)
    try {
      let price = product.base_price
      if (selectedCustomer) {
        price = await getEffectivePrice(selectedCustomer.id, product.id)
      }

      setItems([...items, {
        product,
        quantity: 1,
        unit_price: price,
        tax_rate: product.tax_rate,
      }])
    } catch (err) {
      console.error('Error getting price:', err)
      // Fall back to base price
      setItems([...items, {
        product,
        quantity: 1,
        unit_price: product.base_price,
        tax_rate: product.tax_rate,
      }])
    } finally {
      setLoadingPrices(false)
    }
  }

  // Update item quantity by delta (+/-)
  const updateQuantity = (productId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.product.id !== productId) return i
      // Round to 3 decimal places to avoid floating point issues
      const newQty = Math.round(Math.max(0, i.quantity + delta) * 1000) / 1000
      return { ...i, quantity: newQty }
    }).filter(i => i.quantity > 0))
  }

  // Set item quantity directly
  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    // Round to 3 decimal places
    const roundedQty = Math.round(quantity * 1000) / 1000
    setItems(items.map(i =>
      i.product.id === productId ? { ...i, quantity: roundedQty } : i
    ))
  }

  // Remove item
  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product.id !== productId))
  }

  // Update prices when customer changes
  useEffect(() => {
    if (!selectedCustomer || items.length === 0) return

    const updatePrices = async () => {
      setLoadingPrices(true)
      try {
        const updatedItems = await Promise.all(
          items.map(async item => {
            const price = await getEffectivePrice(selectedCustomer.id, item.product.id)
            return { ...item, unit_price: price }
          })
        )
        setItems(updatedItems)
      } catch (err) {
        console.error('Error updating prices:', err)
      } finally {
        setLoadingPrices(false)
      }
    }

    updatePrices()
  }, [selectedCustomer?.id])

  // Calculate totals
  const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)
  const taxTotal = items.reduce((sum, i) => {
    const lineSubtotal = i.unit_price * i.quantity
    return sum + Math.round(lineSubtotal * (i.tax_rate / 100))
  }, 0)
  const total = subtotal + taxTotal

  // Submit order
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError(t('orders.form.selectCustomerError'))
      return
    }
    if (items.length === 0) {
      setError(t('orders.form.addProductError'))
      return
    }

    setSaving(true)
    setError(null)

    try {
      await create(
        {
          customer_id: selectedCustomer.id,
          order_date: orderDate,
          delivery_notes: deliveryNotes || undefined,
          internal_notes: internalNotes || undefined,
        },
        items.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          product_sku: i.product.sku,
          unit_type: i.product.unit_type,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_rate: i.tax_rate,
        }))
      )
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.form.createError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('orders.newOrder')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer & Products */}
            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('orders.customer')} <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {selectedCustomer.company_name}
                        </p>
                        {selectedCustomer.contact_person && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedCustomer.contact_person}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder={t('orders.form.searchCustomers')}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                      {customersLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                          {t('orders.form.noCustomersFound')}
                        </p>
                      ) : (
                        filteredCustomers.slice(0, 10).map(customer => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setCustomerSearch('')
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <p className="font-medium text-slate-900 dark:text-white">
                              {customer.company_name}
                            </p>
                            {customer.contact_person && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {customer.contact_person}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('orders.orderDate')}
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Product Search */}
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
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    title={t('scanner.scanBarcode')}
                  >
                    <ScanBarcode className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('scanner.scanBarcode')}</span>
                  </button>
                </div>
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
                            addProduct(product)
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
                            {formatPrice(product.base_price)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Order Items & Summary */}
            <div className="space-y-6">
              {/* Order Items */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('orders.orderItems')} ({items.length})
                </label>
                {items.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                    <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('orders.form.searchAndAdd')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {items.map(item => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {formatPrice(item.unit_price)} × {item.quantity} = {formatPrice(item.unit_price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            title="-1"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={item.quantity}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              if (val > 0) setQuantity(item.product.id, val)
                            }}
                            onBlur={e => {
                              const val = parseFloat(e.target.value) || 0
                              if (val <= 0) removeItem(item.product.id)
                            }}
                            className="w-16 text-center font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            title="+1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              {items.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t('orders.subtotal')}</span>
                    <span className="text-slate-900 dark:text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t('orders.tax')}</span>
                    <span className="text-slate-900 dark:text-white">{formatPrice(taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span className="text-slate-900 dark:text-white">{t('orders.total')}</span>
                    <span className="text-green-600 dark:text-green-400">{formatPrice(total)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('orders.form.deliveryNotes')}
                  </label>
                  <textarea
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder={t('orders.form.deliveryPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('orders.form.internalNotes')}
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder={t('orders.form.internalPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedCustomer || items.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('orders.form.creating')}
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                {t('orders.newOrder')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onProductFound={(product) => {
          addProduct(product)
        }}
      />
    </div>
  )
}
