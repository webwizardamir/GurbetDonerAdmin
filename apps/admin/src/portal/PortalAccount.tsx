import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import { portalUpdatePassword } from '../services/portalAuth'

export default function PortalAccount() {
  const { t } = useTranslation()
  const { user } = usePortalAuth()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const customer = user?.customer

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('portal.account.passwordMismatch'))
      return
    }

    if (newPassword.length < 8) {
      setPasswordError(t('validation.minLength', { min: 8 }))
      return
    }

    setPasswordLoading(true)
    try {
      await portalUpdatePassword(newPassword)
      setPasswordSuccess(true)
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatAddress = (type: 'billing' | 'shipping') => {
    const prefix = type === 'billing' ? 'billing_' : 'shipping_'
    const street = customer?.[`${prefix}street` as keyof typeof customer]
    const city = customer?.[`${prefix}city` as keyof typeof customer]
    const postal = customer?.[`${prefix}postal_code` as keyof typeof customer]
    const country = customer?.[`${prefix}country` as keyof typeof customer]

    if (!street && !city) return null

    return [street, postal && city ? `${postal} ${city}` : city || postal, country]
      .filter(Boolean)
      .join(', ')
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('portal.account.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t('portal.account.subtitle')}
        </p>
      </div>

      {/* Company Information */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            {t('portal.account.companyInfo')}
          </h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.companyName')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {customer?.company_name || '-'}
              </p>
            </div>
          </div>

          {/* Contact Person */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.contactPerson')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {customer?.contact_person || '-'}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.email')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {customer?.email || '-'}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.phone')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {customer?.phone || '-'}
              </p>
            </div>
          </div>

          {/* VAT Number */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.vatNumber')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {customer?.vat_number || '-'}
              </p>
            </div>
          </div>

          {/* Last Login */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.lastLogin')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {formatLastLogin(user?.account.last_login_at || null)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Billing Address */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" />
              {t('portal.account.billingAddress')}
            </h2>
          </div>
          <div className="p-4">
            {formatAddress('billing') ? (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {formatAddress('billing')}
              </p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">
                {t('customerDetail.noAddress')}
              </p>
            )}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" />
              {t('portal.account.shippingAddress')}
            </h2>
          </div>
          <div className="p-4">
            {formatAddress('shipping') ? (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {formatAddress('shipping')}
              </p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">
                {t('customerDetail.noAddress')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" />
            {t('portal.account.changePassword')}
          </h2>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              {t('common.edit')}
            </button>
          )}
        </div>
        <div className="p-4">
          {passwordSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{t('portal.account.passwordUpdated')}</p>
            </div>
          )}

          {showPasswordForm ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
              {passwordError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{passwordError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('portal.account.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('portal.account.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('portal.account.updatePassword')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordError(null)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              ••••••••••••
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
