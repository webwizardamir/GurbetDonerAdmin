import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Loader2, AlertCircle, Upload, FileDown, Trash2, Package,
} from 'lucide-react'
import {
  fetchPriceListById,
  fetchPriceListItems,
  deletePriceListItem,
  type PriceListItemWithProduct,
} from '../services/priceLists'
import { downloadCurrentPriceList } from '../utils/priceListTemplate'
import PriceListImport from '../components/priceLists/PriceListImport'
import type { PriceList } from '../types'
import { formatPrice } from '../utils/format'

export default function PriceListDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<PriceList | null>(null)
  const [items, setItems] = useState<PriceListItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [l, it] = await Promise.all([
        fetchPriceListById(id),
        fetchPriceListItems(id),
      ])
      setList(l)
      setItems(it)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const handleDeleteItem = async (item: PriceListItemWithProduct) => {
    if (!confirm(t('priceLists.detail.confirmDeleteItem', { name: item.product?.name ?? '' }))) return
    try {
      await deletePriceListItem(item.id)
      await load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const handleDownloadTemplate = async () => {
    if (downloadingTemplate || !list) return
    setDownloadingTemplate(true)
    try {
      await downloadCurrentPriceList(list.id, list.name)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <Link to="/price-lists" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
          <ChevronLeft className="w-4 h-4" />
          {t('priceLists.backToList')}
        </Link>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-slate-600 dark:text-slate-400">{t('priceLists.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link to="/price-lists" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
        <ChevronLeft className="w-4 h-4" />
        {t('priceLists.backToList')}
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{list.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              list.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {list.is_active ? t('priceLists.active') : t('priceLists.inactive')}
            </span>
          </div>
          {list.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{list.description}</p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            {t('priceLists.detail.itemsCount', { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            {downloadingTemplate
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('priceLists.detail.downloadTemplate')}</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>{t('priceLists.detail.importItems')}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">{t('priceLists.detail.noItems')}</p>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t('priceLists.detail.importItems')}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.productId')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.productName')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.unit')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.price')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.tax')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-white">
                    {item.product?.product_code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {item.product?.name ?? t('priceLists.detail.deletedProduct')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {item.unit_type}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900 dark:text-white tabular-nums font-medium">
                    {formatPrice(item.price_cents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {item.tax_rate != null
                      ? `${item.tax_rate}%`
                      : <span className="text-slate-400 dark:text-slate-600 italic">{t('priceLists.detail.inheritTax')}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <PriceListImport
          priceListId={list.id}
          priceListName={list.name}
          onClose={() => setShowImport(false)}
          onComplete={() => { setShowImport(false); void load() }}
        />
      )}
    </div>
  )
}
