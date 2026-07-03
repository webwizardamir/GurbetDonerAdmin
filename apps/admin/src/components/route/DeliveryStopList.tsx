import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown, ChevronRight, ChevronsUpDown, GripVertical, Lock,
  MapPinOff, MoreVertical, ArrowUp, ArrowDown, StickyNote, RotateCcw, Globe,
} from 'lucide-react'
import type { DisplayStop } from '../../hooks/useDeliveryRoute'
import type { LockPosition } from '../../services/route'
import { formatQuantityWithUnit } from '../../utils/format'
import { formatDistance, etaClock } from '../../utils/route'
import DropdownMenu from '../ui/DropdownMenu'

interface Props {
  included: DisplayStop[]
  excluded: DisplayStop[]
  hasRoute: boolean
  departureTime: string | null
  onToggle: (id: string) => void
  onMove: (activeId: string, overId: string) => void
  onMoveToPosition: (id: string, pos: number) => void
  onSetLock: (id: string, pos: LockPosition | null) => void
}

// The sequence badge, upgraded to an app-style position picker: click it to open
// a 1..N dropdown and jump this stop straight to that position (the rest shift
// to fill), instead of nudging up/down one row at a time. Rendered via the
// portal-based DropdownMenu so it escapes the scroll container's clipping.
function PositionPicker({
  current, total, variant, onPick,
}: {
  current: number
  total: number
  variant: 'locked' | 'failed' | 'normal'
  onPick: (pos: number) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  // Persistent ring + corner caret so the badge reads as a tappable chip on
  // touch devices too (hover cues don't exist there); 32px min touch target.
  const base = 'relative w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 tabular-nums ring-1 ring-slate-300 dark:ring-slate-500 transition-shadow hover:ring-2 hover:ring-green-400/70 focus:outline-none focus:ring-2 focus:ring-green-500'
  const color =
    variant === 'locked'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : variant === 'failed'
        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${base} ${color}`}
        aria-label={t('route.setPosition')}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('route.setPosition')}
      >
        {variant === 'failed' ? <MapPinOff className="w-3.5 h-3.5" /> : current}
        {variant === 'locked' ? (
          <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5" />
        ) : (
          <ChevronsUpDown className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-slate-400 dark:text-slate-300" />
        )}
      </button>
      <DropdownMenu isOpen={open} onClose={() => setOpen(false)} anchorRef={ref} align="left" width={212}>
        {/* Build the 1..N grid only while open — avoids O(N²) discarded elements
            across the stop list when every picker is closed. */}
        {open && (
          <div className="max-h-60 overflow-y-auto p-1 grid grid-cols-4 gap-1">
            {Array.from({ length: total }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                role="menuitemradio"
                aria-checked={n === current}
                aria-label={t('route.setPositionTo', { n })}
                onClick={() => { onPick(n); setOpen(false) }}
                className={`h-9 rounded-lg text-sm tabular-nums transition-colors ${
                  n === current
                    ? 'bg-green-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </DropdownMenu>
    </>
  )
}

export default function DeliveryStopList({
  included, excluded, hasRoute, departureTime, onToggle, onMove, onMoveToPosition, onSetLock,
}: Props) {
  const { t } = useTranslation()
  const [openManifest, setOpenManifest] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showExcluded, setShowExcluded] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const toggleManifest = (id: string) => setOpenManifest(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const isForeign = (s: DisplayStop) => {
    const c = (s.address.country || '').trim().toUpperCase()
    return c !== '' && c !== 'NL' && c !== 'NEDERLAND' && c !== 'NETHERLANDS'
  }

  return (
    <div className="space-y-2">
      {included.map((stop, i) => {
        const eta = etaClock(departureTime, stop.etaSeconds ?? 0)
        const manifestOpen = openManifest.has(stop.customerId)
        const failed = stop.geocodeStatus && stop.geocodeStatus !== 'ok'
        return (
          <div
            key={stop.customerId}
            draggable
            onDragStart={() => setDragId(stop.customerId)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragId && dragId !== stop.customerId) onMove(dragId, stop.customerId); setDragId(null) }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked
                onChange={() => onToggle(stop.customerId)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                aria-label={t('route.exclude')}
              />

              {/* sequence badge → click to jump to an exact position */}
              <PositionPicker
                current={hasRoute ? stop.sequence ?? i + 1 : i + 1}
                total={included.length}
                variant={stop.lock ? 'locked' : failed ? 'failed' : 'normal'}
                onPick={n => onMoveToPosition(stop.customerId, n)}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{stop.customerName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{stop.address.oneLine || '—'}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {hasRoute && eta && <span>{t('route.eta')} {eta}</span>}
                  {hasRoute && (stop.legDistanceMeters ?? 0) > 0 && <span>{formatDistance(stop.legDistanceMeters ?? 0)}</span>}
                  <span>{stop.items.length} {t('route.items')}</span>
                  {stop.orderIds.length > 1 && <span>· {t('route.ordersCount', { count: stop.orderIds.length })}</span>}
                </div>
              </div>

              {/* reorder up/down (touch + keyboard friendly) */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => { if (i > 0) onMove(stop.customerId, included[i - 1].customerId) }}
                  disabled={i === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                  aria-label={t('route.moveUp')}
                ><ArrowUp className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => { if (i < included.length - 1) onMove(stop.customerId, included[i + 1].customerId) }}
                  disabled={i === included.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                  aria-label={t('route.moveDown')}
                ><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>

              {/* options menu */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu(openMenu === stop.customerId ? null : stop.customerId)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label={t('route.options')}
                ><MoreVertical className="w-4 h-4" /></button>
                {openMenu === stop.customerId && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 text-sm">
                      {(['first', 'last'] as const).map(pos => (
                        <button key={pos} onClick={() => { onSetLock(stop.customerId, pos); setOpenMenu(null) }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {pos === 'first' ? t('route.pinFirst') : t('route.pinLast')}
                        </button>
                      ))}
                      <button onClick={() => { onSetLock(stop.customerId, i); setOpenMenu(null) }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {t('route.lockPosition')}
                      </button>
                      {stop.lock != null && (
                        <button onClick={() => { onSetLock(stop.customerId, null); setOpenMenu(null) }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {t('route.unlock')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab shrink-0 hidden sm:block" />
            </div>

            {/* delivery note */}
            {stop.deliveryNotes && (
              <div className="mx-3 mb-2 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 pl-2 py-1 flex items-start gap-1.5">
                <StickyNote className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300">{stop.deliveryNotes}</span>
              </div>
            )}

            {/* manifest */}
            <button onClick={() => toggleManifest(stop.customerId)}
              className="w-full flex items-center gap-1 px-3 pb-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {manifestOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {t('route.products')} ({stop.items.length})
            </button>
            {manifestOpen && (
              <ul className="px-3 pb-3 divide-y divide-slate-100 dark:divide-slate-700/60">
                {stop.items.map((it, idx) => (
                  <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1">
                    <span className="text-sm text-slate-900 dark:text-white truncate">
                      {it.productName}
                      {it.notes && <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">· {it.notes}</span>}
                    </span>
                    <span className="text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                      {formatQuantityWithUnit(it.quantity, it.unitType, t)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {/* excluded section */}
      {excluded.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button onClick={() => setShowExcluded(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40">
            {showExcluded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('route.excluded')} ({excluded.length})</span>
          </button>
          {showExcluded && (
            <ul className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {excluded.map(stop => (
                <li key={stop.customerId} className="flex items-center gap-2 px-4 py-2">
                  <input type="checkbox" checked={false} onChange={() => onToggle(stop.customerId)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 truncate min-w-0 flex-1">{stop.customerName}</span>
                  {isForeign(stop) && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" title={t('route.foreignOrderHint')}>
                      <Globe className="w-2.5 h-2.5" /> {t('route.foreignOrder')}
                    </span>
                  )}
                  <button onClick={() => onToggle(stop.customerId)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-green-600">
                    <RotateCcw className="w-3 h-3" /> {t('route.restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
