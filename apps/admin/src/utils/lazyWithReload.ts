import { lazy, ComponentType } from 'react'

// A failed dynamic import almost always means the app was redeployed while this
// tab was open: the old content-hashed chunk filenames (e.g. `Orders-a1b2c3.js`)
// no longer exist on the server, so navigating to a not-yet-loaded route 404s.
// A single full reload pulls the fresh index.html + new chunk names and the
// navigation succeeds. We guard on a timestamp so a genuinely broken resource
// (or an offline device) can never trigger a reload loop.

const RELOAD_TS_KEY = 'chunk-reload-ts'
const RELOAD_WINDOW_MS = 10_000

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    msg,
  )
}

/**
 * Triggers at most one full-page reload per RELOAD_WINDOW_MS.
 * Returns true if a reload was started (caller should stop / hang).
 */
export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || 0)
    if (Date.now() - last > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
      window.location.reload()
      return true
    }
    // Already reloaded very recently → the chunk is genuinely gone/broken;
    // let the error surface instead of looping.
    return false
  } catch {
    // sessionStorage blocked (rare) → don't auto-reload, to avoid any loop.
    return false
  }
}

/**
 * Drop-in replacement for React.lazy that recovers from stale-chunk 404s after
 * a redeploy by reloading once. Any non-chunk error (a real bug in the module)
 * is re-thrown so the ErrorBoundary still shows it.
 */
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (isChunkLoadError(err) && reloadOnceForChunkError()) {
        // Reload is underway — keep the Suspense fallback up by never settling.
        return await new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
