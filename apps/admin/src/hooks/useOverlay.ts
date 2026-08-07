import { useEffect, type RefObject } from 'react'

/**
 * Overlay behaviours shared by Modal and Sheet: body-scroll lock, Escape, and a
 * focus trap. Extracted from Modal.tsx so there is one implementation rather
 * than two that drift.
 */

// Module-level, NOT per hook instance. A Sheet can open on top of a Modal (a
// long-list picker inside a filter sheet, an export dialog launched from an
// overflow menu). With a per-instance "restore the original value" the inner
// overlay closing would unlock the page while the outer one is still open.
let lockCount = 0
let originalOverflow: string | null = null

/** Ref-counted body scroll lock. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount++
    if (import.meta.env.DEV && lockCount > 3) {
      console.warn(`useBodyScrollLock: ${lockCount} overlays deep. A leaked lock freezes page scroll permanently`)
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow ?? ''
        originalOverflow = null
      }
    }
  }, [active])
}

/**
 * Escape closes the topmost overlay only. Uses the capture phase with
 * stopPropagation so a picker inside a sheet closes before the sheet itself,
 * rather than both collapsing at once.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onEscape()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [active, onEscape])
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus trap.
 *
 * The focusable list is re-queried on every Tab rather than snapshotted when the
 * overlay opens. Required for the filter sheet: its option list shrinks as the
 * user types in a search box, so a cached first/last pair goes stale and Tab
 * escapes the overlay. This is also a behaviour change (an improvement) for the
 * ~22 existing modals.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  opts: { autoFocus?: boolean; restoreFocus?: boolean } = {},
): void {
  const { autoFocus = true, restoreFocus = true } = opts

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    if (autoFocus) {
      const first = el.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(n => n.offsetParent !== null || n === document.activeElement)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    el.addEventListener('keydown', handleTab)
    return () => {
      el.removeEventListener('keydown', handleTab)
      if (restoreFocus) previouslyFocused?.focus?.()
    }
  }, [ref, active, autoFocus, restoreFocus])
}

/** True when the user asked for reduced motion. Read once per call. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
