import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2, Clock, Loader2, MailCheck, MinusCircle, Send, XCircle,
} from 'lucide-react'
import Modal from '../ui/Modal'
import { renderDocumentBlob } from '../../utils/renderDocumentBlob'
import {
  resolveBulkEmailTargets,
  sendInvoiceEmailsSequential,
  type BulkEmailPreflight,
  type BulkEmailTarget,
  type BulkSendItemResult,
  type BulkSendProgress,
} from '../../services/bulkDocumentEmail'
import type { DocumentListRow } from '../../services/documents'

interface BulkSendInvoicesModalProps {
  /** The accumulated selection from the Invoices page. */
  docs: DocumentListRow[]
  onClose: () => void
  /** Fired once when the modal closes after a run, so the page can refresh. */
  onFinished?: () => void
}

type Phase = 'loading' | 'confirm' | 'sending' | 'done'

/** Per-row glyph. Mirrors EmailViewModal's StatusIcon vocabulary. */
function RowIcon({ state }: { state: 'idle' | 'active' | BulkSendItemResult['status'] }) {
  switch (state) {
    case 'active':    return <Loader2 className="w-4 h-4 shrink-0 animate-spin text-green-600" />
    case 'sent':      return <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    case 'failed':    return <XCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
    case 'skipped':   return <MinusCircle className="w-4 h-4 shrink-0 text-slate-400" />
    case 'cancelled': return <MinusCircle className="w-4 h-4 shrink-0 text-slate-400" />
    default:          return <Clock className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
  }
}

