import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2, AlertCircle, Leaf } from 'lucide-react'
import { tenant } from '../config/tenant'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        if (signInError.includes('Invalid login credentials')) {
          setError(t('auth.invalidCredentials'))
        } else if (signInError.includes('Email not confirmed')) {
          setError(t('auth.emailNotConfirmed'))
        } else {
          setError(signInError)
        }
        return
      }

      // Redirect to dashboard on success
      navigate('/')
    } catch (err) {
      setError(t('auth.unexpectedError'))
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      {/* Brand gradient uses only the green ramp (not emerald) so it re-themes
          per tenant -- see config/tenant.ts + the palette block in index.css. */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-green-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl" />
        </div>

        {/* Floating leaves decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Leaf className="absolute top-[15%] left-[20%] w-8 h-8 text-white/20 rotate-45" />
          <Leaf className="absolute top-[35%] right-[25%] w-6 h-6 text-white/15 -rotate-12" />
          <Leaf className="absolute bottom-[25%] left-[30%] w-10 h-10 text-white/10 rotate-90" />
          <Leaf className="absolute bottom-[40%] right-[15%] w-7 h-7 text-white/20 rotate-180" />
          <Leaf className="absolute top-[60%] left-[15%] w-5 h-5 text-white/15 -rotate-45" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <img
              src={tenant.logo}
              alt={tenant.logoAlt}
              className="h-24 w-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            {t('auth.welcome')}<br />
            <span className="text-green-200">{tenant.name}</span>
          </h1>
          <p className="text-lg text-green-100/80 max-w-md leading-relaxed">
            {t('auth.tagline')} {t('auth.manageOrders')}
          </p>

          {/* Features list */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 text-green-100/90">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t('auth.features.realTimeOrders')}</span>
            </div>
            <div className="flex items-center gap-3 text-green-100/90">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t('auth.features.customerPricing')}</span>
            </div>
            <div className="flex items-center gap-3 text-green-100/90">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t('auth.features.professionalInvoicing')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src={tenant.logo}
              alt={tenant.logoAlt}
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {tenant.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              B2B Wholesale Portal
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('auth.signIn')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t('auth.enterCredentials')}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t('auth.rememberMe')}
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/25 hover:shadow-green-600/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          {tenant.supportEmail && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              {t('auth.troubleSigningIn')}{' '}
              <a
                href={`mailto:${tenant.supportEmail}`}
                className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
              >
                {t('auth.contactSupport')}
              </a>
            </p>
          )}

          {/* Copyright */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            {t('auth.copyright', { year: new Date().getFullYear(), company: tenant.name })}
          </p>
        </div>
      </div>
    </div>
  )
}
