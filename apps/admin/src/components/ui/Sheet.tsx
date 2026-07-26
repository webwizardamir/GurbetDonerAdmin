import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useBodyScrollLock, useEscapeKey, useFocusTrap, prefersReducedMotion } from '../../hooks/useOverlay'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  /** Sticky footer, rendered outside the scroll area and above the safe-area inset. */
  footer?: ReactNode
  children: ReactNode
  /** Panel height cap. Default max-h-[85dvh]. */
  heightClass?: string
  /** Stacking layer. 60 for a sheet opened from inside another sheet. */
  z?: 50 | 60
  /** Drag the grabber/header down to dismiss. Default true. */
  swipeToDismiss?: boolean
  'aria-label'?: string
}

const ANIM_MS = 300

/**
 * Bottom sheet. The mobile counterpart to Modal, sharing its overlay hooks.
 *
 * Mount/animation: the panel must exist in the DOM before the open transform is
 * applied or the slide-in never plays, so it mounts first and flips to the open
 * transform in a rAF. On close it animates out and unmounts after ANIM_MS. Both
 * delays are skipped under prefers-reduced-motion.
 */
export default function Sheet({
  isOpen,
  onClose,
  title,
  footer,
  children,
  heightClass = 'max-h-[85dvh]',
  z = 50,
  swipeToDismiss = true,
  'aria-label': ariaLabel,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [mounted, setMounted] = useState(isOpen)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    const reduced = prefersReducedMotion()
    if (isOpen) {
      setMounted(true)
      if (reduced) { setEntered(true); return }
      const raf = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
    setDragY(0)
    if (reduced) { setMounted(false); return }
    const timer = setTimeout(() => setMounted(false), ANIM_MS)
    return () => clearTimeout(timer)
  }, [isOpen])

  useBodyScrollLock(isOpen)
  useEscapeKey(isOpen, onClose)
  // autoFocus goes to the close button, never a search input: focusing an input
  // on mobile raises the keyboard and swallows the sheet.
  useFocusTrap(panelRef, isOpen && entered)

  if (!mounted) return null

  // Pointer handlers live on the grabber + header ONLY. On the body, dragging a
  // filter list would dismiss the sheet.
  const dragHandlers = swipeToDismiss ? {
    onPointerDown: (e: React.PointerEvent) => {
      dragStart.current = { y: e.clientY, t: e.timeStamp }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragStart.current) return
      setDragY(Math.max(0, e.clientY - dragStart.current.y))
    },
    onPointerUp: (e: React.PointerEvent) => {
      const start = dragStart.current
      dragStart.current = null
      if (!start) return
      const dy = e.clientY - start.y
      const velocity = dy / Math.max(1, e.timeStamp - start.t)
      if (dy > 88 || velocity > 0.5) onClose()
      else setDragY(0)
    },
  } : {}

  const dragging = dragStart.current !== null

  return createPortal(
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          z === 60 ? 'z-[60]' : 'z-50'
        } ${entered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-white dark:bg-slate-800
          border-t border-slate-200 dark:border-slate-700
          shadow-[0_-8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)]
          pb-[env(safe-area-inset-bottom)] will-change-transform
          ${dragging ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'}
          ${heightClass} ${z === 60 ? 'z-[60]' : 'z-50'}
          ${entered && !dragY ? 'translate-y-0' : entered ? '' : 'translate-y-full'}`}
      >
        {swipeToDismiss && (
          <div {...dragHandlers} className="touch-none cursor-grab active:cursor-grabbing py-1.5 shrink-0">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}

        <div
          {...(swipeToDismiss ? dragHandlers : {})}
          className="flex items-center justify-between gap-3 shrink-0 px-5 py-3 border-b border-slate-200 dark:border-slate-700"
        >
          {title
            ? <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-white truncate">{title}</h2>
            : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* overscroll-contain stops iOS scroll-chaining into the page behind. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 flex items-center gap-3 px-5 pt-3 pb-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  )
}
