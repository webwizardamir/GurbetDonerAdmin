import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import DropdownMenu from '../ui/DropdownMenu'
import { STATUS_ALIAS, statusStyle } from '../../constants/orderStatus'
import type { OrderStatus } from '../../types'

interface OrderStatusPickerProps {
  current: OrderStatus
  /** Legal transitions from `current`, decided by the caller. */
  options: OrderStatus[]
  /** Only called for a real change; the caller owns confirmations and modals. */
  onSelect: (next: OrderStatus) => void
  busy?: boolean
}

/**
 * The order's status pill IS the dropdown trigger.
 *
 * Previously the panel showed a read-only coloured badge AND a separate select
 * whose value was the same status, so the same words appeared twice with no
 * label. An order has exactly one status, so it gets exactly one control: the
 * pill you already recognise, plus a chevron.
 *
 * It is a VALUE PICKER, not an action menu — hence listbox/option roles rather
 * than menu/menuitem, and noun labels ("Geannuleerd") rather than the verbs in
 * orders.actions.* ("Annuleren"), which inside a menu read as "dismiss this
 * menu" instead of "cancel the order".
 */
export default function OrderStatusPicker({ current, options, onSelect, busy }: OrderStatusPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const lblId = useId()
  const valId = useId()

  const style = statusStyle(current)
  const label = (s: OrderStatus | string) =>
    t(statusStyle(s).labelKey || '', { defaultValue: String(s) })

  // `pending` is represented by the `pending_payment` row — see STATUS_ALIAS.
  const currentKey = STATUS_ALIAS[current] ?? current
  // The current status is not always an offered transition (legacy values), and
  // the picker must never render a value it cannot display.
  const rows: OrderStatus[] = options.includes(currentKey)
    ? options
    : [currentKey as OrderStatus, ...options]

  // Escape must close THIS menu, not the order modal behind it. Modal's own
  // handler is registered on `document` in the capture phase and stops
  // propagation, so a document/bubble listener here would never fire. Capture
  // descends Window -> Document, so a window-capture listener provably runs
  // first. (Every DropdownMenu inside a Modal has this problem; fixing it
  // centrally is a separate change.)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  const select = (next: OrderStatus) => {
    // Close FIRST. The panel is z-[9999] and the payment-method modal that
    // 'completed' opens is z-50, so leaving it open would float the menu over
    // that dialog.
    setOpen(false)
    triggerRef.current?.focus()
    if (next !== current) onSelect(next)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${lblId} ${valId}`}
        aria-busy={busy || undefined}
        title={t('orders.detail.changeStatus')}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none
          h-11 pl-4 pr-3 text-sm sm:h-8 sm:pl-3 sm:pr-2 sm:text-xs
          focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
          focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800
          disabled:opacity-70 disabled:cursor-wait
          ${style.triggerClass}`}
      >
        <span id={lblId} className="sr-only">{t('orders.detail.orderStatus')}</span>
        <span id={valId}>{label(current)}</span>
        {busy
          ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
          : <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
      </button>

      <DropdownMenu
        isOpen={open && !busy}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align="left"
        width={240}
        role="listbox"
        id={listId}
      >
        {/* aria-hidden: a listbox's only valid children are options. */}
        <div aria-hidden="true" className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('orders.detail.changeStatus')}
        </div>
        <div aria-hidden="true" className="h-px bg-slate-100 dark:bg-slate-700 mb-1" />
        {rows.map(s => {
          const isCurrent = s === currentKey
          const destructive = s === 'cancelled'
          return (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={isCurrent}
              tabIndex={-1}
              onClick={() => select(s)}
              className={`w-full flex items-center gap-2.5 text-left px-3 min-h-11 py-2 sm:min-h-0 text-sm transition-colors
                focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-green-500
                ${isCurrent ? 'bg-slate-50 dark:bg-slate-700/50 font-semibold text-slate-900 dark:text-white' : ''}
                ${destructive && !isCurrent
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : !isCurrent ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60' : ''}`}
            >
              <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${statusStyle(s).dotClass}`} />
              <span className="flex-1 truncate">{label(s)}</span>
              {isCurrent && <Check aria-hidden="true" className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />}
            </button>
          )
        })}
      </DropdownMenu>
    </>
  )
}
