// Document numbering tab for document settings.
// Configures prefix and next number for each document type.

import { useTranslation } from 'react-i18next'
import type { DocumentSettings } from '../../types'

export interface NumberingTabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
}

interface NumberingSection {
  titleKey: string
  prefixKey: keyof DocumentSettings
  numberKey: keyof DocumentSettings
  defaultPrefix: string
  previewLabelKey: string
}

const SECTIONS: NumberingSection[] = [
  {
    titleKey: 'settings.documents.numbering.invoice',
    prefixKey: 'invoice_prefix',
    numberKey: 'invoice_next_number',
    defaultPrefix: 'INV-',
    previewLabelKey: 'settings.documents.numbering.nextInvoice',
  },
  {
    titleKey: 'settings.documents.numbering.proforma',
    prefixKey: 'proforma_prefix',
    numberKey: 'proforma_next_number',
    defaultPrefix: 'PRO-',
    previewLabelKey: 'settings.documents.numbering.nextProforma',
  },
  {
    titleKey: 'settings.documents.numbering.creditNote',
    prefixKey: 'credit_note_prefix',
    numberKey: 'credit_note_next_number',
    defaultPrefix: 'CN-',
    previewLabelKey: 'settings.documents.numbering.nextCreditNote',
  },
  {
    titleKey: 'settings.documents.numbering.packingSlip',
    prefixKey: 'packing_slip_prefix',
    numberKey: 'packing_slip_next_number',
    defaultPrefix: 'PS-',
    previewLabelKey: 'settings.documents.numbering.nextPackingSlip',
  },
  {
    titleKey: 'settings.documents.numbering.orderConfirmation',
    prefixKey: 'order_confirmation_prefix',
    numberKey: 'order_confirmation_next_number',
    defaultPrefix: 'OB-',
    previewLabelKey: 'settings.documents.numbering.nextOrderConfirmation',
  },
  {
    titleKey: 'settings.documents.numbering.paymentReminder',
    prefixKey: 'payment_reminder_prefix',
    numberKey: 'payment_reminder_next_number',
    defaultPrefix: 'HR-',
    previewLabelKey: 'settings.documents.numbering.nextPaymentReminder',
  },
]

export default function NumberingTab({ formData, onChange }: NumberingTabProps) {
  const { t } = useTranslation()
  const orderNext = (formData.order_next_number as number) || 1
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.numbering.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.documents.numbering.description')}
        </p>
      </div>

      {/* Order numbering — plain WooCommerce-style counter (no prefix/padding).
          Rendered separately from the document sections below. */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-1">
          {t('settings.documents.numbering.order')}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {t('settings.documents.numbering.orderHint')}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.documents.numbering.nextOrderNumber')}
            </label>
            <input
              type="number"
              min="1"
              value={orderNext}
              onChange={e => onChange('order_next_number', parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.documents.numbering.nextOrder')}: <span className="font-mono font-medium">{orderNext}</span>
        </p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => {
          const prefix = (formData[section.prefixKey] as string) || section.defaultPrefix
          const number = (formData[section.numberKey] as number) || 1

          return (
            <div key={section.prefixKey} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
                {t(section.titleKey)}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('settings.documents.numbering.prefix')}
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={e => onChange(section.prefixKey, e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('settings.documents.numbering.nextNumber')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={number}
                    onChange={e => onChange(section.numberKey, parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t(section.previewLabelKey)}: <span className="font-mono font-medium">{prefix}{String(number).padStart(5, '0')}</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
