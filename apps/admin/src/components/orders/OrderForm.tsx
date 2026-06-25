import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, ShoppingCart, Pencil, Package, Info, AlertTriangle, ArrowLeft, X, Tags } from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import { useProducts } from '../../hooks/useProducts'
import { useOrders } from '../../hooks/useOrders'
import { supabase } from '../../services/supabase'
import BarcodeScanner from './BarcodeScanner'
import CustomerSelect from './CustomerSelect'
import ProductSearch from './ProductSearch'
import OrderItemsList from './OrderItemsList'
import type { Customer, Product, UnitType, ProductUnitPrice } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import { formatPrice } from '../../utils/format'
import { isReverseChargeCountry, isImportedOrder } from '../../utils/vat'
import { computeOrderTotals, type DiscountType } from '../../utils/discount'
import { setCustomerPrice, clearCustomerPrice } from '../../services/pricing'

interface OrderFormProps {
  onCancel: () => void
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
  notes?: string
  discount_type?: DiscountType | null
  discount_value?: number | null
  // True when the user manually changed this line's price — drives the
  // "remember this customer price" auto-save on submit.
  priceEdited?: boolean
  availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
}

// Per-line cost of goods: the unit-type's own cost if set, else the product's
// base cost, else 0. Single source used both for the owner-only COG display and
// the persisted order_items.cost_cents snapshot.
function resolveLineCostCents(product: Product, unitType: UnitType): number {
  return product.unit_prices?.find(up => up.unit_type === unitType)?.cost_cents ?? product.cost_cents ?? 0
}

