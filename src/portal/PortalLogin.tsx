import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail, Lock, Building2, AlertCircle, Sun, Moon } from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import LanguageSelector from '../components/LanguageSelector'

export default function PortalLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, loading, error, clearError } = usePortalAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await signIn(email, password)
      navigate('/portal')
    } catch {
      // Error is handled by context
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-green-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Building2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">MelekHalalFood</h1>
              <p className="text-green-200">{t('portal.title')}</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            {t('portal.login.welcome')}
          </h2>

          <ul className="space-y-4 text-lg">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              {t('portal.login.feature1')}
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              {t('portal.login.feature2')}
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              {t('portal.login.feature3')}
            </li>
          </ul>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with language and theme */}
        <div className="flex justify-end items-center gap-2 p-4">
          <LanguageSelector />
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">MelekHalalFood</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('portal.title')}</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('portal.login.title')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {t('portal.login.subtitle')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('portal.login.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('portal.login.emailPlaceholder')}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('portal.login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('portal.login.passwordPlaceholder')}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link
                  to="/portal/forgot-password"
                  className="text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  {t('portal.login.forgotPassword')}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('portal.login.signingIn')}
                  </>
                ) : (
                  t('portal.login.signIn')
                )}
              </button>
            </form>

            {/* Admin Link */}
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('portal.login.adminLink')}{' '}
              <Link to="/login" className="text-green-600 dark:text-green-400 hover:underline">
                {t('portal.login.adminLoginLink')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} MelekHalalFood
        </div>
      </div>
    </div>
  )
}
