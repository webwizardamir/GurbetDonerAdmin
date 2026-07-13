import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail, KeyRound, Building2, AlertCircle, Sun, Moon, ArrowLeft } from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import LanguageSelector from '../components/LanguageSelector'

export default function PortalLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestCode, verifyCode, loading, error, clearError } = usePortalAuth()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }

  // Step 1 — request a login code. Always advances to the code step on success
  // (enumeration-safe: we never reveal whether the email is a customer).
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setNotice(null)
    setRequesting(true)
    try {
      const { rateLimited } = await requestCode(email)
      setStep('code')
      setNotice(rateLimited ? t('portal.login.rateLimited') : t('portal.login.codeSent', { email }))
    } catch {
      setNotice(t('portal.login.requestError'))
    } finally {
      setRequesting(false)
    }
  }

  // Step 2 — verify the code and open the session.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verifyCode(email, code, rememberMe)
      navigate('/portal')
    } catch {
      // Error surfaced by context (invalid/expired code).
    }
  }

  const backToEmail = () => {
    clearError()
    setNotice(null)
    setCode('')
    setStep('email')
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
                {step === 'email' ? t('portal.login.heading') : t('portal.login.codeHeading')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {step === 'email' ? t('portal.login.subtitle') : t('portal.login.codeSubtitle')}
              </p>
            </div>

            {/* Error Message (invalid/expired code, etc.) */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Generic notice (enumeration-safe "we sent a code") */}
            {notice && !error && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
                <Mail className="w-5 h-5 shrink-0" />
                <p className="text-sm">{notice}</p>
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleRequestCode} className="space-y-5">
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
                      autoComplete="email"
                      inputMode="email"
                      autoFocus
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t('portal.login.rememberMe')}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={requesting}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  {requesting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{t('portal.login.sending')}</>
                  ) : (
                    t('portal.login.sendCode')
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('portal.login.codeLabel')}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder={t('portal.login.codePlaceholder')}
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      autoFocus
                      className="w-full pl-12 pr-4 py-3 text-center text-lg tracking-[0.4em] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{t('portal.login.verifying')}</>
                  ) : (
                    t('portal.login.verify')
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={backToEmail} className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <ArrowLeft className="w-4 h-4" />{t('portal.login.changeEmail')}
                  </button>
                  <button type="button" onClick={() => handleRequestCode(new Event('submit') as unknown as React.FormEvent)} disabled={requesting} className="text-green-600 dark:text-green-400 hover:underline disabled:opacity-50">
                    {t('portal.login.resend')}
                  </button>
                </div>
              </form>
            )}

            {/* No account → contact us (with self-service hint) */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">{t('portal.login.noAccount')}</p>
              <p className="mt-1">
                {t('portal.login.noAccountHelp')}{' '}
                <a href="mailto:info@melekhalalfood.nl" className="text-green-600 dark:text-green-400 hover:underline">info@melekhalalfood.nl</a>
                {' · '}
                <a href="tel:+31712001287" className="text-green-600 dark:text-green-400 hover:underline">071 200 1287</a>
              </p>
            </div>

            {/* Admin Link */}
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
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
