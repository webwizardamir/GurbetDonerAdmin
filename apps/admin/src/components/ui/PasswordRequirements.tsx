// Live password-requirements checklist. Shows each rule with a check/□ as the
// user types. Purely presentational — enforcement lives in utils/password.ts.
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { checkPassword } from '../../utils/password'

export default function PasswordRequirements({ password }: { password: string }) {
  const { t } = useTranslation()
  const c = checkPassword(password)
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: c.length, label: t('auth.passwordPolicy.length') },
    { ok: c.upper, label: t('auth.passwordPolicy.upper') },
    { ok: c.lower, label: t('auth.passwordPolicy.lower') },
    { ok: c.digit, label: t('auth.passwordPolicy.digit') },
  ]
  return (
    <ul className="mt-2 space-y-1">
      {items.map((it, i) => (
        <li
          key={i}
          className={`flex items-center gap-1.5 text-xs ${
            it.ok ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {it.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600" />}
          {it.label}
        </li>
      ))}
    </ul>
  )
}
