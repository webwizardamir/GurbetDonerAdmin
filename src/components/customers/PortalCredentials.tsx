// Portal credentials display section.
// Shows the created portal login credentials with copy and email actions.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Lock,
  Send,
} from 'lucide-react'
import type { Customer } from '../../types'

interface PortalCredentialsProps {
  customer: Customer
  credentials: { email: string; password: string }
  portalUrl: string
  onDone: () => void
}

export default function PortalCredentials({
  customer,
  credentials,
  portalUrl,
  onDone,
}: PortalCredentialsProps) {
  const { t } = useTranslation()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyAllCredentials = async () => {
    const text = `${t('portal.access.portalLink')}: ${portalUrl}
${t('portal.access.email')}: ${credentials.email}
${t('portal.access.password')}: ${credentials.password}`
    await copyToClipboard(text, 'all')
  }

  const sendViaEmail = () => {
    const subject = encodeURIComponent(t('portal.access.emailSubject', { company: 'Melek Halal Food' }))
    const body = encodeURIComponent(
      `${t('portal.access.emailGreeting', { name: customer.company_name })}\n\n` +
      `${t('portal.access.emailIntro')}\n\n` +
      `${t('portal.access.portalLink')}: ${portalUrl}\n` +
      `${t('portal.access.email')}: ${credentials.email}\n` +
      `${t('portal.access.password')}: ${credentials.password}\n\n` +
      `${t('portal.access.emailOutro')}\n\n` +
      `${t('portal.access.emailSignature')}`
    )
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const CopyButton = ({ field, text }: { field: string; text: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
      title={t('common.copy')}
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-slate-400" />
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        <p className="font-medium text-green-700 dark:text-green-400">{t('portal.access.created')}</p>
      </div>

      <div className="space-y-3">
        {/* Portal Link */}
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('portal.access.portalLink')}</span>
            <CopyButton field="link" text={portalUrl} />
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 dark:text-green-400 hover:underline break-all">{portalUrl}</a>
          </div>
        </div>

        {/* Email */}
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('portal.access.email')}</span>
            <CopyButton field="email" text={credentials.email} />
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-900 dark:text-white break-all">{credentials.email}</span>
          </div>
        </div>

        {/* Password */}
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('portal.access.password')}</span>
            <CopyButton field="password" text={credentials.password} />
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-900 dark:text-white font-mono">{credentials.password}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={copyAllCredentials}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          {copiedField === 'all' ? (<><Check className="w-4 h-4 text-green-600" />{t('portal.access.copied')}</>) : (<><Copy className="w-4 h-4" />{t('portal.access.copyAll')}</>)}
        </button>
        <button onClick={sendViaEmail}
          className="flex-1 py-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />{t('portal.access.sendEmail')}
        </button>
      </div>

      <button onClick={onDone}
        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
        {t('common.done')}
      </button>
    </div>
  )
}
