import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MailWarning, ArrowRight } from 'lucide-react'
import { fetchFailedSendSummary } from '../../services/documentEmail'

/**
 * High-priority banner shown on the Dashboard when one or more customer emails
 * failed to actually reach the recipient (bounced / spam-complaint / suppressed
 * / hard-failed) in the recent window. These never surface as an error at send
 * time — Resend accepts the request and only later drops it — so without this
 * the failures are silent. Links straight to the Outbox to investigate.
 *
 * Owner-only in practice: the Dashboard mounts it behind isOwner because the
 * Outbox route is owner-gated.
 */
export default function EmailDeliveryAlert() {
  const { t } = useTranslation()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { count } = await fetchFailedSendSummary(30)
        if (alive) setCount(count)
      } catch {
        /* non-fatal: no banner if the count can't be read */
      }
    })()
    return () => { alive = false }
  }, [])

  if (count === 0) return null

  return (
    <Link
      to="/outbox"
      className="flex items-center gap-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 hover:bg-red-100/70 dark:hover:bg-red-900/30 transition-colors"
    >
      <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl shrink-0">
        <MailWarning className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-red-800 dark:text-red-300">
          {t('dashboard.emailAlert.title', { count })}
        </h3>
        <p className="text-sm text-red-700/90 dark:text-red-300/80">
          {t('dashboard.emailAlert.message')}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-300 shrink-0">
        {t('dashboard.emailAlert.cta')}
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  )
}
