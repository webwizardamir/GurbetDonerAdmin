import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2, Package } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { useAuth } from '../../context/AuthContext'
import type { Product, UnitType } from '../../types'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
}

export interface ProductFormData {
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  unit_type: UnitType
  base_price: number // in cents
  cost_cents?: number // Cost of goods in cents (Owner only)
  tax_rate: number
  stock_quantity: number
  track_stock: boolean
  description?: string
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const { t } = useTranslation()
  const { categories } = useCategories({ activeOnly: true })
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
    { value: 'zak', label: t('products.form.unitTypes.zak') },
    { value: 'doos', label: t('products.form.unitTypes.doos') },
    { value: 'piece', label: t('products.form.unitTypes.piece') },
    { value: 'kg', label: t('products.form.unitTypes.kg') },
  ]

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
  const [categoryId, setCategoryId] = useState('')
  const [unitType, setUnitType] = useState<UnitType>('doos')
  const [priceEuros, setPriceEuros] = useState('') // Display in euros
  const [costEuros, setCostEuros] = useState('') // Cost in euros (Owner only)
  const [taxRate, setTaxRate] = useState(9)
  const [stockQuantity, setStockQuantity] = useState(0)
  const [trackStock, setTrackStock] = useState(true)
  const [description, setDescription] = useState('')

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku || '')
      setBarcode(product.barcode || '')
      setCategoryId(product.category_id || '')
      setUnitType(product.unit_type)
      setPriceEuros((product.base_price / 100).toFixed(2))
      setCostEuros(product.cost_cents ? (product.cost_cents / 100).toFixed(2) : '')
      setTaxRate(product.tax_rate)
      setStockQuantity(product.stock_quantity || 0)
      setTrackStock(product.track_stock ?? true)
      setDescription(product.description || '')
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name.trim()) {
      setError(t('products.form.productNameRequired'))
      return
    }

    const priceInCents = Math.round(parseFloat(priceEuros || '0') * 100)
    if (isNaN(priceInCents) || priceInCents < 0) {
      setError(t('products.form.invalidPrice'))
      return
    }

    const costInCents = costEuros ? Math.round(parseFloat(costEuros) * 100) : undefined
    if (costEuros && (isNaN(costInCents!) || costInCents! < 0)) {
      setError(t('products.form.invalidCost'))
      return
    }

    try {
      setSaving(true)
      const formData: ProductFormData = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        category_id: categoryId || undefined,
        unit_type: unitType,
        base_price: priceInCents,
        tax_rate: taxRate,
        stock_quantity: stockQuantity,
        track_stock: trackStock,
        description: description.trim() || undefined,
      }

      // Only include cost if owner
      if (isOwner && costInCents !== undefined) {
        formData.cost_cents = costInCents
      }

      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {product ? t('products.editProduct') : t('products.addProduct')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('products.category')}
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">{t('products.form.noCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Type and Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.unitType')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitType}
                  onChange={e => setUnitType(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {UNIT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
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

            {/* Price and Tax Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.form.sellingPrice')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    &euro;
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceEuros}
                    onChange={e => setPriceEuros(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
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
            </div>

            {/* Cost of Goods (Owner only) */}
            {isOwner && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('products.form.cogs')}
                  <span className="ml-2 text-xs text-slate-500">({t('products.form.ownerOnly')})</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    &euro;
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costEuros}
                    onChange={e => setCostEuros(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                {priceEuros && costEuros && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('products.margin')}: &euro;{(parseFloat(priceEuros) - parseFloat(costEuros)).toFixed(2)}
                    ({((1 - parseFloat(costEuros) / parseFloat(priceEuros)) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>
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
      </div>
    </div>
  )
}
