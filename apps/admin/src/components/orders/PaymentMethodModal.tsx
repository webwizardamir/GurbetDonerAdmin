import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, Building2, Loader2 } from 'lucide-react'
import type { PaymentMethod } from '../../types'
import Modal from '../ui/Modal'

interface PaymentMethodModalProps {
  orderNumber: string
  onConfirm: (method: PaymentMethod) => void
  onCancel: () => void
  loading?: boolean
  /**
   * 'complete' — asked while completing an order (the original use): nothing is
   *   preselected, so the choice is deliberate, and the CTA completes the order.
   * 'edit' — correcting the method afterwards: preselected with the current
   *   value and the CTA just saves. Same options either way.
   */
  mode?: 'complete' | 'edit'
  /** Current value, preselected in 'edit' mode. */
  current?: PaymentMethod | null
}

export default function PaymentMethodModal({
  orderNumber,
  onConfirm,
  onCancel,
  loading = false,
  mode = 'complete',
  current = null,
}: PaymentMethodModalProps) {
  const { t } = useTranslation()
  const isEdit = mode === 'edit'
  const [selected, setSelected] = useState<PaymentMethod | null>(
    isEdit && current && current !== 'none' ? current : null,
  )

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={loading ? () => {} : onCancel}
      title={isEdit ? t('orders.paymentModal.editTitle') : t('orders.paymentModal.title')}
      maxWidth="max-w-sm"
    >
        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {t('orders.paymentModal.orderLabel')} <span className="font-semibold text-slate-900 dark:text-white">{orderNumber}</span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {isEdit ? t('orders.paymentModal.editHint') : t('orders.paymentModal.selectMethod')}
          </p>

          {/* Payment Options */}
          <div className="space-y-3">
            {/* Cash Option */}
            <button
              onClick={() => setSelected('cash')}
              disabled={loading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selected === 'cash'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-3 rounded-lg ${
                selected === 'cash'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                <Banknote className={`w-6 h-6 ${
                  selected === 'cash'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${
                  selected === 'cash'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {t('orders.paymentModal.cashTitle')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('orders.paymentModal.cashDesc')}
                </p>
              </div>
            </button>

            {/* Bank Option */}
            <button
              onClick={() => setSelected('bank')}
              disabled={loading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selected === 'bank'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-3 rounded-lg ${
                selected === 'bank'
                  ? 'bg-blue-100 dark:bg-blue-900/40'
                  : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                <Building2 className={`w-6 h-6 ${
                  selected === 'bank'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${
                  selected === 'bank'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {t('orders.paymentModal.bankTitle')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('orders.paymentModal.bankDesc')}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || (isEdit && selected === current) || loading}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEdit ? t('common.saving') : t('orders.paymentModal.completing')}
              </>
            ) : (
              isEdit ? t('common.save') : t('orders.paymentModal.completeOrder')
            )}
          </button>
        </div>
    </Modal>
  )
}
