import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BellRing,
  Clock,
  Send,
  CheckCircle2,
  MoreVertical,
  Loader2,
  ExternalLink,
  RotateCcw,
  BellOff,
  FileText,
} from 'lucide-react'
import { useOverdueInvoices } from '../hooks/useOverdueInvoices'
import { formatPrice, formatDate } from '../utils/format'
import DocumentGenerator from '../components/documents/DocumentGenerator'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { OverdueInvoice } from '../types'

type Filter = 'active' | 'snoozed' | 'all'

// Snooze presets, in days.
const SNOOZE_PRESETS = [3, 7, 14]

export default function OverdueInvoices() {
  const { t } = useTranslation()
  const { invoices, active, snoozed, loading, error, refresh, snooze, unsnooze, markPaid, optOut } =
    useOverdueInvoices()

  const [filter, setFilter] = useState<Filter>('active')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [sendFor, setSendFor] = useState<OverdueInvoice | null>(null)
  const [viewFor, setViewFor] = useState<OverdueInvoice | null>(null)
  const [payFor, setPayFor] = useState<OverdueInvoice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const rows = filter === 'active' ? active : filter === 'snoozed' ? snoozed : invoices

  const stats = useMemo(() => {
    const outstanding = active.reduce((sum, i) => sum + i.total, 0)
    const neverReminded = active.filter(i => i.reminders_sent === 0).length
    return { outstanding, count: active.length, snoozed: snoozed.length, neverReminded }
  }, [active, snoozed])

  const doSnooze = async (orderId: string, days: number) => {
    setBusy(orderId)
    setMenuFor(null)
    try {
      const until = new Date()
      until.setHours(6, 0, 0, 0)
      until.setDate(until.getDate() + days)
      await snooze(orderId, until)
    } finally {
      setBusy(null)
    }
  }

  const doUnsnooze = async (orderId: string) => {
    setBusy(orderId)
    try { await unsnooze(orderId) } finally { setBusy(null) }
  }

  const doOptOut = async (orderId: string) => {
    setBusy(orderId)
    setMenuFor(null)
    try { await optOut(orderId) } finally { setBusy(null) }
  }

  const confirmPaid = async () => {
    if (!payFor) return
    const id = payFor.order_id
    setPayFor(null)
    setBusy(id)
    try { await markPaid(id) } finally { setBusy(null) }
  }

  const severity = (days: number) =>
    days > 30
      ? 'text-red-700 dark:text-red-400'
      : days > 14
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-amber-600 dark:text-amber-400'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="red"
          label={t('overdue.stats.outstanding')}
          value={formatPrice(stats.outstanding)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          tone="amber"
          label={t('overdue.stats.overdueCount')}
          value={String(stats.count)}
        />
        <StatCard
          icon={<BellRing className="w-5 h-5" />}
          tone="blue"
          label={t('overdue.stats.neverReminded')}
          value={String(stats.neverReminded)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          tone="slate"
          label={t('overdue.stats.snoozed')}
          value={String(stats.snoozed)}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['active', 'snoozed', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === f
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t(`overdue.filters.${f}`)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-base font-medium text-slate-900 dark:text-white">
            {t('overdue.empty.title')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('overdue.empty.subtitle')}
          </p>
        </div>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map(inv => {
            const isSnoozed = !!inv.snoozed_until && new Date(inv.snoozed_until).getTime() > Date.now()
            return (
              <div key={inv.order_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/customers/${inv.customer_id}`} className="font-medium text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 truncate block">
                      {inv.customer_name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {inv.invoice_number || inv.order_number} · {formatDate(inv.invoice_due_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900 dark:text-white">{formatPrice(inv.total)}</p>
                    <p className={`text-xs font-semibold ${severity(inv.days_overdue)}`}>{t('overdue.daysLabel', { count: inv.days_overdue })}</p>
                  </div>
                </div>
                {!inv.customer_email && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('overdue.noEmail')}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setViewFor(inv)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                    <FileText className="w-3.5 h-3.5" />{t('overdue.actions.viewInvoice')}
                  </button>
                  {isSnoozed ? (
                    <button onClick={() => doUnsnooze(inv.order_id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                      <RotateCcw className="w-3.5 h-3.5" />{t('overdue.actions.unsnooze')}
                    </button>
                  ) : (
                    <button onClick={() => setSendFor(inv)} disabled={!inv.customer_email} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" />{t('overdue.actions.sendReminder')}
                    </button>
                  )}
                  <button onClick={() => doSnooze(inv.order_id, 7)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />{t('overdue.snoozeDays', { count: 7 })}
                  </button>
                  <button onClick={() => setPayFor(inv)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />{t('overdue.actions.markPaid')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-visible">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <Th>{t('overdue.cols.invoice')}</Th>
                <Th>{t('overdue.cols.customer')}</Th>
                <Th className="text-right">{t('overdue.cols.amount')}</Th>
                <Th>{t('overdue.cols.due')}</Th>
                <Th className="text-center">{t('overdue.cols.overdue')}</Th>
                <Th className="text-center">{t('overdue.cols.reminders')}</Th>
                <Th className="text-right">{t('overdue.cols.actions')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {rows.map(inv => {
                const isSnoozed = !!inv.snoozed_until && new Date(inv.snoozed_until).getTime() > Date.now()
                return (
                  <tr key={inv.order_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/orders/${inv.order_id}/edit`}
                        className="font-medium text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 inline-flex items-center gap-1"
                      >
                        {inv.invoice_number || inv.order_number}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/customers/${inv.customer_id}`}
                        className="text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400"
                      >
                        {inv.customer_name}
                      </Link>
                      {!inv.customer_email && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                          {t('overdue.noEmail')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-white">
                      {formatPrice(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(inv.invoice_due_date)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-center font-semibold ${severity(inv.days_overdue)}`}>
                      {t('overdue.daysLabel', { count: inv.days_overdue })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">
                      {inv.reminders_sent > 0 ? inv.reminders_sent : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="inline-flex items-center gap-1 relative">
                        {busy === inv.order_id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        <button
                          onClick={() => setViewFor(inv)}
                          aria-label={t('overdue.actions.viewInvoice')}
                          title={t('overdue.actions.viewInvoice')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {t('overdue.actions.viewInvoice')}
                        </button>
                        {isSnoozed ? (
                          <button
                            onClick={() => doUnsnooze(inv.order_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            title={t('overdue.snoozedUntil', { date: formatDate(inv.snoozed_until!) })}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t('overdue.actions.unsnooze')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSendFor(inv)}
                            disabled={!inv.customer_email}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {t('overdue.actions.sendReminder')}
                          </button>
                        )}
                        <button
                          onClick={() => setMenuFor(menuFor === inv.order_id ? null : inv.order_id)}
                          aria-label={t('overdue.cols.actions')}
                          aria-haspopup="menu"
                          aria-expanded={menuFor === inv.order_id}
                          title={t('overdue.cols.actions')}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuFor === inv.order_id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                            <div role="menu" className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 text-left">
                              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
                                {t('overdue.actions.snooze')}
                              </div>
                              {SNOOZE_PRESETS.map(d => (
                                <button
                                  key={d}
                                  onClick={() => doSnooze(inv.order_id, d)}
                                  className="w-full px-3 py-1.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  {t('overdue.snoozeDays', { count: d })}
                                </button>
                              ))}
                              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                              <button
                                onClick={() => { setMenuFor(null); setPayFor(inv) }}
                                className="w-full px-3 py-1.5 text-sm text-left text-green-700 dark:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {t('overdue.actions.markPaid')}
                              </button>
                              <button
                                onClick={() => doOptOut(inv.order_id)}
                                className="w-full px-3 py-1.5 text-sm text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                              >
                                <BellOff className="w-4 h-4" />
                                {t('overdue.actions.optOut')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Send reminder — reuse the existing generator (preview/print/email + PDF). */}
      {sendFor && (
        <DocumentGenerator
          orderId={sendFor.order_id}
          orderNumber={sendFor.order_number}
          documentType="payment_reminder"
          onClose={() => setSendFor(null)}
          onGenerated={() => { refresh() }}
        />
      )}

      {/* View invoice — same generator modal (zoomable preview/print/download),
          reuses the existing invoice number, never mints a new one. */}
      {viewFor && (
        <DocumentGenerator
          orderId={viewFor.order_id}
          orderNumber={viewFor.order_number}
          documentType="invoice"
          onClose={() => setViewFor(null)}
        />
      )}

      <ConfirmDialog
        open={!!payFor}
        title={t('overdue.markPaid.title')}
        message={payFor ? t('overdue.markPaid.message', {
          invoice: payFor.invoice_number || payFor.order_number,
          customer: payFor.customer_name,
        }) : ''}
        confirmLabel={t('overdue.actions.markPaid')}
        onConfirm={confirmPaid}
        onCancel={() => setPayFor(null)}
      />
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

const TONES: Record<string, string> = {
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
}

function StatCard({ icon, tone, label, value }: {
  icon: React.ReactNode; tone: keyof typeof TONES; label: string; value: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${TONES[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}
