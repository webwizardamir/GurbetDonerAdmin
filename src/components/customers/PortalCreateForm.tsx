// Portal account creation form.
// Handles email and password input with generate password functionality.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  Lock,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'

interface PortalCreateFormProps {
  defaultEmail: string
  actionLoading: boolean
  onSubmit: (email: string, password: string) => Promise<void>
  onCancel: () => void
}

export default function PortalCreateForm({
  defaultEmail,
  actionLoading,
  onSubmit,
  onCancel,
}: PortalCreateFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const generatePassword = () => {
    const length = 12
    const lowercase = 'abcdefghijkmnpqrstuvwxyz'
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const numbers = '23456789'
    const special = '!@#$%&*'
    const all = lowercase + uppercase + numbers + special

    let pw = ''
    pw += lowercase[Math.floor(Math.random() * lowercase.length)]
    pw += uppercase[Math.floor(Math.random() * uppercase.length)]
    pw += numbers[Math.floor(Math.random() * numbers.length)]
    pw += special[Math.floor(Math.random() * special.length)]

    for (let i = 4; i < length; i++) {
      pw += all[Math.floor(Math.random() * all.length)]
    }

    pw = pw.split('').sort(() => Math.random() - 0.5).join('')
    setPassword(pw)
    setShowPassword(true)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('portal.access.email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('portal.access.emailPlaceholder')}
            required
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('portal.access.password')}
          </label>
          <button type="button" onClick={generatePassword}
            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />{t('portal.access.generate')}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('portal.access.passwordPlaceholder')}
            required minLength={8}
            className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {password && (
              <button type="button" onClick={() => copyToClipboard(password, 'form-password')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t('common.copy')}>
                {copiedField === 'form-password' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            )}
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={actionLoading}
          className="flex-1 min-w-0 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          {actionLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />{t('portal.access.creating')}</>) : t('portal.access.enable')}
        </button>
        <button type="button" onClick={onCancel}
          className="shrink-0 px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded-xl transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
