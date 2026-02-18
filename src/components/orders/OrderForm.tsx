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
  Pencil,
} from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import { useProducts } from '../../hooks/useProducts'
import { useOrders } from '../../hooks/useOrders'
import { getEffectivePrice, getAvailableUnitPricesForCustomer } from '../../services/pricing'
import BarcodeScanner from './BarcodeScanner'
import type { Customer, Product, UnitType, ProductUnitPrice } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import { formatPrice } from '../../utils/format'

interface OrderFormProps {
  onClose: () => void
  onSuccess: () => void
  editOrder?: OrderWithItems // Optional order for edit mode
}

interface OrderLineItem {
  lineId: string // Unique identifier for this line item
  product: Product
  selectedUnitType: UnitType
  quantity: number
  unit_price: number // cents
  tax_rate: number
  availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
}

export default function OrderForm({ onClose, onSuccess, editOrder }: OrderFormProps) {
  const { t } = useTranslation()
  const { customers, loading: customersLoading } = useCustomers()
  const { products, loading: productsLoading } = useProducts()
  const { create, updateWithItems } = useOrders()

  const isEditMode = !!editOrder

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
  const [initialized, setInitialized] = useState(false)

  // Unit type selector state (for products with multiple unit types)
  const [unitTypeSelector, setUnitTypeSelector] = useState<{
    product: Product
    availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
  } | null>(null)

  const getUnitTypeLabel = (unitType: UnitType): string => {
    return t(`products.form.unitTypes.${unitType}`)
  }

  // Initialize form with existing order data in edit mode
  useEffect(() => {
    if (!editOrder || initialized || customersLoading || productsLoading) return

    // Set customer
    const customer = customers.find(c => c.id === editOrder.customer_id)
    if (customer) {
      setSelectedCustomer(customer)
    }

    // Set order fields
    setOrderDate(editOrder.order_date || new Date().toISOString().split('T')[0])
    setDeliveryNotes(editOrder.delivery_notes || '')
    setInternalNotes(editOrder.internal_notes || '')

    // Set items
    if (editOrder.items && editOrder.items.length > 0) {
      const loadedItems: OrderLineItem[] = editOrder.items.map(item => {
        // Find the product in the products list
        const product = products.find(p => p.id === item.product_id)

        // Get available unit types from product
        let availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[] = []
        if (product?.unit_prices && product.unit_prices.length > 0) {
          availableUnitTypes = product.unit_prices
            .filter((up: ProductUnitPrice) => up.price !== null)
            .map((up: ProductUnitPrice) => ({
              unitType: up.unit_type,
              price: up.price!,
              isDefault: up.is_default,
            }))
        } else if (product) {
          availableUnitTypes = [{ unitType: product.unit_type, price: product.base_price, isDefault: true }]
        } else {
          // If product not found, use the item's unit type
          availableUnitTypes = [{ unitType: item.unit_type as UnitType, price: item.unit_price, isDefault: true }]
        }

        return {
          lineId: generateLineId(),
          product: product || {
            id: item.product_id,
            name: item.product_name,
            sku: item.product_sku || '',
            barcode: '',
            category_id: undefined,
            unit_type: item.unit_type as UnitType,
            base_price: item.unit_price,
            cost_cents: 0,
            tax_rate: item.tax_rate,
            stock_quantity: 0,
            track_stock: false,
            description: '',
            is_active: true,
            created_by: '',
            created_at: '',
            updated_at: '',
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

  // Get available unit types from product
  const getProductUnitTypes = (product: Product): { unitType: UnitType; price: number; isDefault: boolean }[] => {
    if (product.unit_prices && product.unit_prices.length > 0) {
      return product.unit_prices
        .filter((up: ProductUnitPrice) => up.price !== null)
        .map((up: ProductUnitPrice) => ({
          unitType: up.unit_type,
          price: up.price!,
          isDefault: up.is_default,
        }))
        .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
    }
    // Fallback to single unit type
    return [{ unitType: product.unit_type, price: product.base_price, isDefault: true }]
  }

  // Generate unique line ID
  const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add product with specific unit type
  const addProductWithUnitType = (
    product: Product,
    unitType: UnitType,
    price: number,
    availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
  ) => {
    // Check if product with same unit type already exists
    const existingIndex = items.findIndex(
      i => i.product.id === product.id && i.selectedUnitType === unitType
    )

    if (existingIndex >= 0) {
      // Increment quantity for existing item with same product + unit type
      setItems(items.map((i, idx) =>
        idx === existingIndex
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ))
    } else {
      // Add new line item
      setItems([...items, {
        lineId: generateLineId(),
        product,
        selectedUnitType: unitType,
        quantity: 1,
        unit_price: price,
        tax_rate: product.tax_rate,
        availableUnitTypes,
      }])
    }
  }

  // Add product to order
  const addProduct = async (product: Product) => {
    // Get unit types first to determine the default unit type
    setLoadingPrices(true)
    try {
      let availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]

      if (selectedCustomer) {
        // Get prices considering customer-specific pricing
        availableUnitTypes = await getAvailableUnitPricesForCustomer(selectedCustomer.id, product.id)
      } else {
        availableUnitTypes = getProductUnitTypes(product)
      }

      // If no unit types available, fallback to product defaults
      if (availableUnitTypes.length === 0) {
        availableUnitTypes = getProductUnitTypes(product)
      }

      // If multiple unit types available, show selector
      if (availableUnitTypes.length > 1) {
        setUnitTypeSelector({ product, availableUnitTypes })
        return
      }

      // Single unit type - add directly
      const defaultUnit = availableUnitTypes[0]
      addProductWithUnitType(product, defaultUnit.unitType, defaultUnit.price, availableUnitTypes)
    } catch (err) {
      console.error('Error getting prices:', err)
      // Fall back to product defaults
      const unitTypes = getProductUnitTypes(product)

      if (unitTypes.length > 1) {
        setUnitTypeSelector({ product, availableUnitTypes: unitTypes })
        return
      }

      const defaultUnit = unitTypes[0]
      addProductWithUnitType(product, defaultUnit.unitType, defaultUnit.price, unitTypes)
    } finally {
      setLoadingPrices(false)
    }
  }

  // Handle unit type selection from the selector popup
  const handleUnitTypeSelect = (unitType: UnitType) => {
    if (!unitTypeSelector) return

    const { product, availableUnitTypes } = unitTypeSelector
    const selectedUnit = availableUnitTypes.find(ut => ut.unitType === unitType)

    if (selectedUnit) {
      addProductWithUnitType(product, selectedUnit.unitType, selectedUnit.price, availableUnitTypes)
    }

    setUnitTypeSelector(null)
  }

  // Change unit type for an item
  const changeUnitType = async (lineId: string, newUnitType: UnitType) => {
    const item = items.find(i => i.lineId === lineId)
    if (!item) return

    // Find the price for this unit type
    const unitTypeInfo = item.availableUnitTypes.find(ut => ut.unitType === newUnitType)
    if (!unitTypeInfo) return

    // Check if another line exists with same product + new unit type
    const existingLine = items.find(
      i => i.lineId !== lineId && i.product.id === item.product.id && i.selectedUnitType === newUnitType
    )

    if (existingLine) {
      // Merge: add quantity to existing line and remove current line
      setItems(items
        .map(i => i.lineId === existingLine.lineId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
        )
        .filter(i => i.lineId !== lineId)
      )
    } else {
      // Just update the unit type
      setItems(items.map(i =>
        i.lineId === lineId
          ? { ...i, selectedUnitType: newUnitType, unit_price: unitTypeInfo.price }
          : i
      ))
    }
  }

  // Update item quantity by delta (+/-)
  const updateQuantity = (lineId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.lineId !== lineId) return i
      // Round to 3 decimal places to avoid floating point issues
      const newQty = Math.round(Math.max(0, i.quantity + delta) * 1000) / 1000
      return { ...i, quantity: newQty }
    }).filter(i => i.quantity > 0))
  }

  // Set item quantity directly
  const setQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineId)
      return
    }
    // Round to 3 decimal places
    const roundedQty = Math.round(quantity * 1000) / 1000
    setItems(items.map(i =>
      i.lineId === lineId ? { ...i, quantity: roundedQty } : i
    ))
  }

  // Remove item
  const removeItem = (lineId: string) => {
    setItems(items.filter(i => i.lineId !== lineId))
  }

  // Update prices when customer changes
  useEffect(() => {
    if (!selectedCustomer || items.length === 0) return

    const updatePrices = async () => {
      setLoadingPrices(true)
      try {
        const updatedItems = await Promise.all(
          items.map(async item => {
            // Get prices for this customer/product
            const availableUnitTypes = await getAvailableUnitPricesForCustomer(
              selectedCustomer.id,
              item.product.id
            )

            // If we got unit types, use them
            if (availableUnitTypes.length > 0) {
              // Find price for current selected unit type
              const currentUnitInfo = availableUnitTypes.find(
                ut => ut.unitType === item.selectedUnitType
              )

              if (currentUnitInfo) {
                return {
                  ...item,
                  unit_price: currentUnitInfo.price,
                  availableUnitTypes,
                }
              }

              // If current unit type not available, switch to default
              const defaultUnit = availableUnitTypes.find(ut => ut.isDefault) || availableUnitTypes[0]
              return {
                ...item,
                selectedUnitType: defaultUnit.unitType,
                unit_price: defaultUnit.price,
                availableUnitTypes,
              }
            }

            // Fallback - get single price
            const price = await getEffectivePrice(
              selectedCustomer.id,
              item.product.id,
              item.selectedUnitType
            )
            return { ...item, unit_price: price }
          })
        )

        // After updating prices, merge any items that now have the same product + unit type
        const mergedItems: OrderLineItem[] = []
        for (const item of updatedItems) {
          const existingIdx = mergedItems.findIndex(
            i => i.product.id === item.product.id && i.selectedUnitType === item.selectedUnitType
          )
          if (existingIdx >= 0) {
            mergedItems[existingIdx] = {
              ...mergedItems[existingIdx],
              quantity: mergedItems[existingIdx].quantity + item.quantity
            }
          } else {
            mergedItems.push(item)
          }
        }
        setItems(mergedItems)
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
      const orderData = {
        customer_id: selectedCustomer.id,
        order_date: orderDate,
        delivery_notes: deliveryNotes || undefined,
        internal_notes: internalNotes || undefined,
      }
      const itemsData = items.map(i => {
        // Snapshot cost from product data: unit_prices cost → product cost → 0
        const unitPriceCost = i.product.unit_prices?.find(
          up => up.unit_type === i.selectedUnitType
        )?.cost_cents
        const costCents = unitPriceCost ?? i.product.cost_cents ?? 0

        return {
          product_id: i.product.id,
          product_name: i.product.name,
          product_sku: i.product.sku,
          unit_type: i.selectedUnitType,
          quantity: i.quantity,
          unit_price: i.unit_price,
          cost_cents: costCents,
          tax_rate: i.tax_rate,
        }
      })

      if (isEditMode && editOrder) {
        await updateWithItems(editOrder.id, orderData, itemsData)
      } else {
        await create(orderData, itemsData)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? t('orders.form.updateError') : t('orders.form.createError'))
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
            <div className={`p-2 rounded-lg ${isEditMode ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              {isEditMode ? (
                <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditMode ? t('orders.editOrder') : t('orders.newOrder')}
              {isEditMode && editOrder && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({editOrder.order_number})
                </span>
              )}
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
                        key={item.lineId}
                        className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {item.product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {/* Unit type selector */}
                              {item.availableUnitTypes.length > 1 ? (
                                <select
                                  value={item.selectedUnitType}
                                  onChange={e => changeUnitType(item.lineId, e.target.value as UnitType)}
                                  className="text-sm px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  {item.availableUnitTypes.map(ut => (
                                    <option key={ut.unitType} value={ut.unitType}>
                                      {getUnitTypeLabel(ut.unitType)} - {formatPrice(ut.price)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {getUnitTypeLabel(item.selectedUnitType)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {formatPrice(item.unit_price)} × {item.quantity} = {formatPrice(item.unit_price * item.quantity)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.lineId, -1)}
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
                                if (val > 0) setQuantity(item.lineId, val)
                              }}
                              onBlur={e => {
                                const val = parseFloat(e.target.value) || 0
                                if (val <= 0) removeItem(item.lineId)
                              }}
                              className="w-16 text-center font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button
                              onClick={() => updateQuantity(item.lineId, 1)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                              title="+1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeItem(item.lineId)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-colors ${
              isEditMode
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEditMode ? t('orders.form.updating') : t('orders.form.creating')}
              </>
            ) : (
              <>
                {isEditMode ? <Pencil className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {isEditMode ? t('orders.form.saveChanges') : t('orders.newOrder')}
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

      {/* Unit Type Selector Modal */}
      {unitTypeSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setUnitTypeSelector(null)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {unitTypeSelector.product.name}
              </h3>
              <button
                onClick={() => setUnitTypeSelector(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('orders.form.selectUnitType')}
            </p>
            <div className="space-y-2">
              {unitTypeSelector.availableUnitTypes.map(ut => {
                // Check if this product + unit type already in cart
                const existingItem = items.find(
                  i => i.product.id === unitTypeSelector.product.id && i.selectedUnitType === ut.unitType
                )
                return (
                  <button
                    key={ut.unitType}
                    onClick={() => handleUnitTypeSelect(ut.unitType)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {getUnitTypeLabel(ut.unitType)}
                      </span>
                      {ut.isDefault && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                          {t('common.default')}
                        </span>
                      )}
                      {existingItem && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {t('orders.form.inCart', { qty: existingItem.quantity })}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      {formatPrice(ut.price)}
                    </span>
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
