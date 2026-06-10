// Bank and payment details tab for document settings.
// Handles bank info, payment terms, and document footer text.

import { useTranslation } from 'react-i18next'
import type { DocumentSettings } from '../../types'

export interface BankPaymentTabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
}

export default function BankPaymentTab({ formData, onChange }: BankPaymentTabProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.bank.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.documents.bank.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.bank.bankName')}
          </label>
          <input
            type="text"
            value={formData.bank_name || ''}
            onChange={e => onChange('bank_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.bank.bankNamePlaceholder')}
          />
        </div>

        {/* Account Holder */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.bank.accountHolder')}
          </label>
          <input
            type="text"
            value={formData.bank_account_holder || ''}
            onChange={e => onChange('bank_account_holder', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.bank.accountHolderPlaceholder')}
          />
        </div>

        {/* IBAN */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.bank.iban')}
          </label>
          <input
            type="text"
            value={formData.bank_iban || ''}
            onChange={e => onChange('bank_iban', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            placeholder={t('settings.documents.bank.ibanPlaceholder')}
          />
        </div>

        {/* BIC */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.bank.bic')}
          </label>
          <input
            type="text"
            value={formData.bank_bic || ''}
            onChange={e => onChange('bank_bic', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            placeholder={t('settings.documents.bank.bicPlaceholder')}
          />
        </div>
      </div>

      {/* Payment Terms */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.bank.paymentTerms')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.documents.bank.paymentDueDays')}
            </label>
            <input
              type="number"
              min="0"
              value={formData.payment_terms_days || 14}
              onChange={e => onChange('payment_terms_days', parseInt(e.target.value) || 14)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('settings.documents.bank.dueDateNote')}
            </p>
          </div>

          {/* Terms Text */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.documents.bank.paymentTermsText')}
            </label>
            <textarea
              value={formData.payment_terms_text || ''}
              onChange={e => onChange('payment_terms_text', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder={t('settings.documents.bank.paymentTermsPlaceholder')}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('settings.documents.bank.paymentTermsTextHint')}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.bank.documentFooter')}
        </h4>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.bank.footerLabel')}
          </label>
          <textarea
            value={formData.footer_text || ''}
            onChange={e => onChange('footer_text', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder={t('settings.documents.bank.footerPlaceholder')}
          />
        </div>
      </div>
    </div>
  )
}
