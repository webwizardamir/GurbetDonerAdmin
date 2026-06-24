// Portal access management modal.
// Orchestrates account creation, credential display, enable/disable, and password reset.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Clock,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react'
import {
  enablePortalAccess,
  createPortalInvite,
  disablePortalAccess,
  reEnablePortalAccess,
  getPortalAccountStatus,
  sendPortalPasswordReset,
  PORTAL_EMAIL_IS_ADMIN,
  PORTAL_EMAIL_IN_USE,
  type CustomerAccount,
} from '../../services/portalAuth'
import type { Customer } from '../../types'
import Modal from '../ui/Modal'
import PortalCredentials from './PortalCredentials'
import PortalCreateForm from './PortalCreateForm'

interface PortalAccessModalProps {
  customer: Customer
  onClose: () => void
  onUpdate: () => void
}

export default function PortalAccessModal({ customer, onClose, onUpdate }: PortalAccessModalProps) {
  const { t } = useTranslation()
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string } | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const portalUrl = `${window.location.origin}/portal/login`

  useEffect(() => { loadAccountStatus() }, [customer.id])

  const loadAccountStatus = async () => {
    setLoading(true)
    try {
      const status = await getPortalAccountStatus(customer.id)
      setAccount(status)
    } catch (err) { console.error('Error loading account status:', err) }
    finally { setLoading(false) }
  }

  const mapEnableError = (err: any): string => {
    const msg = err?.message || 'Failed to enable portal access'
    if (msg === PORTAL_EMAIL_IS_ADMIN) return t('portal.access.emailIsAdmin')
    if (msg === PORTAL_EMAIL_IN_USE) return t('portal.access.emailInUse')
    if (msg.toLowerCase?.().includes('already') && msg.toLowerCase().includes('registered')) {
      return t('portal.access.emailAlreadyRegistered')
    }
    return msg
  }

  const handleEnableAccess = async (email: string, password: string) => {
    setError(null)
    setActionLoading(true)
    try {
      await enablePortalAccess(customer.id, email, password)
      setInviteLink(null)
      setCreatedCredentials({ email, password })
      setShowSuccess(true)
      setShowCreateForm(false)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) {
      setError(mapEnableError(err))
    } finally { setActionLoading(false) }
  }

  const handleInviteAccess = async (email: string) => {
    setError(null)
    setActionLoading(true)
    try {
      const { actionLink } = await createPortalInvite(customer.id, email)
      setInviteLink(actionLink)
      setCreatedCredentials({ email })
      setShowSuccess(true)
      setShowCreateForm(false)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) {
      setError(mapEnableError(err))
    } finally { setActionLoading(false) }
  }

  const handleDisableAccess = async () => {
    setError(null)
    setActionLoading(true)
    try {
      await disablePortalAccess(customer.id)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) { setError(err.message || 'Failed to disable portal access') }
    finally { setActionLoading(false) }
  }

  const handleReEnableAccess = async () => {
    setError(null)
    setActionLoading(true)
    try {
      await reEnablePortalAccess(customer.id)
      await loadAccountStatus()
      onUpdate()
    } catch (err: any) { setError(err.message || 'Failed to re-enable portal access') }
    finally { setActionLoading(false) }
  }

  const handleSendPasswordReset = async () => {
    if (!account?.email) return
    setError(null)
    setSendingReset(true)
    try {
      await sendPortalPasswordReset(account.email)
      setResetSent(true)
      setTimeout(() => setResetSent(false), 5000)
    } catch (err: any) { setError(err.message || 'Failed to send password reset') }
    finally { setSendingReset(false) }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) { console.error('Failed to copy:', err) }
  }

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t('portal.access.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{customer.company_name}</p>
          </div>
        </div>
      }
    >
      <div className="p-4 overflow-y-auto max-h-[calc(90vh-5rem)]">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" /><p className="text-sm">{error}</p>
              </div>
            )}

            {/* No Account */}
            {!account && !showCreateForm && !showSuccess && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{t('portal.access.noAccess')}</p>
                <button onClick={() => setShowCreateForm(true)}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
                  {t('portal.access.enable')}
                </button>
              </div>
            )}

            {/* Create Form */}
            {!account && showCreateForm && !showSuccess && (
              <PortalCreateForm
                defaultEmail={customer.email || ''}
                actionLoading={actionLoading}
                onSubmitPassword={handleEnableAccess}
                onSubmitInvite={handleInviteAccess}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {/* Success State */}
            {showSuccess && createdCredentials && (
              <PortalCredentials
                customer={customer}
                credentials={createdCredentials}
                portalUrl={portalUrl}
                inviteLink={inviteLink || undefined}
                onDone={() => { setShowSuccess(false); setCreatedCredentials(null); setInviteLink(null) }}
              />
            )}

            {/* Account Active */}
            {account && account.is_active && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-green-700 dark:text-green-400">{t('portal.access.enabled')}</p>
                    <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {t('portal.access.lastLogin')}: {formatLastLogin(account.last_login_at)}
                    </div>
                  </div>
                </div>

                {account.email && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('portal.access.portalEmail')}</span>
                      <button onClick={() => copyToClipboard(account.email!, 'portal-email')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors" title={t('common.copy')}>
                        {copiedField === 'portal-email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-900 dark:text-white break-all">{account.email}</span>
                    </div>
                  </div>
                )}

                {resetSent && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t('portal.access.resetSent')}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {account.email && (
                    <button onClick={handleSendPasswordReset} disabled={sendingReset || resetSent}
                      className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {sendingReset ? <Loader2 className="w-4 h-4 animate-spin" /> : resetSent ? (<><Check className="w-4 h-4" />{t('portal.access.resetSent')}</>) : (<><KeyRound className="w-4 h-4" />{t('portal.access.sendResetLink')}</>)}
                    </button>
                  )}
                  <button onClick={handleDisableAccess} disabled={actionLoading}
                    className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><XCircle className="w-4 h-4" />{t('portal.access.disable')}</>)}
                  </button>
                </div>
              </div>
            )}

            {/* Account Disabled */}
            {account && !account.is_active && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <XCircle className="w-6 h-6 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{t('portal.access.disabled')}</p>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {t('portal.access.lastLogin')}: {formatLastLogin(account.last_login_at)}
                    </div>
                  </div>
                </div>

                {account.email && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('portal.access.portalEmail')}</span>
                      <button onClick={() => copyToClipboard(account.email!, 'portal-email-disabled')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors" title={t('common.copy')}>
                        {copiedField === 'portal-email-disabled' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-900 dark:text-white break-all">{account.email}</span>
                    </div>
                  </div>
                )}

                <button onClick={handleReEnableAccess} disabled={actionLoading}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><CheckCircle className="w-4 h-4" />{t('portal.access.reEnable')}</>)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
