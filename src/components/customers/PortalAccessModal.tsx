import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Lock,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
} from 'lucide-react'
import {
  enablePortalAccess,
  disablePortalAccess,
  reEnablePortalAccess,
  getPortalAccountStatus,
  type CustomerAccount,
} from '../../services/portalAuth'
import type { Customer } from '../../types'

interface PortalAccessModalProps {
  customer: Customer
  onClose: () => void
  onUpdate: () => void
}

export default function PortalAccessModal({
  customer,
  onClose,
  onUpdate,
}: PortalAccessModalProps) {
  const { t } = useTranslation()
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [email, setEmail] = useState(customer.email || '')
  const [password, setPassword] = useState('')

  // Success state - show credentials after creation
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const portalUrl = `${window.location.origin}/portal/login`

  // Generate a random password
  const generatePassword = () => {
    const length = 12
    const lowercase = 'abcdefghijkmnpqrstuvwxyz' // removed l, o for clarity
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // removed I, O for clarity
    const numbers = '23456789' // removed 0, 1 for clarity
    const special = '!@#$%&*'
    const all = lowercase + uppercase + numbers + special

    let password = ''
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)]
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('')

    setPassword(password)
    setShowPassword(true) // Show password when generated
  }

  useEffect(() => {
    loadAccountStatus()
  }, [customer.id])

  const loadAccountStatus = async () => {
    setLoading(true)
    try {
      const status = await getPortalAccountStatus(customer.id)
      setAccount(status)
    } catch (err) {
      console.error('Error loading account status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEnableAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setActionLoading(true)
    try {
      await enablePortalAccess(customer.id, email, password)
      // Store credentials for display
      setCreatedCredentials({ email, password })
      setShowSuccess(true)
      setShowCreateForm(false)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) {
      setError(err.message || 'Failed to enable portal access')
    } finally {
      setActionLoading(false)
    }
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

  const copyAllCredentials = async () => {
    if (!createdCredentials) return
    const text = `${t('portal.access.portalLink')}: ${portalUrl}
${t('portal.access.email')}: ${createdCredentials.email}
${t('portal.access.password')}: ${createdCredentials.password}`
    await copyToClipboard(text, 'all')
  }

  const sendViaEmail = () => {
    if (!createdCredentials) return

    const subject = encodeURIComponent(t('portal.access.emailSubject', { company: 'Melek Halal Food' }))
    const body = encodeURIComponent(
      `${t('portal.access.emailGreeting', { name: customer.company_name })}\n\n` +
      `${t('portal.access.emailIntro')}\n\n` +
      `${t('portal.access.portalLink')}: ${portalUrl}\n` +
      `${t('portal.access.email')}: ${createdCredentials.email}\n` +
      `${t('portal.access.password')}: ${createdCredentials.password}\n\n` +
      `${t('portal.access.emailOutro')}\n\n` +
      `${t('portal.access.emailSignature')}`
    )

    window.open(`mailto:${createdCredentials.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const handleDisableAccess = async () => {
    setError(null)
    setActionLoading(true)
    try {
      await disablePortalAccess(customer.id)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) {
      setError(err.message || 'Failed to disable portal access')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReEnableAccess = async () => {
    setError(null)
    setActionLoading(true)
    try {
      await reEnablePortalAccess(customer.id)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) {
      setError(err.message || 'Failed to re-enable portal access')
    } finally {
      setActionLoading(false)
    }
  }

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t('portal.access.title')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {customer.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* No Account */}
              {!account && !showCreateForm && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t('portal.access.noAccess')}
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                  >
                    {t('portal.access.enable')}
                  </button>
                </div>
              )}

              {/* Create Form */}
              {!account && showCreateForm && !showSuccess && (
                <form onSubmit={handleEnableAccess} className="space-y-4">
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
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {t('portal.access.generate')}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('portal.access.passwordPlaceholder')}
                        required
                        minLength={8}
                        className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {password && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(password, 'form-password')}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title={t('common.copy')}
                          >
                            {copiedField === 'form-password' ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('portal.access.creating')}
                        </>
                      ) : (
                        t('portal.access.enable')
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded-xl transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {/* Success State - Show Credentials */}
              {showSuccess && createdCredentials && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {t('portal.access.created')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Portal Link */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                          {t('portal.access.portalLink')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(portalUrl, 'link')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedField === 'link' ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 dark:text-green-400 hover:underline break-all"
                        >
                          {portalUrl}
                        </a>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                          {t('portal.access.email')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedField === 'email' ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-900 dark:text-white break-all">
                          {createdCredentials.email}
                        </span>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                          {t('portal.access.password')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          title={t('common.copy')}
                        >
                          {copiedField === 'password' ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-900 dark:text-white font-mono">
                          {createdCredentials.password}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Copy All Button */}
                    <button
                      onClick={copyAllCredentials}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedField === 'all' ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          {t('portal.access.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('portal.access.copyAll')}
                        </>
                      )}
                    </button>

                    {/* Send via Email Button */}
                    <button
                      onClick={sendViaEmail}
                      className="flex-1 py-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {t('portal.access.sendEmail')}
                    </button>
                  </div>

                  {/* Done Button */}
                  <button
                    onClick={() => {
                      setShowSuccess(false)
                      setCreatedCredentials(null)
                      setPassword('')
                    }}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                  >
                    {t('common.done')}
                  </button>
                </div>
              )}

              {/* Account Active */}
              {account && account.is_active && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        {t('portal.access.enabled')}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                        <Clock className="w-3.5 h-3.5" />
                        {t('portal.access.lastLogin')}: {formatLastLogin(account.last_login_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDisableAccess}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        {t('portal.access.disable')}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Account Disabled */}
              {account && !account.is_active && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl">
                    <XCircle className="w-6 h-6 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {t('portal.access.disabled')}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {t('portal.access.lastLogin')}: {formatLastLogin(account.last_login_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleReEnableAccess}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {t('portal.access.reEnable')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
