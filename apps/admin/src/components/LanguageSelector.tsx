import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown, Check } from 'lucide-react'

const languages = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
]

interface LanguageSelectorProps {
  /**
   * 'compact' (default) - icon + flag + chevron, for the desktop header.
   * 'full'    - full-width row showing the language name, for the sidebar
   *             footer where there is room and the label reads better.
   */
  variant?: 'compact' | 'full'
  /**
   * Which way the menu opens. The sidebar footer sits at the bottom of the
   * viewport, so a downward menu would be clipped off-screen.
   */
  placement?: 'down' | 'up'
}

export default function LanguageSelector({ variant = 'compact', placement = 'down' }: LanguageSelectorProps = {}) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    setIsOpen(false)
  }

  const isFull = variant === 'full'

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${
          isFull ? 'w-full px-3 py-2' : 'px-3 py-2'
        }`}
        title={t('header.changeLanguage')}
        aria-label={t('header.changeLanguage')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4 shrink-0" />
        {isFull ? (
          <>
            <span className="shrink-0">{currentLang.flag}</span>
            <span className="flex-1 text-left truncate">{currentLang.name}</span>
          </>
        ) : (
          <span className="hidden sm:inline">{currentLang.flag}</span>
        )}
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in duration-200 ${
            placement === 'up'
              ? 'bottom-full mb-1 left-0 slide-in-from-bottom-2'
              : 'top-full mt-1 slide-in-from-top-2'
          }`}
        >
          {languages.map(lang => (
            <button
              key={lang.code}
              role="menuitem"
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                i18n.language === lang.code
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {i18n.language === lang.code && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