export default function BulkSendInvoicesModal({ docs, onClose, onFinished }: BulkSendInvoicesModalProps) {
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [preflight, setPreflight] = useState<BulkEmailPreflight | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<BulkSendProgress | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // The controller is a ref so unmounting genuinely stops the loop, and re-entry
  // is guarded by a ref rather than state so a double-click on Send cannot start
  // two interleaved runs over the same list.
  const abortRef = useRef<AbortController | null>(null)
  const runningRef = useRef(false)
  const ranRef = useRef(false)
  const activeRowRef = useRef<HTMLLIElement>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  // The selection is frozen at open. `docs` comes from a useMemo in the parent
  // that re-runs whenever the list reloads, so keying the effect on it would
  // re-run the pre-flight mid-send — resetting phase to 'confirm', throwing away
  // the admin's manual ticks and replacing the live progress list with the
  // picker. Capture once and depend on nothing.
  const docsRef = useRef(docs)

  // Pre-flight is read-only, so running it from an effect is safe — unlike the
  // send loop, which must only ever start from a click (React 18 StrictMode
  // double-invokes effects in dev and would mail everything twice).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const pf = await resolveBulkEmailTargets(docsRef.current)
        if (cancelled) return
        setPreflight(pf)
        setTicked(new Set(pf.targets.filter(x => x.defaultSelected).map(x => x.id)))
        setPhase('confirm')
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setPhase('confirm') }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const sendable = useMemo(
    () => preflight?.targets.filter(x => x.blockedBy.length === 0) ?? [],
    [preflight],
  )
  const blocked = useMemo(
    () => preflight?.targets.filter(x => x.blockedBy.length > 0) ?? [],
    [preflight],
  )
  const chosen = useMemo(() => sendable.filter(x => ticked.has(x.id)), [sendable, ticked])

  // When nothing at all can be sent AND every blocked row is blocked for the
  // same reason, the button says that reason ("Geen e-mailadres") instead of
  // the generic "Niets om te versturen" — the owner reads the button first and
  // wants to know WHY, not just that the count is zero.
  //
  // The `sendable.length === 0` guard is what keeps this honest: with even one
  // sendable row present (merely unticked, e.g. an already-sent invoice) the
  // reason would be a half-truth, and with a mixed selection the button must
  // never claim "no email address" while it is about to mail somebody. Those
  // cases keep the generic label; the per-row chips above carry the detail.
  const soleBlockReason = useMemo(() => {
    if (sendable.length > 0 || blocked.length === 0) return null
    const keys = new Set(blocked.map(toReasonKey))
    return keys.size === 1 ? [...keys][0] : null
  }, [sendable, blocked])

  // Results keyed by document id, for the per-row glyphs during/after the run.
  const resultById = useMemo(() => {
    const m = new Map<string, BulkSendItemResult>()
    for (const r of progress?.results ?? []) m.set(r.id, r)
    return m
  }, [progress])

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [progress?.current?.id])

  const toggle = (id: string) => setTicked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleSend = async () => {
    if (runningRef.current || !preflight || chosen.length === 0) return
    runningRef.current = true
    ranRef.current = true
    setError(null)
    setCancelling(false)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setPhase('sending')
    setProgress({ done: 0, total: chosen.length, current: null, sent: 0, failed: 0, skipped: 0, results: [] })
    try {
      const summary = await sendInvoiceEmailsSequential(chosen, {
        settings: preflight.settings,
        bccEmail: preflight.bccEmail,
        iban: preflight.iban,
        renderPdf: renderDocumentBlob,
        signal: ctrl.signal,
        onProgress: setProgress,
      })
      setProgress({
        done: summary.done,
        total: summary.total,
        current: null,
        sent: summary.sent,
        failed: summary.failed,
        skipped: summary.skipped,
        results: summary.results,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      runningRef.current = false
      setPhase('done')
    }
  }

  const handleClose = () => {
    if (phase === 'sending') return
    if (ranRef.current) onFinished?.()
    onClose()
  }

  const done = progress?.done ?? 0
  const total = progress?.total ?? chosen.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const cancelled = (progress?.results ?? []).filter(r => r.status === 'cancelled').length
  const ambiguous = (progress?.results ?? []).filter(r => r.ambiguous).length
  const failures = (progress?.results ?? []).filter(r => r.status === 'failed')

  const title =
    phase === 'done'
      ? (cancelled > 0 ? t('documents.bulkSend.cancelledTitle') : t('documents.bulkSend.doneTitle'))
      : t('documents.bulkSend.title')

  return (
    <Modal isOpen onClose={handleClose} title={title} maxWidth="max-w-2xl">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex items-center justify-center gap-3 h-32 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            {t('documents.bulkSend.checking')}
          </div>
        )}

        {phase !== 'loading' && (
          <>
            {/* ── Progress (sending + done) ───────────────────────────── */}
            {phase !== 'confirm' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate">
                    {phase !== 'sending'
                      ? ''
                      : progress?.current
                        ? t('documents.bulkSend.sendingTo', {
                            number: progress.current.documentNumber,
                            customer: progress.current.customerName,
                          })
                        : t('documents.bulkSend.sendingTitle')}
                  </span>
                  <span aria-live="polite" className="tabular-nums shrink-0 text-slate-500 dark:text-slate-400">
                    {t('documents.bulkSend.progress', { done, total })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={done}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-green-600 rounded-full transition-[width] duration-500 ease-out relative overflow-hidden"
                    style={{ width: `${pct}%` }}
                  >
                    {phase === 'sending' && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[sheen_1.6s_linear_infinite] motion-reduce:animate-none" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Summary tiles (done) ────────────────────────────────── */}
            {phase === 'done' && (
              <div className="grid grid-cols-3 gap-3">
                <Tile label={t('documents.bulkSend.stat.sent')} value={progress?.sent ?? 0} tone="emerald" />
                {/* An ambiguous result also carries status 'failed', so it is
                    split out here rather than counted in both tiles. */}
                <Tile label={t('documents.bulkSend.stat.failed')} value={(progress?.failed ?? 0) - ambiguous} tone="red" />
                {/* Skipped = everything ticked in the picker but never attempted:
                    the blocked rows plus any the admin left unticked (an already-
                    sent invoice, typically). Not just `progress.skipped`, which
                    only counts rows the loop itself refused. */}
                <Tile
                  label={t('documents.bulkSend.stat.skipped')}
                  value={(preflight?.targets.length ?? 0) - chosen.length + (progress?.skipped ?? 0)}
                  tone="slate"
                />
                {ambiguous > 0 && (
                  <Tile label={t('documents.bulkSend.stat.unknown')} value={ambiguous} tone="amber" />
                )}
              </div>
            )}

            {phase === 'done' && cancelled > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('documents.bulkSend.notAttempted', { count: cancelled })}
              </p>
            )}

            {/* ── Failure detail (done) ───────────────────────────────── */}
            {phase === 'done' && failures.length > 0 && (
              <ul className="space-y-1.5">
                {failures.map(f => (
                  <li
                    key={f.id}
                    className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-300">
                      <span className="tabular-nums">{f.documentNumber}</span>
                      <span className="truncate font-normal">{f.customerName}</span>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-400">
                      {/* Three genuinely different outcomes. A render failure never
                          reached the edge function, so there is NO Outbox row to
                          go looking for — say so instead of sending the admin on
                          a hunt. */}
                      {f.ambiguous
                        ? t('documents.bulkSend.failUnknown')
                        : f.sendId
                          ? t('documents.bulkSend.failSend')
                          : t('documents.bulkSend.failRender')}
                      {f.error ? `: ${f.error}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Header line (confirm) ───────────────────────────────── */}
            {phase === 'confirm' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('documents.bulkSend.summaryLine', { send: chosen.length, skip: blocked.length })}
              </p>
            )}

            {/* The default invoice body says "…op IBAN {{iban}}", and an unset
                value renders as "op IBAN ." — to every recipient at once. */}
            {phase === 'confirm' && preflight?.missingIban && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t('documents.bulkSend.missingIban')}
                </p>
              </div>
            )}

            {phase === 'confirm' && preflight && preflight.counts.alreadySent > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t('documents.bulkSend.alreadySentHint')}
                </p>
              </div>
            )}

            {/* ── The list. Stays mounted through the run — the per-row
                   glyph flip IS the live feedback. ─────────────────────── */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {sendable.map(row => {
                  const res = resultById.get(row.id)
                  const isActive = progress?.current?.id === row.id
                  const inRun = phase !== 'confirm'
                  const included = ticked.has(row.id)
                  if (inRun && !included) return null
                  return (
                    <li
                      key={row.id}
                      ref={isActive ? activeRowRef : undefined}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        res?.status === 'sent' ? 'animate-[row-land_600ms_ease-out] motion-reduce:animate-none' : ''
                      }`}
                    >
                      {inRun ? (
                        <RowIcon state={isActive ? 'active' : (res?.status ?? 'idle')} />
                      ) : (
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggle(row.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                            {row.documentNumber}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {row.customerName}
                          </span>
                          {row.alreadySent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shrink-0">
                              <MailCheck className="w-3 h-3" />
                              {t('documents.bulkSend.alreadySentBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {row.recipientEmail}
                        </p>
                      </div>
                    </li>
                  )
                })}

                {phase === 'confirm' && blocked.length > 0 && (
                  <>
                    <li className="sticky top-0 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('documents.bulkSend.skippedHeader')}
                    </li>
                    {blocked.map(row => (
                      <li key={row.id} className="flex items-center gap-3 px-3 py-2 opacity-60">
                        <MinusCircle className="w-4 h-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                            {row.documentNumber}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {row.customerName}
                          </span>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {t(`documents.bulkSend.reason.${toReasonKey(row)}`)}
                        </span>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        {phase === 'sending' ? (
          <button
            type="button"
            onClick={() => { setCancelling(true); abortRef.current?.abort() }}
            disabled={cancelling}
            className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? t('documents.bulkSend.cancelling') : t('documents.bulkSend.cancel')}
          </button>
        ) : phase === 'done' ? (
          <>
            <Link
              to="/outbox"
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('documents.bulkSend.openOutbox')}
            </Link>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
            >
              {t('common.close')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={phase !== 'confirm' || chosen.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              {chosen.length > 0
                ? t('documents.bulkSend.sendCta', { count: chosen.length })
                : soleBlockReason
                  ? t(`documents.bulkSend.reason.${soleBlockReason}`)
                  : t('documents.bulkSend.nothingToSend')}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

/** First block reason drives the chip — they are mutually exclusive in practice. */
function toReasonKey(row: BulkEmailTarget): string {
  const map: Record<string, string> = {
    not_invoice: 'notInvoice',
    no_order: 'noOrder',
    order_unavailable: 'noOrder',
    order_trashed: 'orderTrashed',
    order_not_billable: 'orderNotBillable',
    no_customer: 'noCustomer',
    no_email: 'noEmail',
    invalid_email: 'invalidEmail',
    document_missing: 'documentMissing',
  }
  return map[row.blockedBy[0]] ?? 'documentMissing'
}

const TILE_TONES = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  red:     'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  slate:   'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300',
} as const

function Tile({ label, value, tone }: { label: string; value: number; tone: keyof typeof TILE_TONES }) {
  return (
    <div className={`px-3 py-2.5 rounded-xl ${TILE_TONES[tone]}`}>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}
