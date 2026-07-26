// Reusable dropdown menu panel rendered via a React portal to document.body.
//
// Why a portal: table row menus positioned with `absolute` get clipped by the
// table wrapper's `overflow-hidden` / `overflow-x-auto`. Rendering the panel to
// document.body with `position: fixed` coordinates derived from the trigger's
// bounding rect escapes every ancestor's overflow/stacking context. The panel
// flips upward near the viewport bottom and tracks the trigger on scroll/resize.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface DropdownMenuProps {
  isOpen: boolean
  onClose: () => void
  /** The trigger element the menu is positioned against. */
  anchorRef: RefObject<HTMLElement>
  children: ReactNode
  /** Horizontal alignment relative to the trigger. Default 'right'. */
  align?: 'left' | 'right'
  /** Panel width in px (default 192 = Tailwind w-48). */
  width?: number
  /**
   * 'menu' (default) for a list of ACTIONS; 'listbox' when the panel picks one
   * VALUE (the order-status picker). Screen readers announce these differently
   * and a value picker announced as a menu is misleading.
   */
  role?: 'menu' | 'listbox'
  /** Panel id, so a trigger can point at it with aria-controls. */
  id?: string
}

const GAP = 4
const MARGIN = 8

export default function DropdownMenu({
  isOpen,
  onClose,
  anchorRef,
  children,
  align = 'right',
  width = 192,
  role = 'menu',
  id,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  // Dormant = the trigger is not rendered/visible (e.g. this is the mobile-card
  // copy of a menu while the desktop table is showing, or vice-versa). List pages
  // render BOTH layouts and share one `openMenuId`, so the same menu opens twice;
  // the hidden copy must not render a portal at (0,0) nor install an outside-click
  // listener that would slam both menus shut on mousedown. See the customers list.
  const [dormant, setDormant] = useState(false)

  // A display:none element reports an all-zero bounding rect.
  const isAnchorHidden = () => {
    const anchor = anchorRef.current
    if (!anchor) return true
    const rect = anchor.getBoundingClientRect()
    return rect.width === 0 && rect.height === 0
  }

  // Compute fixed coordinates from the trigger rect + measured menu height.
  const reposition = () => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const menuH = menuRef.current?.offsetHeight ?? 0

    let left = align === 'right' ? rect.right - width : rect.left
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN))

    let top = rect.bottom + GAP
    if (menuH && top + menuH > window.innerHeight - MARGIN) {
      const flipped = rect.top - menuH - GAP
      top = flipped >= MARGIN ? flipped : Math.max(MARGIN, window.innerHeight - menuH - MARGIN)
    }
    setPos({ top, left })
  }

  // Measure + position synchronously before paint to avoid a flash.
  useLayoutEffect(() => {
    if (isOpen) {
      if (isAnchorHidden()) { setDormant(true); setPos(null); return }
      setDormant(false)
      reposition()
    } else {
      setDormant(false)
      setPos(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Reposition on scroll (capture, to catch inner scroll containers) + resize;
  // close on Escape or outside mousedown.
  useEffect(() => {
    if (!isOpen || dormant) return
    const onScrollOrResize = () => reposition()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dormant])

  if (!isOpen || dormant) return null

  return createPortal(
    <div
      ref={menuRef}
      role={role}
      id={id}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1"
    >
      {children}
    </div>,
    document.body
  )
}
