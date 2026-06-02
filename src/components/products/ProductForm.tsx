import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Package } from 'lucide-react'
import Modal from '../ui/Modal'
import { useAuth } from '../../context/AuthContext'
import type { Product, UnitType, ProductUnitPrice } from '../../types'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
}

interface UnitPriceEntry {
  enabled: boolean
  priceEuros: string
  costEuros: string
  isDefault: boolean
}

export interface ProductFormData {
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  unit_type: UnitType  // Default/primary unit type
  base_price: number // in cents (from default unit type)
  cost_cents?: number // Cost of goods in cents (Owner only)
  tax_rate: number
  stock_quantity: number
  stock_unit_type?: UnitType
  track_stock: boolean
  description?: string
  // Multi-unit pricing
  unit_prices?: {
    unit_type: UnitType
    price: number | null
    cost_cents?: number | null
    is_default: boolean
  }[]
}

const ALL_UNIT_TYPES: UnitType[] = ['piece', 'zak', 'doos', 'kg']

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  const getUnitTypeLabel = (unitType: UnitType): string => {
    return t(`products.form.unitTypes.${unitType}`)
  }

  const TAX_RATE_OPTIONS = [
    { value: 9, label: t('products.form.taxRates.food') },
    { value: 21, label: t('products.form.taxRates.high') },
    { value: 0, label: t('products.form.taxRates.none') },
  ]

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [taxRate, setTaxRate] = useState(9)
  const [stockQuantity, setStockQuantity] = useState(0)
  const [stockUnitType, setStockUnitType] = useState<UnitType>('doos')
  const [trackStock, setTrackStock] = useState(true)
  const [description, setDescription] = useState('')

  // Multi-unit pricing state
  const [unitPrices, setUnitPrices] = useState<Record<UnitType, UnitPriceEntry>>({
    piece: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
    zak: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
    doos: { enabled: true, priceEuros: '', costEuros: '', isDefault: true },
    kg: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
  })

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku || '')
      setBarcode(product.barcode || '')
      setTaxRate(product.tax_rate)
      setStockQuantity(product.stock_quantity || 0)
      setStockUnitType(product.stock_unit_type || product.unit_type)
      setTrackStock(product.track_stock ?? true)
      setDescription(product.description || '')

      // Populate unit prices from product.unit_prices or fallback to single unit_type/base_price
      if (product.unit_prices && product.unit_prices.length > 0) {
        const newUnitPrices: Record<UnitType, UnitPriceEntry> = {
          piece: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          zak: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          doos: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          kg: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
        }
        product.unit_prices.forEach((up: ProductUnitPrice) => {
          newUnitPrices[up.unit_type] = {
            enabled: up.price !== null,
            priceEuros: up.price !== null ? (up.price / 100).toFixed(2) : '',
            costEuros: up.cost_cents ? (up.cost_cents / 100).toFixed(2) : '',
            isDefault: up.is_default,
          }
        })
        // Ensure at least one is marked as default
        const hasDefault = Object.values(newUnitPrices).some(up => up.isDefault && up.enabled)
        if (!hasDefault) {
          const firstEnabled = ALL_UNIT_TYPES.find(ut => newUnitPrices[ut].enabled)
          if (firstEnabled) {
            newUnitPrices[firstEnabled].isDefault = true
          }
        }
        setUnitPrices(newUnitPrices)
      } else {
        // Fallback: use product's single unit_type and base_price
        const newUnitPrices: Record<UnitType, UnitPriceEntry> = {
          piece: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          zak: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          doos: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
          kg: { enabled: false, priceEuros: '', costEuros: '', isDefault: false },
        }
        newUnitPrices[product.unit_type] = {
          enabled: true,
          priceEuros: (product.base_price / 100).toFixed(2),
          costEuros: product.cost_cents ? (product.cost_cents / 100).toFixed(2) : '',
          isDefault: true,
        }
        setUnitPrices(newUnitPrices)
      }
    }
  }, [product])

  const handleUnitPriceChange = (
    unitType: UnitType,
    field: keyof UnitPriceEntry,
    value: string | boolean
  ) => {
    setUnitPrices(prev => {
      const newPrices = { ...prev }

      if (field === 'isDefault' && value === true) {
        // Only one can be default
        ALL_UNIT_TYPES.forEach(ut => {
          newPrices[ut] = { ...newPrices[ut], isDefault: false }
        })
      }

      newPrices[unitType] = { ...newPrices[unitType], [field]: value }

      // If enabling, set as default if no other default exists
      if (field === 'enabled' && value === true) {
        const hasDefault = ALL_UNIT_TYPES.some(ut => newPrices[ut].isDefault && newPrices[ut].enabled)
        if (!hasDefault) {
          newPrices[unitType].isDefault = true
        }
      }

      // If disabling the default, find another enabled one to be default
      if (field === 'enabled' && value === false && newPrices[unitType].isDefault) {
        newPrices[unitType].isDefault = false
        const firstEnabled = ALL_UNIT_TYPES.find(ut => newPrices[ut].enabled && ut !== unitType)
        if (firstEnabled) {
          newPrices[firstEnabled].isDefault = true
        }
      }

      return newPrices
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name.trim()) {
      setError(t('products.form.productNameRequired'))
      return
    }

    // Check at least one unit type is enabled with a valid price
    const enabledUnits = ALL_UNIT_TYPES.filter(ut => unitPrices[ut].enabled)
    if (enabledUnits.length === 0) {
      setError(t('products.form.atLeastOneUnitRequired'))
      return
    }

    // Validate prices for enabled units
    for (const ut of enabledUnits) {
      const priceInCents = Math.round(parseFloat(unitPrices[ut].priceEuros || '0') * 100)
      if (isNaN(priceInCents) || priceInCents < 0) {
        setError(t('products.form.invalidPrice'))
        return
      }
      if (unitPrices[ut].costEuros) {
        const costInCents = Math.round(parseFloat(unitPrices[ut].costEuros) * 100)
        if (isNaN(costInCents) || costInCents < 0) {
          setError(t('products.form.invalidCost'))
          return
        }
      }
    }

    // Find default unit type
    const defaultUnit = ALL_UNIT_TYPES.find(ut => unitPrices[ut].isDefault && unitPrices[ut].enabled)
    if (!defaultUnit) {
      setError(t('products.form.selectDefaultUnit'))
      return
    }

    const defaultPrice = Math.round(parseFloat(unitPrices[defaultUnit].priceEuros || '0') * 100)
    const defaultCost = unitPrices[defaultUnit].costEuros
      ? Math.round(parseFloat(unitPrices[defaultUnit].costEuros) * 100)
      : undefined

    try {
      setSaving(true)

      // Build unit_prices array
      const unitPricesArray = enabledUnits.map(ut => ({
        unit_type: ut,
        price: Math.round(parseFloat(unitPrices[ut].priceEuros || '0') * 100),
        cost_cents: unitPrices[ut].costEuros && isOwner
          ? Math.round(parseFloat(unitPrices[ut].costEuros) * 100)
          : null,
        is_default: unitPrices[ut].isDefault,
      }))

      const formData: ProductFormData = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        unit_type: defaultUnit,
        base_price: defaultPrice,
        tax_rate: taxRate,
        stock_quantity: stockQuantity,
        stock_unit_type: stockUnitType,
        track_stock: trackStock,
        description: description.trim() || undefined,
        unit_prices: unitPricesArray,
      }

      // Only include cost if owner
      if (isOwner && defaultCost !== undefined) {
        formData.cost_cents = defaultCost
      }

      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // Get enabled unit types for stock unit dropdown
  const enabledUnitTypes = ALL_UNIT_TYPES.filter(ut => unitPrices[ut].enabled)

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {product ? t('products.editProduct') : t('products.addProduct')}
          </h2>
        </div>
      }
      maxWidth="max-w-2xl"
    >
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('products.productName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('products.form.enterProductName')}
                required
              />
            </div>

            {/* SKU and Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.sku')}
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('products.form.enterSku')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.barcode')}
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('products.form.scanBarcode')}
                />
              </div>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('products.taxRate')}
              </label>
              <select
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {TAX_RATE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Prices Section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('products.form.unitPrices')} <span className="text-red-500">*</span>
              </label>
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {t('products.unitType')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {t('products.form.sellingPrice')}
                      </th>
                      {isOwner && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                          {t('products.form.cogs')}
                        </th>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {t('products.form.default')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {ALL_UNIT_TYPES.map(ut => (
                      <tr
                        key={ut}
                        className={unitPrices[ut].enabled ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                      >
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={unitPrices[ut].enabled}
                              onChange={e => handleUnitPriceChange(ut, 'enabled', e.target.checked)}
                              className="w-4 h-4 text-green-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-slate-900 dark:text-white">
                              {getUnitTypeLabel(ut)}
                            </span>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                              €
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={unitPrices[ut].priceEuros}
                              onChange={e => handleUnitPriceChange(ut, 'priceEuros', e.target.value)}
                              disabled={!unitPrices[ut].enabled}
                              className="w-24 pl-6 pr-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                        {isOwner && (
                          <td className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                €
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unitPrices[ut].costEuros}
                                onChange={e => handleUnitPriceChange(ut, 'costEuros', e.target.value)}
                                disabled={!unitPrices[ut].enabled}
                                className="w-24 pl-6 pr-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="radio"
                            name="defaultUnit"
                            checked={unitPrices[ut].isDefault}
                            onChange={() => handleUnitPriceChange(ut, 'isDefault', true)}
                            disabled={!unitPrices[ut].enabled}
                            className="w-4 h-4 text-green-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-green-500 disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('products.form.unitPricesHelp')}
              </p>
            </div>

            {/* Stock Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.stock')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={stockQuantity}
                  onChange={e => setStockQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  disabled={!trackStock}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.form.stockUnit')}
                </label>
                <select
                  value={stockUnitType}
                  onChange={e => setStockUnitType(e.target.value as UnitType)}
                  disabled={!trackStock || enabledUnitTypes.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {enabledUnitTypes.map(ut => (
                    <option key={ut} value={ut}>
                      {getUnitTypeLabel(ut)}
                    </option>
                  ))}
                  {enabledUnitTypes.length === 0 && (
                    <option value="">{t('products.form.noUnitEnabled')}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Track Stock Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackStock"
                checked={trackStock}
                onChange={e => setTrackStock(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-green-500"
              />
              <label htmlFor="trackStock" className="text-sm text-slate-700 dark:text-slate-300">
                {t('products.form.trackStockLabel')}
              </label>
            </div>
            {!trackStock && (
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 ml-7">
                {t('products.form.stockIgnored')}
              </p>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('common.description')}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder={t('common.optional') + '...'}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                product ? t('products.form.updateProduct') : t('products.form.createProduct')
              )}
            </button>
          </div>
        </form>
    </Modal>
  )
}
