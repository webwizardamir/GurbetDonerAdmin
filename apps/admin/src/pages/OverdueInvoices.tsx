import { useEffect, useMemo, useRef, useState } from 'react'
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
  RotateCcw,
  BellOff,
  FileText,
  History,
  CalendarClock,
  Check,
  Settings,
} from 'lucide-react'
import { useOverdueInvoices } from '../hooks/useOverdueInvoices'
import { formatPrice, formatDate, formatDateTime } from '../utils/format'
import {
  projectNextReminder,
  type NextReminder,
  relTimeKey,
} from '../services/invoiceReminders'
import { fetchDocumentSends } from '../services/documentEmail'
import { fetchDocumentSettings } from '../services/documents'
import DocumentGenerator from '../components/documents/DocumentGenerator'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import DropdownMenu from '../components/ui/DropdownMenu'
import SegmentedControl from '../components/ui/SegmentedControl'
import Modal from '../components/ui/Modal'
import EmailViewModal from '../components/documents/EmailViewModal'
import type { ClientReminderConfig, DocumentSend, DocumentSettings, OverdueInvoice } from '../types'

type Filter = 'active' | 'snoozed' | 'all'

// Snooze presets, in days.
const SNOOZE_PRESETS = [3, 7, 14]

export default function OverdueInvoices() {
  const { t } = useTranslation()
  const { invoices, config, active, snoozed, loading, error, refresh, snooze, unsnooze, markPaid, optOut } =
    useOverdueInvoices()

  const [filter, setFilter] = useState<Filter>('active')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [sendFor, setSendFor] = useState<OverdueInvoice | null>(null)
  const [viewFor, setViewFor] = useState<OverdueInvoice | null>(null)
  const [payFor, setPayFor] = useState<OverdueInvoice | null>(null)
  const [historyFor, setHistoryFor] = useState<OverdueInvoice | null>(null)
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

      {/* Auto-send off — explains the "manual only" state once, globally. */}
      {!config.auto_send_enabled && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">{t('overdue.autoOffBanner')}</p>
          <Link
            to="/settings/documents?tab=reminders"
            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-amber-800 dark:text-amber-300 hover:underline"
          >
            <Settings className="w-4 h-4" />{t('overdue.autoOffCta')}
          </Link>
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

      {/* Three view tabs, so no Filters sheet here — a sheet for three options
          is worse than the tabs. SegmentedControl just adds horizontal scroll
          instead of overflowing a narrow phone. Row-click stays deliberately
          off this page: the rows are action-dense (2 links + status + send +
          row menu) and a whole-row click mis-fires. */}
      <SegmentedControl
        as="tabs"
        value={filter}
        onChange={v => setFilter(v as Filter)}
        aria-label={t('overdue.filters.all')}
        options={(['active', 'snoozed', 'all'] as Filter[]).map(f => ({
          value: f,
          label: t(`overdue.filters.${f}`),
          count: f === 'active' ? active.length : f === 'snoozed' ? snoozed.length : invoices.length,
        }))}
      />

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

                {/* Reminder status strip — tap to open history */}
                <button
                  type="button"
                  onClick={() => setHistoryFor(inv)}
                  aria-label={t('overdue.reminderStatus.aria', { sent: Math.min(inv.reminders_sent, config.max_count), total: config.max_count })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <LadderDots sent={inv.reminders_sent} total={config.max_count} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {inv.reminders_sent === 0
                          ? t('overdue.reminderStatus.none')
                          : t('overdue.reminderStatus.progress', { sent: Math.min(inv.reminders_sent, config.max_count), total: config.max_count })}
                      </span>
                    </span>
                    <NextBadge next={projectNextReminder(inv, config)} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {inv.last_reminder_at ? lastSentLabel(t, inv.last_reminder_at) : t('overdue.reminderStatus.neverSent')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                      <History className="w-3.5 h-3.5" />{t('overdue.actions.history')}
                    </span>
                  </div>
                </button>

                {!inv.customer_email && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('overdue.noEmail')}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {isSnoozed ? (
                    <button onClick={() => doUnsnooze(inv.order_id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                      <RotateCcw className="w-3.5 h-3.5" />{t('overdue.actions.unsnooze')}
                    </button>
                  ) : (
                    <button onClick={() => setSendFor(inv)} disabled={!inv.customer_email} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" />{t('overdue.actions.sendReminder')}
                    </button>
                  )}
                  <button onClick={() => setViewFor(inv)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                    <FileText className="w-3.5 h-3.5" />{t('overdue.actions.viewInvoice')}
                  </button>
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
        <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <Th>{t('overdue.cols.invoice')}</Th>
                <Th>{t('overdue.cols.customer')}</Th>
                <Th className="text-right">{t('overdue.cols.amount')}</Th>
                <Th>{t('overdue.cols.due')}</Th>
                <Th>{t('overdue.cols.reminderStatus')}</Th>
                <Th className="text-right">{t('overdue.cols.actions')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {rows.map(inv => {
                const isSnoozed = !!inv.snoozed_until && new Date(inv.snoozed_until).getTime() > Date.now()
                return (
                  <tr key={inv.order_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 align-top text-sm">
                      <Link
                        to={`/orders/${inv.order_id}/edit`}
                        className="font-medium text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400"
                      >
                        {inv.invoice_number || inv.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
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
                    <td className="px-4 py-3 align-top text-sm text-right font-medium text-slate-900 dark:text-white tabular-nums">
                      {formatPrice(inv.total)}
                    </td>
                    {/* Due date + overdue severity (merged column) */}
                    <td className="px-4 py-3 align-top text-sm">
                      <div className="text-slate-600 dark:text-slate-400 tabular-nums">{formatDate(inv.invoice_due_date)}</div>
                      <div className={`text-xs font-semibold ${severity(inv.days_overdue)}`}>
                        {t('overdue.daysLabel', { count: inv.days_overdue })}
                      </div>
                    </td>
                    {/* Rich reminder-status cell */}
                    <td className="px-4 py-3 align-top">
                      <ReminderStatusCell inv={inv} config={config} onHistory={() => setHistoryFor(inv)} />
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-right">
                      <div className="inline-flex items-center gap-1 relative">
                        {busy === inv.order_id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
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
                        <RowActionsMenu
                          isOpen={menuFor === inv.order_id}
                          onToggle={() => setMenuFor(menuFor === inv.order_id ? null : inv.order_id)}
                          onClose={() => setMenuFor(null)}
                          onViewInvoice={() => { setMenuFor(null); setViewFor(inv) }}
                          onHistory={() => { setMenuFor(null); setHistoryFor(inv) }}
                          onSnooze={(d) => doSnooze(inv.order_id, d)}
                          onMarkPaid={() => { setMenuFor(null); setPayFor(inv) }}
                          onOptOut={() => doOptOut(inv.order_id)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
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

      {historyFor && (
        <ReminderHistoryModal inv={historyFor} onClose={() => setHistoryFor(null)} />
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

// ---------------------------------------------------------------------------
// Reminder-status cell (desktop) — replaces the bare "reminders sent" count.
// ---------------------------------------------------------------------------
function ReminderStatusCell({ inv, config, onHistory }: {
  inv: OverdueInvoice; config: ClientReminderConfig; onHistory: () => void
}) {
  const { t } = useTranslation()
  const total = config.max_count
  const next = projectNextReminder(inv, config)

  return (
    <button
      type="button"
      onClick={onHistory}
      aria-label={t('overdue.reminderStatus.aria', { sent: Math.min(inv.reminders_sent, total), total })}
      className="group w-full -mx-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {/* Line 1 — ladder progress */}
      <span className="flex items-center gap-1.5">
        <LadderDots sent={inv.reminders_sent} total={total} />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {inv.reminders_sent === 0
            ? t('overdue.reminderStatus.none')
            : t('overdue.reminderStatus.progress', { sent: Math.min(inv.reminders_sent, total), total })}
        </span>
      </span>

      {/* Line 2 — last sent (relative; exact on hover) */}
      {inv.last_reminder_at ? (
        <span
          className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
          title={formatDateTime(inv.last_reminder_at)}
        >
          <Check className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
          {lastSentLabel(t, inv.last_reminder_at)}
        </span>
      ) : (
        <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
          {t('overdue.reminderStatus.neverSent')}
        </span>
      )}

      {/* Line 3 — next reminder */}
      <span className="mt-1 flex items-center">
        <NextBadge next={next} />
      </span>
    </button>
  )
}

// Filled dot per sent reminder, hollow for remaining ladder rungs.
function LadderDots({ sent, total }: { sent: number; total: number }) {
  const rungs = Math.max(total, sent, 1)
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: rungs }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < sent ? 'bg-green-500 dark:bg-green-400' : 'bg-slate-200 dark:bg-slate-600'
          }`}
        />
      ))}
    </span>
  )
}

function NextBadge({ next }: { next: NextReminder }) {
  const { t } = useTranslation()
  const base = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium'
  switch (next.kind) {
    case 'scheduled':
      return (
        <span
          className={`${base} bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400`}
          title={next.mayShift ? t('overdue.next.mayShift') : formatDateTime(next.date.toISOString())}
        >
          <CalendarClock className="w-3 h-3" />
          {t('overdue.next.on', { date: formatDate(next.date.toISOString()) })}
          {next.mayShift && <span aria-hidden="true">*</span>}
        </span>
      )
    case 'due':
      return (
        <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400`}>
          <Clock className="w-3 h-3" />{t('overdue.next.due')}
        </span>
      )
    case 'no-email':
      return (
        <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400`}>
          <BellOff className="w-3 h-3" />{t('overdue.next.noEmail')}
        </span>
      )
    case 'manual':
      return (
        <span className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400`}>
          <BellOff className="w-3 h-3" />{t('overdue.next.manual')}
        </span>
      )
    case 'done':
      return (
        <span className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400`}>
          <Check className="w-3 h-3" />{t('overdue.next.done')}
        </span>
      )
  }
}

// "Laatste: 3 dagen geleden" — relative text; exact stamp is shown in a tooltip/modal.
function lastSentLabel(t: (k: string, o?: Record<string, unknown>) => string, iso: string): string {
  const { key, count } = relTimeKey(iso)
  return t('overdue.reminderStatus.last', { rel: t(`overdue.rel.${key}`, { count }) })
}

// ---------------------------------------------------------------------------
// Sent-reminder history — timeline modal, lazy-loaded on open.
// ---------------------------------------------------------------------------
function ReminderHistoryModal({ inv, onClose }: { inv: OverdueInvoice; onClose: () => void }) {
  const { t } = useTranslation()
  const [sends, setSends] = useState<DocumentSend[] | null>(null)
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DocumentSend | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchDocumentSends({ orderId: inv.order_id })
        setSends(rows.filter(s => s.document_type === 'payment_reminder'))
      } catch (e) {
        setError((e as Error).message)
      }
    })()
    // Branding for the drill-down email preview — non-fatal.
    void (async () => {
      try { setSettings(await fetchDocumentSettings()) } catch { /* plain preview */ }
    })()
  }, [inv.order_id])

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        maxWidth="max-w-lg"
        title={
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {t('overdue.history.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {inv.invoice_number || inv.order_number} · {inv.customer_name}
            </p>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {sends === null ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : sends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BellOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('overdue.history.empty')}</p>
            </div>
          ) : (
            <ol className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
              {sends.map(s => (
                <li key={s.id} className="relative">
                  <span className={`absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-800 ${
                    s.status === 'sent' ? 'bg-green-500'
                    : s.status === 'failed' ? 'bg-red-500'
                    : s.status === 'bounced' ? 'bg-orange-500' : 'bg-amber-500'
                  }`} />
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full text-left rounded-lg -mx-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={s.subject}>
                          {s.subject}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateTime(s.sent_at ?? s.created_at)}
                          {s.error_message && (
                            <span className="ml-1 text-red-600 dark:text-red-400">· {s.error_message}</span>
                          )}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                        s.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : s.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : s.status === 'bounced' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {t(`outbox.status.${s.status}`)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          <Link
            to={`/orders/${inv.order_id}/edit`}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {t('overdue.history.viewOrder')}
          </Link>
          <button onClick={onClose} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
            {t('common.close')}
          </button>
        </div>
      </Modal>

      {selected && (
        <EmailViewModal send={selected} settings={settings} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

// Row overflow menu. Uses the portal-based DropdownMenu so the panel escapes the
// table/card overflow and stacking context and flips up when near the viewport bottom.
function RowActionsMenu({
  isOpen,
  onToggle,
  onClose,
  onViewInvoice,
  onHistory,
  onSnooze,
  onMarkPaid,
  onOptOut,
}: {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onViewInvoice: () => void
  onHistory: () => void
  onSnooze: (days: number) => void
  onMarkPaid: () => void
  onOptOut: () => void
}) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-label={t('overdue.cols.actions')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={t('overdue.cols.actions')}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <DropdownMenu isOpen={isOpen} onClose={onClose} anchorRef={triggerRef} align="right" width={192}>
        <button
          onClick={onViewInvoice}
          className="w-full px-3 py-1.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {t('overdue.actions.viewInvoice')}
        </button>
        <button
          onClick={onHistory}
          className="w-full px-3 py-1.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          {t('overdue.actions.history')}
        </button>
        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
          {t('overdue.actions.snooze')}
        </div>
        {SNOOZE_PRESETS.map(d => (
          <button
            key={d}
            onClick={() => onSnooze(d)}
            className="w-full px-3 py-1.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('overdue.snoozeDays', { count: d })}
          </button>
        ))}
        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
        <button
          onClick={onMarkPaid}
          className="w-full px-3 py-1.5 text-sm text-left text-green-700 dark:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {t('overdue.actions.markPaid')}
        </button>
        <button
          onClick={onOptOut}
          className="w-full px-3 py-1.5 text-sm text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
        >
          <BellOff className="w-4 h-4" />
          {t('overdue.actions.optOut')}
        </button>
      </DropdownMenu>
    </>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

const severity = (days: number) =>
  days > 30
    ? 'text-red-700 dark:text-red-400'
    : days > 14
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-amber-600 dark:text-amber-400'

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
