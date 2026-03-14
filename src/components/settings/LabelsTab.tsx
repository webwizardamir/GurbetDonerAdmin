// Document labels tab for document settings.
// Customizes all text labels that appear on generated documents (Dutch defaults).

import { useTranslation } from 'react-i18next'
import type { DocumentSettings } from '../../types'

export interface LabelsTabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
}

interface LabelField {
  key: string
  labelKey: string
  default: string
}

interface LabelGroup {
  titleKey: string
  fields: LabelField[]
}

const LABEL_GROUPS: LabelGroup[] = [
  {
    titleKey: 'settings.documents.labels.documentTitles',
    fields: [
      { key: 'label_invoice', labelKey: 'settings.documents.labels.invoiceTitle', default: 'FACTUUR' },
      { key: 'label_proforma', labelKey: 'settings.documents.labels.proformaTitle', default: 'PROFORMA' },
      { key: 'label_credit_note', labelKey: 'settings.documents.labels.creditNoteTitle', default: 'CREDITNOTA' },
      { key: 'label_packing_slip', labelKey: 'settings.documents.labels.packingSlipTitle', default: 'PAKBON' },
      { key: 'label_order_confirmation', labelKey: 'settings.documents.labels.orderConfirmationTitle', default: 'ORDERBEVESTIGING' },
      { key: 'label_payment_reminder', labelKey: 'settings.documents.labels.paymentReminderTitle', default: 'BETALINGSHERINNERING' },
    ],
  },
  {
    titleKey: 'settings.documents.labels.headerLabels',
    fields: [
      { key: 'label_invoice_address', labelKey: 'settings.documents.labels.invoiceAddressLabel', default: 'FACTUURADRES' },
      { key: 'label_date', labelKey: 'settings.documents.labels.dateLabel', default: 'Datum' },
      { key: 'label_customer_number', labelKey: 'settings.documents.labels.customerNumberLabel', default: 'Klantnummer' },
      { key: 'label_due_date', labelKey: 'settings.documents.labels.dueDateLabel', default: 'Vervaldatum' },
    ],
  },
  {
    titleKey: 'settings.documents.labels.tableHeaders',
    fields: [
      { key: 'label_description', labelKey: 'settings.documents.labels.descriptionLabel', default: 'Omschrijving' },
      { key: 'label_quantity', labelKey: 'settings.documents.labels.quantityLabel', default: 'Aantal' },
      { key: 'label_unit', labelKey: 'settings.documents.labels.unitLabel', default: 'Eenheid' },
      { key: 'label_unit_price', labelKey: 'settings.documents.labels.unitPriceLabel', default: 'Prijs' },
      { key: 'label_vat', labelKey: 'settings.documents.labels.vatLabel', default: 'BTW' },
      { key: 'label_total', labelKey: 'settings.documents.labels.totalLabel', default: 'Totaal' },
    ],
  },
  {
    titleKey: 'settings.documents.labels.totals',
    fields: [
      { key: 'label_subtotal', labelKey: 'settings.documents.labels.subtotalLabel', default: 'Subtotaal' },
      { key: 'label_grand_total', labelKey: 'settings.documents.labels.grandTotalLabel', default: 'Totaal te betalen' },
    ],
  },
  {
    titleKey: 'settings.documents.labels.paymentSection',
    fields: [
      { key: 'label_payment_method', labelKey: 'settings.documents.labels.paymentMethodHeader', default: 'BETAALWIJZE (AANKRUISEN)' },
      { key: 'label_cash', labelKey: 'settings.documents.labels.cashOption', default: 'Contant' },
      { key: 'label_bank', labelKey: 'settings.documents.labels.bankOption', default: 'Bank' },
      { key: 'label_on_account', labelKey: 'settings.documents.labels.onAccountOption', default: 'Op rekening' },
    ],
  },
  {
    titleKey: 'settings.documents.labels.approvalSection',
    fields: [
      { key: 'label_for_approval', labelKey: 'settings.documents.labels.approvalHeader', default: 'VOOR AKKOORD' },
      { key: 'label_name', labelKey: 'settings.documents.labels.nameField', default: 'Naam' },
      { key: 'label_signature', labelKey: 'settings.documents.labels.signatureField', default: 'Handtekening' },
    ],
  },
]

export default function LabelsTab({ formData, onChange }: LabelsTabProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.labels.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.documents.labels.description')}
        </p>
      </div>

      {LABEL_GROUPS.map(group => (
        <div key={group.titleKey} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            {t(group.titleKey)}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t(field.labelKey)}
                </label>
                <input
                  type="text"
                  value={(formData as Record<string, unknown>)[field.key] as string || field.default}
                  onChange={e => onChange(field.key as keyof DocumentSettings, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={field.default}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
