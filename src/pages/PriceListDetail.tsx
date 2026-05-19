import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchPriceListById } from '../services/priceLists'
import type { PriceList } from '../types'

export default function PriceListDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<PriceList | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    void fetchPriceListById(id).then(setList).finally(() => setLoading(false))
  }, [id])

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
      <Link to="/price-lists" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
        <ChevronLeft className="w-4 h-4" />
        {t('priceLists.backToList')}
      </Link>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{list.name}</h1>
        {list.description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{list.description}</p>
        )}
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-500 italic">
          {t('priceLists.detailComingSoon')}
        </p>
      </div>
    </div>
  )
}
