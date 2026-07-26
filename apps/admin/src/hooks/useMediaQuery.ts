import { useEffect, useState } from 'react'

/**
 * Synchronous media-query hook.
 *
 * Reads matchMedia in the useState initializer, so there is no first-paint flash
 * and no layout thrash — this is a browser-only SPA with no SSR to hydrate
 * against.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Below Tailwind's `md` (768px) — the app-wide mobile line for page CONTENT.
 * Mirrors the existing `hidden md:block` table / `md:hidden` card split.
 *
 * ⚠️ This is deliberately NOT the app-shell breakpoint. The sidebar switches at
 * `lg` (1024px), so an iPad in portrait gets the desktop toolbar with a drawer
 * sidebar. That is intentional and matches today's table/card behaviour — do not
 * "unify" the two.
 *
 * Use this to pick a branch in JS whenever a component mounts a portal or owns
 * overlay state. CSS `hidden`/`md:` is reserved for markup that does neither:
 * rendering two copies of a portal-owning component with shared open state is
 * what produced the phantom-menu bug DropdownMenu's `dormant` guard exists for.
 */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)')
}
