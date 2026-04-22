import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2, ShoppingCart, Pencil, Package } from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import { useProducts } from '../../hooks/useProducts'
import { useOrders } from '../../hooks/useOrders'
import { getEffectivePrice, getAvailableUnitPricesForCustomer } from '../../services/pricing'
import BarcodeScanner from './BarcodeScanner'
import CustomerSelect from './CustomerSelect'
import ProductSearch from './ProductSearch'
import OrderItemsList from './OrderItemsList'
import type { Customer, Product, UnitType, ProductUnitPrice } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import { formatPrice } from '../../utils/format'

interface OrderFormProps {
  onClose: () => void
  onSuccess: () => void
  editOrder?: OrderWithItems
}

interface OrderLineItem {
  lineId: string
  product: Product
  selectedUnitType: UnitType
  quantity: number
  unit_price: number
  tax_rate: number
  availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
}

export default function OrderForm({ onClose, onSuccess, editOrder }: OrderFormProps) {
  const { t } = useTranslation()
  // Large pageSize so the customer picker sees ALL customers, not just page 1
  const { customers, loading: customersLoading } = useCustomers({ pageSize: 5000 })
  // Large pageSize so the product picker sees ALL products, not just page 1
  const { products, loading: productsLoading } = useProducts({}, 5000)
  const { create, updateWithItems } = useOrders()

  const isEditMode = !!editOrder

  // Escape key to close and lock body scroll
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = original
    }
  }, [onClose])

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<OrderLineItem[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [unitTypeSelector, setUnitTypeSelector] = useState<{
    product: Product
    availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
  } | null>(null)

  const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const getProductUnitTypes = (product: Product): { unitType: UnitType; price: number; isDefault: boolean }[] => {
    if (product.unit_prices && product.unit_prices.length > 0) {
      return product.unit_prices
        .filter((up: ProductUnitPrice) => up.price !== null)
        .map((up: ProductUnitPrice) => ({ unitType: up.unit_type, price: up.price!, isDefault: up.is_default }))
        .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
    }
    return [{ unitType: product.unit_type, price: product.base_price, isDefault: true }]
  }

  // Initialize form with existing order data in edit mode
  useEffect(() => {
    if (!editOrder || initialized || customersLoading || productsLoading) return
    const customer = customers.find(c => c.id === editOrder.customer_id)
    if (customer) setSelectedCustomer(customer)
    setOrderDate(editOrder.order_date || new Date().toISOString().split('T')[0])
    setDeliveryNotes(editOrder.delivery_notes || '')
    setInternalNotes(editOrder.internal_notes || '')
    if (editOrder.items && editOrder.items.length > 0) {
      const loadedItems: OrderLineItem[] = editOrder.items.map(item => {
        const product = products.find(p => p.id === item.product_id)
        let availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[] = []
        if (product?.unit_prices && product.unit_prices.length > 0) {
          availableUnitTypes = product.unit_prices
            .filter((up: ProductUnitPrice) => up.price !== null)
            .map((up: ProductUnitPrice) => ({ unitType: up.unit_type, price: up.price!, isDefault: up.is_default }))
        } else if (product) {
          availableUnitTypes = [{ unitType: product.unit_type, price: product.base_price, isDefault: true }]
        } else {
          availableUnitTypes = [{ unitType: item.unit_type as UnitType, price: item.unit_price, isDefault: true }]
        }
        return {
          lineId: generateLineId(),
          product: product || {
            id: item.product_id, name: item.product_name, sku: item.product_sku || '', barcode: '',
            category_id: undefined, unit_type: item.unit_type as UnitType, base_price: item.unit_price,
            cost_cents: 0, tax_rate: item.tax_rate, stock_quantity: 0, track_stock: false,
            description: '', is_active: true, created_by: '', created_at: '', updated_at: '',
          },
          selectedUnitType: item.unit_type as UnitType,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          availableUnitTypes,
        }
      })
      setItems(loadedItems)
    }
    setInitialized(true)
  }, [editOrder, customers, products, customersLoading, productsLoading, initialized])

  // Add product with specific unit type
  const addProductWithUnitType = (
    product: Product, unitType: UnitType, price: number,
    availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
  ) => {
    const existingIndex = items.findIndex(i => i.product.id === product.id && i.selectedUnitType === unitType)
    if (existingIndex >= 0) {
      setItems(items.map((i, idx) => idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, { lineId: generateLineId(), product, selectedUnitType: unitType, quantity: 1, unit_price: price, tax_rate: product.tax_rate, availableUnitTypes }])
    }
  }

  const addProduct = async (product: Product) => {
    setLoadingPrices(true)
    try {
      let availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
      if (selectedCustomer) {
        availableUnitTypes = await getAvailableUnitPricesForCustomer(selectedCustomer.id, product.id)
      } else {
        availableUnitTypes = getProductUnitTypes(product)
      }
      if (availableUnitTypes.length === 0) availableUnitTypes = getProductUnitTypes(product)
      if (availableUnitTypes.length > 1) { setUnitTypeSelector({ product, availableUnitTypes }); return }
      const defaultUnit = availableUnitTypes[0]
      addProductWithUnitType(product, defaultUnit.unitType, defaultUnit.price, availableUnitTypes)
    } catch {
      const unitTypes = getProductUnitTypes(product)
      if (unitTypes.length > 1) { setUnitTypeSelector({ product, availableUnitTypes: unitTypes }); return }
      const defaultUnit = unitTypes[0]
      addProductWithUnitType(product, defaultUnit.unitType, defaultUnit.price, unitTypes)
    } finally {
      setLoadingPrices(false)
    }
  }

  const handleUnitTypeSelect = (unitType: UnitType) => {
    if (!unitTypeSelector) return
    const { product, availableUnitTypes } = unitTypeSelector
    const selectedUnit = availableUnitTypes.find(ut => ut.unitType === unitType)
    if (selectedUnit) addProductWithUnitType(product, selectedUnit.unitType, selectedUnit.price, availableUnitTypes)
    setUnitTypeSelector(null)
  }

  const changeUnitType = async (lineId: string, newUnitType: UnitType) => {
    const item = items.find(i => i.lineId === lineId)
    if (!item) return
    const unitTypeInfo = item.availableUnitTypes.find(ut => ut.unitType === newUnitType)
    if (!unitTypeInfo) return
    const existingLine = items.find(i => i.lineId !== lineId && i.product.id === item.product.id && i.selectedUnitType === newUnitType)
    if (existingLine) {
      setItems(items.map(i => i.lineId === existingLine.lineId ? { ...i, quantity: i.quantity + item.quantity } : i).filter(i => i.lineId !== lineId))
    } else {
      setItems(items.map(i => i.lineId === lineId ? { ...i, selectedUnitType: newUnitType, unit_price: unitTypeInfo.price } : i))
    }
  }

  const updateQuantity = (lineId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.lineId !== lineId) return i
      const newQty = Math.round(Math.max(0, i.quantity + delta) * 1000) / 1000
      return { ...i, quantity: newQty }
    }).filter(i => i.quantity > 0))
  }

  const setQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(lineId); return }
    const roundedQty = Math.round(quantity * 1000) / 1000
    setItems(items.map(i => i.lineId === lineId ? { ...i, quantity: roundedQty } : i))
  }

  const removeItem = (lineId: string) => setItems(items.filter(i => i.lineId !== lineId))

  // Update prices when customer changes
  useEffect(() => {
    if (!selectedCustomer || items.length === 0) return
    const updatePrices = async () => {
      setLoadingPrices(true)
      try {
        const updatedItems = await Promise.all(
          items.map(async item => {
            const availableUnitTypes = await getAvailableUnitPricesForCustomer(selectedCustomer.id, item.product.id)
            if (availableUnitTypes.length > 0) {
              const currentUnitInfo = availableUnitTypes.find(ut => ut.unitType === item.selectedUnitType)
              if (currentUnitInfo) return { ...item, unit_price: currentUnitInfo.price, availableUnitTypes }
              const defaultUnit = availableUnitTypes.find(ut => ut.isDefault) || availableUnitTypes[0]
              return { ...item, selectedUnitType: defaultUnit.unitType, unit_price: defaultUnit.price, availableUnitTypes }
            }
            const price = await getEffectivePrice(selectedCustomer.id, item.product.id, item.selectedUnitType)
            return { ...item, unit_price: price }
          })
        )
        const mergedItems: OrderLineItem[] = []
        for (const item of updatedItems) {
          const existingIdx = mergedItems.findIndex(i => i.product.id === item.product.id && i.selectedUnitType === item.selectedUnitType)
          if (existingIdx >= 0) { mergedItems[existingIdx] = { ...mergedItems[existingIdx], quantity: mergedItems[existingIdx].quantity + item.quantity } }
          else { mergedItems.push(item) }
        }
        setItems(mergedItems)
      } catch (err) { console.error('Error updating prices:', err) }
      finally { setLoadingPrices(false) }
    }
    updatePrices()
  }, [selectedCustomer?.id])

  const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)
  const taxTotal = items.reduce((sum, i) => sum + Math.round(i.unit_price * i.quantity * (i.tax_rate / 100)), 0)
  const total = subtotal + taxTotal

  const handleSubmit = async () => {
    if (!selectedCustomer) { setError(t('orders.form.selectCustomerError')); return }
    if (items.length === 0) { setError(t('orders.form.addProductError')); return }
    setSaving(true)
    setError(null)
    try {
      const orderData = {
        customer_id: selectedCustomer.id, order_date: orderDate,
        delivery_notes: deliveryNotes || undefined, internal_notes: internalNotes || undefined,
      }
      const itemsData = items.map(i => {
        const unitPriceCost = i.product.unit_prices?.find(up => up.unit_type === i.selectedUnitType)?.cost_cents
        return {
          product_id: i.product.id, product_name: i.product.name, product_sku: i.product.sku,
          unit_type: i.selectedUnitType, quantity: i.quantity, unit_price: i.unit_price,
          cost_cents: unitPriceCost ?? i.product.cost_cents ?? 0, tax_rate: i.tax_rate,
        }
      })
      if (isEditMode && editOrder) { await updateWithItems(editOrder.id, orderData, itemsData) }
      else { await create(orderData, itemsData) }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? t('orders.form.updateError') : t('orders.form.createError'))
    } finally { setSaving(false) }
  }

  const getUnitTypeLabel = (unitType: UnitType): string => t(`products.form.unitTypes.${unitType}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEditMode ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              {isEditMode ? <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditMode ? t('orders.editOrder') : t('orders.newOrder')}
              {isEditMode && editOrder && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">({editOrder.order_number})</span>
              )}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <CustomerSelect
                selectedCustomer={selectedCustomer}
                customers={customers}
                customersLoading={customersLoading}
                onSelect={setSelectedCustomer}
                onClear={() => setSelectedCustomer(null)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('orders.orderDate')}</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <ProductSearch
                products={products}
                productsLoading={productsLoading}
                loadingPrices={loadingPrices}
                onAddProduct={addProduct}
                onOpenScanner={() => setShowScanner(true)}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <OrderItemsList
                items={items}
                subtotal={subtotal}
                taxTotal={taxTotal}
                total={total}
                onUpdateQuantity={updateQuantity}
                onSetQuantity={setQuantity}
                onRemoveItem={removeItem}
                onChangeUnitType={changeUnitType}
                onSetPrice={(lineId, priceInCents) => {
                  setItems(prev => prev.map(item =>
                    item.lineId === lineId ? { ...item, unit_price: priceInCents } : item
                  ))
                }}
              />
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('orders.form.deliveryNotes')}</label>
                  <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder={t('orders.form.deliveryPlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('orders.form.internalNotes')}</label>
                  <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder={t('orders.form.internalPlaceholder')} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={saving || !selectedCustomer || items.length === 0}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-colors ${isEditMode ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400' : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'}`}>
            {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />{isEditMode ? t('orders.form.updating') : t('orders.form.creating')}</>)
              : (<>{isEditMode ? <Pencil className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}{isEditMode ? t('orders.form.saveChanges') : t('orders.newOrder')}</>)}
          </button>
        </div>
      </div>

      <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onProductFound={addProduct} />

      {/* Unit Type Selector Modal */}
      {unitTypeSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUnitTypeSelector(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">{unitTypeSelector.product.name}</h3>
              <button onClick={() => setUnitTypeSelector(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('orders.form.selectUnitType')}</p>
            <div className="space-y-2">
              {unitTypeSelector.availableUnitTypes.map(ut => {
                const existingItem = items.find(i => i.product.id === unitTypeSelector.product.id && i.selectedUnitType === ut.unitType)
                return (
                  <button key={ut.unitType} onClick={() => handleUnitTypeSelect(ut.unitType)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">{getUnitTypeLabel(ut.unitType)}</span>
                      {ut.isDefault && <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{t('common.default')}</span>}
                      {existingItem && <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">{t('orders.form.inCart', { qty: existingItem.quantity })}</span>}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">{formatPrice(ut.price)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
