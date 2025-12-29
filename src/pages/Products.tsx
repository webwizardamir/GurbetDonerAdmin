import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Tag,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { usePermission } from '../hooks/usePermission'
import ProductForm, { type ProductFormData } from '../components/products/ProductForm'
import CategoryManager from '../components/products/CategoryManager'
import type { Product } from '../types'

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Format unit type for display
function formatUnitType(unitType: string): string {
  switch (unitType) {
    case 'package':
      return 'Package'
    case 'piece':
      return 'Piece'
    case 'kg':
      return 'Per kg'
    default:
      return unitType
  }
}

export default function Products() {
  const { canCreate, canEdit, canDelete } = usePermission('products')
  const { products, loading, error, refresh, create, update, remove, deactivate, reactivate } =
    useProducts()
  const { categories } = useCategories({ activeOnly: true })

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Category filter
      if (categoryFilter && product.category_id !== categoryFilter) {
        return false
      }

      // Active/inactive filter
      if (!showInactive && !product.is_active) {
        return false
      }

      return true
    })
  }, [products, searchQuery, categoryFilter, showInactive])

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

  const handleToggleActive = async (product: Product) => {
    if (product.is_active) {
      await deactivate(product.id)
    } else {
      await reactivate(product.id)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return
    await remove(id)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategories(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Tag className="w-5 h-5" />
            <span className="hidden sm:inline">Categories</span>
          </button>

          {canCreate && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Show Inactive Toggle */}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
            showInactive
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {showInactive ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">Inactive</span>
        </button>
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
            No products found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || categoryFilter
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first product'}
          </p>
          {canCreate && !searchQuery && !categoryFilter && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SKU / Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredProducts.map(product => (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      !product.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                        {!product.is_active && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatUnitType(product.unit_type)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatPrice(product.base_price)}
                      </div>
                      <div className="text-xs text-slate-500">BTW {product.tax_rate}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleToggleActive(product)}
                              className={`p-2 rounded-lg transition-colors ${
                                product.is_active
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                              title={product.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {product.is_active ? (
                                <ToggleRight className="w-5 h-5" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${
                  !product.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">{product.name}</h3>
                    {product.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {product.category.name}
                      </span>
                    )}
                    {!product.is_active && (
                      <span className="inline-block mt-1 ml-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatPrice(product.base_price)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatUnitType(product.unit_type)}
                    </div>
                  </div>
                </div>

                {(product.sku || product.barcode) && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.sku && product.barcode && <span className="mx-2">|</span>}
                    {product.barcode && (
                      <span className="font-mono text-xs">{product.barcode}</span>
                    )}
                  </div>
                )}

                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            product.is_active
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          }`}
                        >
                          {product.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                      </>
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
            refresh() // Refresh products in case category changes affected them
          }}
        />
      )}
    </div>
  )
}