export default function OrderForm({ onCancel, onSuccess, editOrder }: OrderFormProps) {
  const { t } = useTranslation()
  // Large pageSize so the customer picker sees ALL customers, not just page 1
  const { customers, loading: customersLoading } = useCustomers({ pageSize: 5000 })
  // Large pageSize so the product picker sees ALL products, not just page 1
  const { products, loading: productsLoading } = useProducts({}, 5000)
  const { create, updateWithItems } = useOrders()

  const isEditMode = !!editOrder

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<OrderLineItem[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType | null>(null)
  const [orderDiscountValue, setOrderDiscountValue] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingPrices] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(false)
  // Re-pricing existing lines is only allowed after the user actively changes
  // the customer. Sold prices are immutable, so loading an existing order (which
  // sets the customer programmatically) must NOT recalculate stored line prices.
  const repriceArmedRef = useRef(false)
  const [unitTypeSelector, setUnitTypeSelector] = useState<{
    product: Product
    availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
  } | null>(null)

  // Customer pricing context — pre-fetched once per customer-change so adding
  // products to the order is instant (no per-click round-trips). Keys are
  // product_id; values are unit-type → price/tax maps.
  const [customerPrices, setCustomerPrices] = useState<Map<string, Map<UnitType | '*', number>>>(new Map())
  const [listItems, setListItems] = useState<Map<string, Map<UnitType, { price: number; tax: number | null }>>>(new Map())

  // Pre-fetch all custom-pricing context for the selected customer in one trip.
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerPrices(new Map())
      setListItems(new Map())
      return
    }
    let cancelled = false
    void (async () => {
      const [cpRes, plRes] = await Promise.all([
        supabase
          .from('customer_prices')
          .select('product_id, unit_type, custom_price')
          .eq('customer_id', selectedCustomer.id),
        // Only pull list items if the assigned list is still active — the
        // is_active flag is the UI's "deactivate" switch and must not silently
        // keep overriding prices on new orders.
        (selectedCustomer.price_list_id && selectedCustomer.price_list?.is_active !== false)
          ? supabase
              .from('price_list_items')
              .select('product_id, unit_type, price_cents, tax_rate')
              .eq('price_list_id', selectedCustomer.price_list_id)
          : Promise.resolve({ data: [] as Array<{ product_id: string; unit_type: UnitType; price_cents: number; tax_rate: number | null }>, error: null }),
      ])
      if (cancelled) return

      const cpMap = new Map<string, Map<UnitType | '*', number>>()
      for (const row of (cpRes.data as Array<{ product_id: string; unit_type: UnitType | null; custom_price: number }>) ?? []) {
        if (!cpMap.has(row.product_id)) cpMap.set(row.product_id, new Map())
        cpMap.get(row.product_id)!.set(row.unit_type ?? '*', row.custom_price)
      }
      setCustomerPrices(cpMap)

      const plMap = new Map<string, Map<UnitType, { price: number; tax: number | null }>>()
      for (const row of (plRes.data as Array<{ product_id: string; unit_type: UnitType; price_cents: number; tax_rate: number | null }>) ?? []) {
        if (!plMap.has(row.product_id)) plMap.set(row.product_id, new Map())
        plMap.get(row.product_id)!.set(row.unit_type, { price: row.price_cents, tax: row.tax_rate })
      }
      setListItems(plMap)
    })()
    return () => { cancelled = true }
  }, [selectedCustomer?.id, selectedCustomer?.price_list_id])

  // Synchronous price resolver — walks the full resolution chain using the
  // pre-fetched context. No round-trips, safe to call in render or click handlers.
  const resolveEffectivePrice = useCallback((product: Product, unitType: UnitType): number => {
    const cp = customerPrices.get(product.id)
    if (cp?.has(unitType)) return cp.get(unitType)!
    if (cp?.has('*'))      return cp.get('*')!
    const pl = listItems.get(product.id)?.get(unitType)
    if (typeof pl?.price === 'number') return pl.price
    const up = product.unit_prices?.find(u => u.unit_type === unitType && u.price != null)
    if (typeof up?.price === 'number') return up.price
    return product.base_price
  }, [customerPrices, listItems])

  // Union of all unit types available for a product (product entries +
  // anything the customer's price list adds).
  const enumerateUnitTypes = useCallback((product: Product): { unitType: UnitType; price: number; isDefault: boolean }[] => {
    const units = new Set<UnitType>()
    for (const u of product.unit_prices ?? []) {
      if (u.price != null) units.add(u.unit_type)
    }
    const pl = listItems.get(product.id)
    if (pl) for (const u of pl.keys()) units.add(u)
    if (units.size === 0) units.add(product.unit_type)
    return Array.from(units).map(ut => ({
      unitType: ut,
      price: resolveEffectivePrice(product, ut),
      isDefault: ut === product.unit_type,
    }))
  }, [listItems, resolveEffectivePrice])

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
    setOrderDiscountType(editOrder.discount_type ?? null)
    setOrderDiscountValue(editOrder.discount_value ?? null)
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
            cost_cents: item.cost_cents ?? 0, tax_rate: item.tax_rate, stock_quantity: 0, track_stock: false,
            description: '', is_active: true, created_by: '', created_at: '', updated_at: '',
          },
          selectedUnitType: item.unit_type as UnitType,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          notes: item.notes || '',
          discount_type: item.discount_type ?? null,
          discount_value: item.discount_value ?? null,
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

  const addProduct = (product: Product) => {
    const availableUnitTypes = selectedCustomer
      ? enumerateUnitTypes(product)
      : getProductUnitTypes(product)
    if (availableUnitTypes.length > 1) { setUnitTypeSelector({ product, availableUnitTypes }); return }
    const defaultUnit = availableUnitTypes[0]
    addProductWithUnitType(product, defaultUnit.unitType, defaultUnit.price, availableUnitTypes)
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

  // Re-price existing items synchronously when the pricing context changes
  // (i.e. after selecting a customer, once customer_prices + price_list_items
  // have been pre-fetched). No round-trips per item.
  useEffect(() => {
    if (!selectedCustomer || items.length === 0) return
    const updatedItems = items.map(item => {
      const available = enumerateUnitTypes(item.product)
      if (available.length === 0) return item
      // Not armed = initial edit-mode load: refresh the unit-type options for the
      // dropdown but KEEP the stored price (immutable sold price).
      if (!repriceArmedRef.current) return { ...item, availableUnitTypes: available }
      const currentUnit = available.find(ut => ut.unitType === item.selectedUnitType)
      if (currentUnit) return { ...item, unit_price: currentUnit.price, availableUnitTypes: available }
      const defaultUnit = available.find(ut => ut.isDefault) || available[0]
      return { ...item, selectedUnitType: defaultUnit.unitType, unit_price: defaultUnit.price, availableUnitTypes: available }
    })
    const mergedItems: OrderLineItem[] = []
    for (const item of updatedItems) {
      const existingIdx = mergedItems.findIndex(i => i.product.id === item.product.id && i.selectedUnitType === item.selectedUnitType)
      if (existingIdx >= 0) {
        mergedItems[existingIdx] = { ...mergedItems[existingIdx], quantity: mergedItems[existingIdx].quantity + item.quantity }
      } else {
        mergedItems.push(item)
      }
    }
    setItems(mergedItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPrices, listItems])

  // Reverse-charge: NL company selling to a non-NL customer charges 0% BTW
  // ("BTW verlegd"). Imported orders are frozen — they keep whatever VAT
  // they had in WooCommerce, regardless of country.
  const isImported = isImportedOrder(editOrder)
  const reverseCharge = !isImported && !!selectedCustomer && isReverseChargeCountry(selectedCustomer.billing_country)
  const effectiveTaxRate = (rate: number) => reverseCharge ? 0 : rate

  // Single source of truth for the live preview — the same helper the service
  // uses to persist, so the displayed totals always match what is stored.
  const totals = useMemo(() => computeOrderTotals(
    items.map(i => ({
      unitPrice: i.unit_price,
      quantity: i.quantity,
      taxRate: effectiveTaxRate(i.tax_rate),
      lineDiscountType: i.discount_type ?? null,
      lineDiscountValue: i.discount_value ?? null,
    })),
    orderDiscountType,
    orderDiscountValue,
  ), [items, orderDiscountType, orderDiscountValue, reverseCharge])
  const { subtotal, discountTotal, tax: taxTotal, total } = totals

  const handleSubmit = async () => {
    if (!selectedCustomer) { setError(t('orders.form.selectCustomerError')); return }
    if (items.length === 0) { setError(t('orders.form.addProductError')); return }
    setSaving(true)
    setError(null)
    try {
      const orderData = {
        customer_id: selectedCustomer.id, order_date: orderDate,
        delivery_notes: deliveryNotes || undefined, internal_notes: internalNotes || undefined,
        discount_type: orderDiscountType, discount_value: orderDiscountValue,
      }
      const itemsData = items.map(i => ({
        product_id: i.product.id, product_name: i.product.name, product_sku: i.product.sku,
        unit_type: i.selectedUnitType, quantity: i.quantity, unit_price: i.unit_price,
        cost_cents: resolveLineCostCents(i.product, i.selectedUnitType), tax_rate: effectiveTaxRate(i.tax_rate),
        discount_type: i.discount_type ?? null, discount_value: i.discount_value ?? null,
        notes: i.notes?.trim() || undefined,
      }))
      if (isEditMode && editOrder) { await updateWithItems(editOrder.id, orderData, itemsData) }
      else { await create(orderData, itemsData) }

      // Remember any manually-edited line prices for this customer (per
      // product + unit_type), so they auto-apply on the next order. Best-effort:
      // a failure here must not fail the saved order. Skipped for imported (WC)
      // orders, whose prices are frozen.
      if (!isImported) {
        // Only remember a price that genuinely differs from the next tier
        // (list / product / base) — not one the user typed back to default.
        // Dedupe by product+unit so duplicate lines don't double-upsert.
        const seen = new Set<string>()
        const toSave = items.filter(i => {
          if (!i.priceEdited) return false
          const key = `${i.product.id}|${i.selectedUnitType}`
          if (seen.has(key)) return false
          seen.add(key)
          const pl = listItems.get(i.product.id)?.get(i.selectedUnitType)
          const up = i.product.unit_prices?.find(u => u.unit_type === i.selectedUnitType && u.price != null)
          const baseline = (typeof pl?.price === 'number') ? pl.price
            : (typeof up?.price === 'number') ? up.price
            : i.product.base_price
          return i.unit_price !== baseline
        })
        if (toSave.length > 0) {
          try {
            await Promise.all(toSave.map(i =>
              setCustomerPrice(selectedCustomer.id, i.product.id, i.unit_price, i.selectedUnitType)
            ))
          } catch (e) { console.error('Failed to remember customer prices:', e) }
        }
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? t('orders.form.updateError') : t('orders.form.createError'))
    } finally { setSaving(false) }
  }

  // Forget a remembered customer price: delete the customer_prices row, drop it
  // from the in-memory map, and reprice the affected line(s) to the next tier.
  const handleForgetPrice = async (productId: string, unitType: UnitType) => {
    if (!selectedCustomer) return
    // The applied remembered price may be unit-specific OR the unit-less ('*')
    // wildcard — clear whichever one actually matched this line.
    const m0 = customerPrices.get(productId)
    const keyToClear: UnitType | '*' = m0?.has(unitType) ? unitType : '*'
    try { await clearCustomerPrice(selectedCustomer.id, productId, keyToClear === '*' ? null : keyToClear) }
    catch (e) { console.error('Failed to clear customer price:', e); return }

    const nextMap = new Map(customerPrices)
    const m = nextMap.get(productId)
    if (m) { m.delete(keyToClear); if (m.size === 0) nextMap.delete(productId) }
    setCustomerPrices(nextMap)

    // Reprice matching lines using the remaining tiers (list / product / base).
    setItems(prev => prev.map(i => {
      if (i.product.id !== productId || i.selectedUnitType !== unitType) return i
      const pl = listItems.get(productId)?.get(unitType)
      const up = i.product.unit_prices?.find(u => u.unit_type === unitType && u.price != null)
      const fallback = (typeof pl?.price === 'number') ? pl.price
        : (typeof up?.price === 'number') ? up.price
        : i.product.base_price
      return { ...i, unit_price: fallback, priceEdited: false }
    }))
  }

  const getUnitTypeLabel = (unitType: UnitType): string => t(`products.form.unitTypes.${unitType}`)

  const customerSummaryLines: string[] = []
  if (selectedCustomer) {
    if (selectedCustomer.billing_city) customerSummaryLines.push(selectedCustomer.billing_city)
    if (selectedCustomer.billing_country) customerSummaryLines.push(selectedCustomer.billing_country)
    if (selectedCustomer.vat_number) customerSummaryLines.push(`BTW ${selectedCustomer.vat_number}`)
  }

  return (
    <div className="space-y-4">
      {/* Action row — inline like other pages' filter rows. No bar chrome. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onCancel}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title={t('orders.backToOrders')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {isEditMode && editOrder && (
            <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {editOrder.order_number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedCustomer || items.length === 0}
            className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-white font-medium rounded-lg transition-colors text-sm ${isEditMode ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400' : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'}`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">{isEditMode ? t('orders.form.updating') : t('orders.form.creating')}</span></>
            ) : (
              <>{isEditMode ? <Pencil className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}<span className="hidden sm:inline">{isEditMode ? t('orders.form.saveChanges') : t('orders.saveOrder')}</span></>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {reverseCharge && selectedCustomer && (
          selectedCustomer.vat_number?.trim() ? (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {t('orders.vat.reverseChargeBanner', {
                  country: t(`customers.countries.${selectedCustomer.billing_country}`, selectedCustomer.billing_country),
                  vatNumber: selectedCustomer.vat_number,
                })}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {t('orders.vat.reverseChargeWarning', {
                  country: t(`customers.countries.${selectedCustomer.billing_country}`, selectedCustomer.billing_country),
                })}
              </p>
            </div>
          )
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: details */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t('orders.details')}</h3>

              {selectedCustomer && !editingCustomer ? (
                <div className="flex items-start justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{t('orders.customer')}</p>
                    <p className="font-medium text-slate-900 dark:text-white truncate">{selectedCustomer.company_name}</p>
                    {selectedCustomer.price_list && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-xs font-medium text-purple-700 dark:text-purple-400 max-w-full">
                        <Tags className="w-3 h-3 shrink-0" />
                        <span className="truncate">{selectedCustomer.price_list.name}</span>
                      </span>
                    )}
                    {customerSummaryLines.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{customerSummaryLines.join(' · ')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingCustomer(true)}
                    className="text-xs text-green-600 dark:text-green-400 hover:underline shrink-0"
                  >
                    {t('orders.changeCustomer')}
                  </button>
                </div>
              ) : (
                <CustomerSelect
                  selectedCustomer={selectedCustomer}
                  customers={customers}
                  customersLoading={customersLoading}
                  onSelect={(c) => { repriceArmedRef.current = true; setSelectedCustomer(c); setEditingCustomer(false) }}
                  onClear={() => { repriceArmedRef.current = true; setSelectedCustomer(null) }}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('orders.orderDate')}</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

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

          {/* Right column: items */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <ProductSearch
                products={products}
                productsLoading={productsLoading}
                loadingPrices={loadingPrices}
                onAddProduct={addProduct}
                onOpenScanner={() => setShowScanner(true)}
                getDisplayPrice={selectedCustomer
                  ? (p) => resolveEffectivePrice(p, p.unit_type)
                  : undefined}
                // Scope the picker to the customer's price list when one is
                // active. Admin can edit the list to add products if they
                // need to sell something not on it today.
                allowedProductIds={
                  selectedCustomer?.price_list_id && selectedCustomer.price_list?.is_active !== false && listItems.size > 0
                    ? new Set(listItems.keys())
                    : null
                }
                scopeNote={
                  selectedCustomer?.price_list_id && selectedCustomer.price_list?.is_active !== false && selectedCustomer.price_list
                    ? t('orders.form.scopedToPriceList', { name: selectedCustomer.price_list.name })
                    : undefined
                }
              />
            </div>

            <OrderItemsList
              items={items.map(i => ({ ...i, cost_cents: resolveLineCostCents(i.product, i.selectedUnitType) }))}
              subtotal={subtotal}
              discountTotal={discountTotal}
              taxTotal={taxTotal}
              total={total}
              reverseCharge={reverseCharge}
              orderDiscountType={orderDiscountType}
              orderDiscountValue={orderDiscountValue}
              onUpdateQuantity={updateQuantity}
              onSetQuantity={setQuantity}
              onRemoveItem={removeItem}
              onChangeUnitType={changeUnitType}
              onSetPrice={(lineId, priceInCents) => {
                setItems(prev => prev.map(item =>
                  item.lineId === lineId
                    ? { ...item, unit_price: priceInCents, priceEdited: item.unit_price !== priceInCents || item.priceEdited }
                    : item
                ))
              }}
              isRemembered={(productId, unitType) => {
                const cp = customerPrices.get(productId)
                return !!cp && (cp.has(unitType) || cp.has('*'))
              }}
              onForgetPrice={handleForgetPrice}
              onSetNotes={(lineId, notes) => {
                setItems(prev => prev.map(item =>
                  item.lineId === lineId ? { ...item, notes } : item
                ))
              }}
              onSetLineDiscount={(lineId, type, value) => {
                setItems(prev => prev.map(item =>
                  item.lineId === lineId ? { ...item, discount_type: type, discount_value: value } : item
                ))
              }}
              onSetOrderDiscount={(type, value) => {
                setOrderDiscountType(type)
                setOrderDiscountValue(value)
              }}
            />
          </div>
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
