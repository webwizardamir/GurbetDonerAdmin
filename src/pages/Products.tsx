import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  Tag,
  Pencil,
  Trash2,
  Loader2,
  Package,
  PackageX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { usePermission } from '../hooks/usePermission'
import { useAuth } from '../context/AuthContext'
import ProductForm, { type ProductFormData } from '../components/products/ProductForm'
import CategoryManager from '../components/products/CategoryManager'
import type { Product } from '../types'
import { productExportColumns } from '../utils/export'
import ExportMenu from '../components/ui/ExportMenu'
import { formatPrice, formatPercent } from '../utils/format'

// Format unit type for display
function formatUnitType(unitType: string, t: (key: string) => string): string {
  switch (unitType) {
    case 'zak':
      return t('products.units.zak')
    case 'doos':
      return t('products.units.doos')
    case 'piece':
      return t('products.units.piece')
    case 'kg':
      return t('products.units.kg')
    default:
      return unitType
  }
}

export default function Products() {
  const { t } = useTranslation()
  const { canCreate, canEdit, canDelete } = usePermission('products')
  const { products, loading, error, refresh, create, update, remove, page, setPage, totalPages, totalCount, setFilters } = useProducts()
  const { categories } = useCategories({ activeOnly: true })
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Debounced server-side search (skip initial mount)
  const [searchInit, setSearchInit] = useState(false)
  useEffect(() => {
    if (!searchInit) { setSearchInit(true); return }
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Server-side category filter (skip initial mount)
  const [catInit, setCatInit] = useState(false)
  useEffect(() => {
    if (!catInit) { setCatInit(true); return }
    setFilters({ category_id: categoryFilter || undefined })
  }, [categoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProducts = products

  const handleCreate = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleSave = async (data: ProductFormData) => {
    if (editingProduct) {
      await update(editingProduct.id, data)
    } else {
      await create(data)
    }
  }

  const handleDelete = async (id: string) => {
    // TODO: Replace with custom ConfirmDialog component
    if (!confirm(t('products.confirmDelete'))) return
    await remove(id)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  const exportFilterSummary = useMemo(() => {
    const parts: string[] = []
    if (categoryFilter) {
      const cat = categories.find(c => c.id === categoryFilter)
      if (cat) parts.push(`Categorie: ${cat.name}`)
    }
    if (searchQuery) parts.push(`Zoekterm: ${searchQuery}`)
    return parts.join(' · ')
  }, [categoryFilter, searchQuery, categories])

  return (
    <div className="space-y-6">
      {/* Search & Filters - Combined on desktop, stacked on mobile */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:flex-1 lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder={t('products.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">{t('products.allCategories')}</option>
          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
        </select>
        <button onClick={() => setShowCategories(true)}
          className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title={t('products.categories')}>
          <Tag className="w-5 h-5" />
        </button>
        <ExportMenu
          data={filteredProducts}
          columns={productExportColumns as never}
          filename={`products-${new Date().toISOString().split('T')[0]}`}
          pdfTitle="Producten"
          pdfFilterSummary={exportFilterSummary || undefined}
        />
        <div className="flex-1" />
        {canCreate && (
          <button onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('products.addProduct')}</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {t('products.noProductsMatch')}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || categoryFilter
              ? t('common.noResults')
              : t('products.addFirstProduct')}
          </p>
          {canCreate && !searchQuery && !categoryFilter && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('products.addProduct')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.id')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.productName')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.category')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.sku')} / {t('products.barcode')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.unitType')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('products.stock')}
                  </th>
                  {isOwner && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('products.costPrice')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.price')}
                  </th>
                  {isOwner && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('products.margin')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredProducts.map(product => (
                  <tr
                    key={product.id}
                    onClick={() => canEdit && handleEdit(product)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${canEdit ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-3 py-3 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {product.product_code ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {product.sku && (
                          <div className="text-slate-900 dark:text-white">{product.sku}</div>
                        )}
                        {product.barcode && (
                          <div className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                            {product.barcode}
                          </div>
                        )}
                        {!product.sku && !product.barcode && (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {formatUnitType(product.unit_type, t)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.track_stock ? (
                        <span className={`font-medium ${
                          product.stock_quantity === 0
                            ? 'text-red-600 dark:text-red-400'
                            : product.stock_quantity < 10
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500" title={t('products.stockStatus.notTracked')}>
                          <PackageX className="w-4 h-4" />
                          <span className="text-xs">N/A</span>
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {product.cost_cents ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            {formatPrice(product.cost_cents)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatPrice(product.base_price)}
                      </div>
                      <div className="text-xs text-slate-500">BTW {product.tax_rate}%</div>
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {product.cost_cents && product.base_price > 0 ? (
                          <span className={`font-medium ${
                            product.base_price > product.cost_cents
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatPercent((1 - product.cost_cents / product.base_price) * 100)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                <span className="hidden sm:inline">{t('common.showing')} </span>{((page - 1) * 50) + 1}-{Math.min(page * 50, totalCount)} <span className="hidden sm:inline">{t('common.of')}</span><span className="sm:hidden">/</span> {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {(() => {
                  const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 7
                  return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
                    let pageNum: number
                    const half = Math.floor(maxVisible / 2)
                    if (totalPages <= maxVisible) {
                      pageNum = i + 1
                    } else if (page <= half + 1) {
                      pageNum = i + 1
                    } else if (page >= totalPages - half) {
                      pageNum = totalPages - maxVisible + 1 + i
                    } else {
                      pageNum = page - half + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          pageNum === page
                            ? 'bg-green-600 text-white font-medium'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })
                })()}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => canEdit && handleEdit(product)}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${canEdit ? 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {product.product_code && (
                      <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                        {product.product_code}
                      </div>
                    )}
                    <h3 className="font-medium text-slate-900 dark:text-white">{product.name}</h3>
                    {product.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatPrice(product.base_price)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatUnitType(product.unit_type, t)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="text-slate-500 dark:text-slate-400">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.sku && product.barcode && <span className="mx-2">|</span>}
                    {product.barcode && (
                      <span className="font-mono text-xs">{product.barcode}</span>
                    )}
                  </div>
                  {product.track_stock ? (
                    <div className={`font-medium ${
                      product.stock_quantity === 0
                        ? 'text-red-600 dark:text-red-400'
                        : product.stock_quantity < 10
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {t('products.stock')}: {product.stock_quantity}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <PackageX className="w-4 h-4" />
                      <span className="text-xs">{t('products.stockStatus.notTracked')}</span>
                    </div>
                  )}
                </div>

                {/* Owner-only: Cost and Margin */}
                {isOwner && product.cost_cents && (
                  <div className="flex items-center justify-between text-sm mb-3 py-2 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="text-slate-500 dark:text-slate-400">
                      {t('products.costPrice')}: {formatPrice(product.cost_cents)}
                    </div>
                    {product.base_price > 0 && (
                      <div className={`font-medium ${
                        product.base_price > product.cost_cents
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {t('products.margin')}: {formatPercent((1 - product.cost_cents / product.base_price) * 100)}
                      </div>
                    )}
                  </div>
                )}

                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                      >
                        <Pencil className="w-4 h-4" />
                        {t('common.edit')}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm product={editingProduct} onClose={handleCloseForm} onSave={handleSave} />
      )}

      {/* Category Manager Modal */}
      {showCategories && (
        <CategoryManager
          onClose={() => {
            setShowCategories(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
