import { useCallback, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Keeps a list page's view state (page number, filters, search) in the URL query
 * string.
 *
 * WHY: page/filter state lives in React `useState` inside the list component, and
 * React Router UNMOUNTS that component when you open a detail page. Coming back
 * mounts a fresh one, so `useState(1)` starts at 1 again — you'd lose your place
 * every time you opened a customer or edited an order. Parking the state in the
 * URL survives that, and makes a filtered list shareable as a link.
 *
 * HOW it's wired (deliberately one-directional — do NOT turn this into a
 * two-way sync, it's what keeps it safe):
 *   1. The URL is parsed ONCE on mount and returned as `initial`, used to seed
 *      the page's local state / the data hook.
 *   2. `setUrlState` is called from EVENT HANDLERS only (a filter's onChange, a
 *      pagination button) — never from an effect. So there is no write on mount,
 *      and an inbound link such as `/orders?status=pending_payment` can never be
 *      stripped by our own mirroring before the page has read it.
 *
 * Values equal to their default are removed from the URL, so an unfiltered list
 * stays at a clean `/customers`. Writes use `{ replace: true }`, so clicking
 * through five pages doesn't leave five history entries to back out of.
 *
 * @example
 *   const [urlInit, setUrlState] = useUrlListState({ page: 1, q: '', type: '' })
 *   const [typeFilter, setTypeFilter] = useState(urlInit.type)
 *   // in the handler:
 *   const onType = (v: string) => { setTypeFilter(v); setUrlState({ type: v, page: 1 }) }
 */
export type UrlStateValue = string | number | boolean | string[]

// The defaults are written as literals at the call site (`{ page: 1, q: '',
// archived: false }`), and the generic constraint would otherwise pin those
// literal types — leaving `archived` typed `false`, so it could never be set to
// true. Widen each value back to its base type.
type Widen<T> =
  T extends string[] ? string[] :
  T extends boolean ? boolean :
  T extends number ? number :
  T extends string ? string :
  T
type WidenState<S> = { [K in keyof S]: Widen<S[K]> }

function serialize(value: UrlStateValue): string {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value)
}

function parse<S extends Record<string, UrlStateValue>>(defaults: S, params: URLSearchParams): S {
  const out = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const raw = params.get(key)
    if (raw === null) continue
    const fallback = defaults[key]
    if (Array.isArray(fallback)) {
      out[key as keyof S] = raw.split(',').filter(Boolean) as S[keyof S]
    } else if (typeof fallback === 'number') {
      // Every number we put in a list URL is a 1-based page number. Junk or a
      // non-positive value falls back to the default rather than producing a
      // negative range offset in the query.
      const n = Number(raw)
      out[key as keyof S] = (Number.isInteger(n) && n > 0 ? n : fallback) as S[keyof S]
    } else if (typeof fallback === 'boolean') {
      out[key as keyof S] = (raw === '1' || raw === 'true') as S[keyof S]
    } else {
      out[key as keyof S] = raw as S[keyof S]
    }
  }
  return out
}

export function useUrlListState<S extends Record<string, UrlStateValue>>(defaults: S) {
  const [searchParams, setSearchParams] = useSearchParams()

  // `defaults` is written inline at the call site, so it's a new object every
  // render — pin the first one rather than making it a dependency.
  const defaultsRef = useRef(defaults)

  // Parsed once. Later renders must NOT re-read, or a user's in-page edits would
  // be fought by whatever the URL happened to say.
  const initialRef = useRef<S | null>(null)
  if (initialRef.current === null) initialRef.current = parse(defaultsRef.current, searchParams)

  const setUrlState = useCallback((patch: Partial<WidenState<S>>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        const fallback = defaultsRef.current[key]
        const encoded = serialize(value as UrlStateValue)
        if (encoded === '' || encoded === serialize(fallback)) next.delete(key)
        else next.set(key, encoded)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  return [initialRef.current as WidenState<S>, setUrlState] as const
}

/**
 * "Back" for a detail/editor page: a real browser-back when there is history to
 * go back to, so the list it came from is restored with its page and filters
 * intact (see `useUrlListState`). Falls back to a plain navigation when this is
 * the first entry in the tab — someone opening a deep link has nothing behind
 * them, and `navigate(-1)` would take them out of the app.
 */
export function useBackTo(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    // React Router stamps the very first history entry with the key 'default'.
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback)
  }, [navigate, location.key, fallback])
}
