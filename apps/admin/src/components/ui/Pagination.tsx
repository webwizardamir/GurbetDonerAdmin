import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Reusable server-side pagination bar (matches the Orders page pattern):
 * "Showing X-Y of Z" + prev/next + a windowed set of numbered page buttons.
 * Renders nothing when there is only a single page.
 */
export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 7
  const half = Math.floor(maxVisible / 2)

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3">
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
        <span className="hidden sm:inline">{t('common.showing')} </span>
        {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)}{' '}
        <span className="hidden sm:inline">{t('common.of')}</span><span className="sm:hidden">/</span> {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
          let pageNum: number
          if (totalPages <= maxVisible) pageNum = i + 1
          else if (page <= half + 1) pageNum = i + 1
          else if (page >= totalPages - half) pageNum = totalPages - maxVisible + 1 + i
          else pageNum = page - half + i
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                pageNum === page
                  ? 'bg-green-600 text-white font-medium'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
