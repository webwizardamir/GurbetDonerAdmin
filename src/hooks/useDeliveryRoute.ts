import { useCallback, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
import {
  fetchRouteOrders,
  planDeliveryRoute,
  computeLegsForOrder,
  type RouteStopInput,
  type PlannedRoute,
  type PlannedStop,
  type LockPosition,
  type RouteLock,
} from '../services/route'

const t = (k: string) => i18n.t(k)

// A candidate stop enriched with the user's selection/lock state and (once a
// route has been computed) the planned sequence + leg metrics.
export interface DisplayStop extends RouteStopInput {
  included: boolean
  lock: LockPosition | null
  sequence?: number
  lat?: number | null
  lng?: number | null
  geocodeStatus?: 'ok' | 'zero_results' | 'error'
  legDistanceMeters?: number
  legDurationSeconds?: number
  etaSeconds?: number
}

// A stop counts as "local" (van-deliverable) when its country is NL or unset.
// Foreign customers are export/freight orders and start deselected.
function isLocalStop(s: RouteStopInput): boolean {
  const c = (s.address.country || '').trim().toUpperCase()
  return c === '' || c === 'NL' || c === 'NEDERLAND' || c === 'NETHERLANDS'
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Owner-controlled delivery-route planner. Manual hook (the app has no React
 * Query). Selection / order / locks / departure are LOCAL state and never call
 * Google — only the explicit optimize() / applyManualOrder() actions do, so we
 * never burn billed API calls on a checkbox click.
 */
export function useDeliveryRoute(day: string, endDay?: string, city?: string) {
  const [candidates, setCandidates] = useState<RouteStopInput[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [locks, setLocks] = useState<Map<string, LockPosition>>(new Map())
  const [manualOrder, setManualOrder] = useState<string[]>([])
  const [departureHHmm, setDepartureHHmm] = useState('06:00')
  const [returnToDepot, setReturnToDepot] = useState(true)

  const [route, setRoute] = useState<PlannedRoute | null>(null)
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  // Load the day's candidate stops; reset all control state on day/city change.
  useEffect(() => {
    let cancelled = false
    setLoadingCandidates(true)
    setCandidatesError(null)
    setRoute(null)
    setError(null)
    setDirty(false)
    fetchRouteOrders({ day, endDay, city })
      .then(stops => {
        if (cancelled) return
        setCandidates(stops)
        // Default-select local (NL) stops only. Foreign customers are export/
        // freight orders, not van deliveries — they start unticked (visible in
        // "Niet meegenomen") so a Paris order never bloats a local route, but
        // can still be added back for a cross-border run.
        setSelectedIds(new Set(stops.filter(isLocalStop).map(s => s.customerId)))
        setLocks(new Map())
        setManualOrder(stops.map(s => s.customerId))
      })
      .catch(e => { if (!cancelled) setCandidatesError(e instanceof Error ? e.message : t('route.error')) })
      .finally(() => { if (!cancelled) setLoadingCandidates(false) })
    return () => { cancelled = true }
  }, [day, endDay, city])

  const departureTimeIso = useMemo(
    () => (departureHHmm ? `${day}T${departureHHmm}:00` : null),
    [day, departureHHmm],
  )

  // ---- selection -----------------------------------------------------------
  const toggleStop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setDirty(true)
  }, [])
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(candidates.map(s => s.customerId)))
    setDirty(true)
  }, [candidates])
  const selectNone = useCallback(() => { setSelectedIds(new Set()); setDirty(true) }, [])

  // ---- locks ---------------------------------------------------------------
  const setLock = useCallback((id: string, position: LockPosition | null) => {
    setLocks(prev => {
      const next = new Map(prev)
      if (position === null) next.delete(id)
      else next.set(id, position)
      return next
    })
    setDirty(true)
  }, [])

  // ---- manual order --------------------------------------------------------
  const moveStop = useCallback((activeId: string, overId: string) => {
    setManualOrder(prev => {
      const from = prev.indexOf(activeId)
      const to = prev.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return prev
      return arrayMove(prev, from, to)
    })
    setDirty(true)
  }, [])

  // ---- settings ------------------------------------------------------------
  const updateDeparture = useCallback((hhmm: string) => { setDepartureHHmm(hhmm); setDirty(true) }, [])
  const toggleReturnToDepot = useCallback(() => { setReturnToDepot(v => !v); setDirty(true) }, [])

  // ---- plan actions (the only paths that hit Google) -----------------------
  const optimize = useCallback(async () => {
    const selected = [...selectedIds]
    if (selected.length === 0) { setError(t('route.selectAtLeastOne')); return }
    setPlanning(true)
    setError(null)
    try {
      const lockedStops: RouteLock[] = [...locks.entries()]
        .filter(([id]) => selectedIds.has(id))
        .map(([customerId, position]) => ({ customerId, position }))
      const result = await planDeliveryRoute(
        { day, endDay, city, selectedCustomerIds: selected, lockedStops, departureTime: departureTimeIso, returnToDepot },
        candidates,
      )
      setRoute(result)
      // Re-seed manual order: planned stops first (delivery order), excluded after.
      const plannedIds = result.stops.map(s => s.customerId)
      const rest = manualOrder.filter(id => !plannedIds.includes(id))
      setManualOrder([...plannedIds, ...rest])
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('route.error'))
    } finally {
      setPlanning(false)
    }
  }, [selectedIds, locks, day, endDay, city, departureTimeIso, returnToDepot, candidates, manualOrder])

  const applyManualOrder = useCallback(async () => {
    const order = manualOrder.filter(id => selectedIds.has(id))
    if (order.length === 0) { setError(t('route.selectAtLeastOne')); return }
    setPlanning(true)
    setError(null)
    try {
      const result = await computeLegsForOrder(
        { day, endDay, city, order, departureTime: departureTimeIso, returnToDepot },
        candidates,
      )
      setRoute(result)
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('route.error'))
    } finally {
      setPlanning(false)
    }
  }, [manualOrder, selectedIds, day, endDay, city, departureTimeIso, returnToDepot, candidates])

  // ---- derived display state ----------------------------------------------
  const { includedStops, excludedStops } = useMemo(() => {
    const candById = new Map(candidates.map(c => [c.customerId, c]))
    const routeById = new Map((route?.stops ?? []).map(s => [s.customerId, s]))
    const included: DisplayStop[] = []
    const excluded: DisplayStop[] = []
    for (const id of manualOrder) {
      const c = candById.get(id)
      if (!c) continue
      const r = routeById.get(id)
      const stop: DisplayStop = {
        ...c,
        included: selectedIds.has(id),
        lock: locks.get(id) ?? null,
        sequence: r?.sequence,
        lat: r?.lat ?? c.cachedLat,
        lng: r?.lng ?? c.cachedLng,
        geocodeStatus: r?.geocodeStatus,
        legDistanceMeters: r?.legDistanceMeters,
        legDurationSeconds: r?.legDurationSeconds,
        etaSeconds: r?.etaSeconds,
      }
      ;(stop.included ? included : excluded).push(stop)
    }
    return { includedStops: included, excludedStops: excluded }
  }, [candidates, route, manualOrder, selectedIds, locks])

  // Loading order = reverse of the planned delivery order (load last-delivered
  // first / deepest). Derived from the route's stop order, not editable.
  const loadingOrder: PlannedStop[] = useMemo(
    () => (route ? [...route.stops].reverse() : []),
    [route],
  )

  const itemCount = useMemo(
    () => includedStops.reduce((s, st) => s + st.items.reduce((n, i) => n + i.quantity, 0), 0),
    [includedStops],
  )

  return {
    // candidates / loading
    loadingCandidates,
    candidatesError,
    candidateCount: candidates.length,
    // display
    includedStops,
    excludedStops,
    loadingOrder,
    itemCount,
    // route result
    route,
    planning,
    error,
    dirty,
    // controls
    selectedCount: selectedIds.size,
    departureHHmm,
    returnToDepot,
    toggleStop,
    selectAll,
    selectNone,
    setLock,
    moveStop,
    updateDeparture,
    toggleReturnToDepot,
    optimize,
    applyManualOrder,
  }
}
