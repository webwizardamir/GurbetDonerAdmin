import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  globalSearch,
  MIN_SEARCH_LENGTH,
  type SearchGroup,
  type SearchResult,
  type SearchResultType,
} from '../services/search'

/**
 * State machine behind the header's global search: debounce, request
 * cancellation, recent picks, and the flattened row list the keyboard walks.
 *
 * Both the desktop dropdown and the mobile full-screen dialog run this hook, so
 * they can never drift in behaviour (which is exactly how the mobile results
 * ended up unclickable: two hand-written copies of the same list).
 */

const DEBOUNCE_MS = 250
const RECENT_KEY = 'globalSearch.recent'
const RECENT_MAX = 5

/** A recent pick is a frozen row: it must survive a page reload. */
export type RecentEntry = Pick<SearchResult, 'type' | 'id' | 'title' | 'subtitle' | 'url'>

/**
 * One keyboard-selectable line. The "see all" links are rows too, so ArrowDown
 * reaches them instead of leaving a click-only target at the end of a group.
 */
export type SearchRow =
  | { kind: 'result'; key: string; result: SearchResult }
  | { kind: 'more'; key: string; type: SearchResultType; url: string }

function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e): e is RecentEntry =>
        !!e && typeof e === 'object'
        && typeof (e as RecentEntry).url === 'string'
        && typeof (e as RecentEntry).title === 'string')
      .slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [recent, setRecent] = useState<RecentEntry[]>(readRecent)

  const abortRef = useRef<AbortController | null>(null)
  // Monotonic request id. The abort signal alone is not enough: a response that
  // is already in flight can still resolve after a newer one, and applying it
  // would show results for a term the user has moved past.
  const runRef = useRef(0)

  const trimmed = query.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH

  useEffect(() => {
    abortRef.current?.abort()
    const run = ++runRef.current

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setGroups([])
      setLoading(false)
      setFailed(false)
      return
    }

    setLoading(true)
    setFailed(false)
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(() => {
      globalSearch(trimmed, { signal: controller.signal })
        .then(result => {
          if (controller.signal.aborted || run !== runRef.current) return
          setGroups(result)
          setLoading(false)
        })
        .catch(err => {
          if (controller.signal.aborted || run !== runRef.current) return
          console.error('Global search failed:', err)
          setGroups([])
          setFailed(true)
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  // Abort whatever is in flight when the search closes/unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  const rows = useMemo<SearchRow[]>(() => {
    const out: SearchRow[] = []
    for (const group of groups) {
      for (const result of group.items) {
        out.push({ kind: 'result', key: `${result.type}-${result.id}`, result })
      }
      if (group.hasMore) {
        out.push({ kind: 'more', key: `more-${group.type}`, type: group.type, url: group.seeAllUrl })
      }
    }
    return out
  }, [groups])

  const pushRecent = useCallback((result: SearchResult | RecentEntry) => {
    const entry: RecentEntry = {
      type: result.type, id: result.id, title: result.title,
      subtitle: result.subtitle, url: result.url,
    }
    setRecent(prev => {
      const next = [entry, ...prev.filter(e => !(e.type === entry.type && e.id === entry.id))]
        .slice(0, RECENT_MAX)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* quota / private mode */ }
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    setRecent([])
    try { localStorage.removeItem(RECENT_KEY) } catch { /* ignore */ }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    runRef.current++
    setQuery('')
    setGroups([])
    setLoading(false)
    setFailed(false)
  }, [])

  return {
    query, setQuery, trimmed, tooShort,
    groups, rows, loading, failed,
    recent, pushRecent, clearRecent,
    reset,
  }
}
