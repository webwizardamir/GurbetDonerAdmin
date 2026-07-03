import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import type { DocumentSettings, EmailDocumentType, EmailLang, LocalizedEmailTemplates } from '../../types'
import { getTemplate, normalizeEmailTemplates, PLACEHOLDER_KEYS } from '../../services/documentEmail'
import LangTabs from './LangTabs'

const DOC_TYPES: EmailDocumentType[] = [
  'invoice',
  'proforma',
  'credit_note',
  'order_confirmation',
  'payment_reminder',
  'packing_slip',
]

interface EmailTabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
  onTemplatesChange: (templates: LocalizedEmailTemplates) => void
}

export default function EmailTab({ formData, onChange, onTemplatesChange }: EmailTabProps) {
  const { t } = useTranslation()
  const [lang, setLang] = useState<EmailLang>('nl')
  const localized = normalizeEmailTemplates(formData.email_templates)
  const templates = localized[lang]

  const updateTemplate = (type: EmailDocumentType, key: 'subject' | 'body', value: string) => {
    const existing = templates[type] ?? { subject: '', body: '' }
    const nextLang = { ...templates, [type]: { ...existing, [key]: value } }
    onTemplatesChange({ ...localized, [lang]: nextLang })
  }

  const placeholderChips = useMemo(() => PLACEHOLDER_KEYS.map(k => `{{${k}}}`), [])

  return (
    <div className="space-y-6">
      {/* Language selector — NL for NL/BE customers, EN for the rest */}
      <div className="space-y-1">
        <LangTabs lang={lang} onChange={setLang} label={t('settings.documents.email.templateLanguage')} />
        <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">{t('settings.documents.email.languageHint')}</p>
      </div>

      {/* Resend secret notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p>{t('settings.documents.email.resendNotice')}</p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Supabase Studio → Edge Functions → <code className="font-mono">send-document-email</code> → Secrets → <code className="font-mono">RESEND_API_KEY</code>
          </p>
        </div>
      </div>

      {/* BCC */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('settings.documents.email.bccLabel')}
        </label>
        <input
          type="email"
          value={formData.email_bcc ?? ''}
          onChange={e => onChange('email_bcc', e.target.value)}
          placeholder="archive@melekhalalfood.com"
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.documents.email.bccHint')}
        </p>
      </div>

      {/* Placeholder chips */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.documents.email.placeholdersTitle')}
        </p>
        <div className="flex flex-wrap gap-1">
          {placeholderChips.map(p => (
            <code key={p} className="px-2 py-0.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">
              {p}
            </code>
          ))}
        </div>
      </div>

      {/* Per-type templates */}
      {DOC_TYPES.map(type => {
        const effective = getTemplate(localized, type, lang)
        const subject = templates[type]?.subject ?? ''
        const body    = templates[type]?.body    ?? ''
        const isDefault = !subject && !body
        return (
          <div key={type} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t(`settings.documents.email.types.${type}`)}
              </h3>
              {isDefault && (
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {t('settings.documents.email.usingDefault')}
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('settings.documents.email.subjectLabel')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => updateTemplate(type, 'subject', e.target.value)}
                placeholder={effective.subject}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('settings.documents.email.bodyLabel')}
              </label>
              <textarea
                value={body}
                onChange={e => updateTemplate(type, 'body', e.target.value)}
                placeholder={effective.body}
                rows={6}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
