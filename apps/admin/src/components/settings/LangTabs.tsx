import { Globe } from 'lucide-react'
import type { EmailLang } from '../../types'

// Small segmented NL/EN switch for the email + reminder template editors.
// NL templates are sent to NL/BE customers, EN to everyone else.
const LANGS: { id: EmailLang; label: string }[] = [
  { id: 'nl', label: 'Nederlands (NL/BE)' },
  { id: 'en', label: 'English (overig)' },
]

interface Props {
  lang: EmailLang
  onChange: (lang: EmailLang) => void
  /** Optional leading label (e.g. "Taal") — used where the control isn't next to a heading. */
  label?: string
}

export default function LangTabs({ lang, onChange, label }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
      {label && <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
        {LANGS.map(l => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            aria-pressed={lang === l.id}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              lang === l.id
                ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
