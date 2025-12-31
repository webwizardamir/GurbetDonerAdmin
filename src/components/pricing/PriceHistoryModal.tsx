import { X, Loader2, History, ArrowRight } from 'lucide-react'
import { usePriceHistory } from '../../hooks/usePricing'

interface PriceHistoryModalProps {
  customerPriceId: string
  onClose: () => void
}

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PriceHistoryModal({ customerPriceId, onClose }: PriceHistoryModalProps) {
  const { history, loading, error } = usePriceHistory(customerPriceId)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Price History
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No price history available
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.old_price != null ? (
                        <>
                          <span className="text-slate-500 dark:text-slate-400 line-through">
                            {formatPrice(entry.old_price)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatPrice(entry.new_price)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Initial price
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatPrice(entry.new_price)}
                          </span>
                        </>
                      )}
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(entry.changed_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
