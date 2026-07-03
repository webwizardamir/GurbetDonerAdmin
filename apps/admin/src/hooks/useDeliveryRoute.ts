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
export function useDeliveryRoute(day: string, endDay?: string, cities?: string[]) {
  // Stable primitive key so the array reference doesn't churn effect/callback deps.
  // Callbacks reconstruct the array from this key (cityArg) instead of closing
  // over the `cities` prop, so the value provably matches the dep — no stale set.
  const citiesKey = cities && cities.length ? cities.join('|') : ''
  const cityArg = citiesKey ? citiesKey.split('|') : undefined
  const [candidates, setCandidates] = useState<RouteStopInput[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [locks, setLocks] = useState<Map<string, LockPosition>>(new Map())
  const [manualOrder, setManualOrder] = useState<string[]>([])
  // Default to the current local time (rounded to the minute); the user can
  // still override via the time input in the panel.
  const [departureHHmm, setDepartureHHmm] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [returnToDepot, setReturnToDepot] = useState(true)

  const [route, setRoute] = useState<PlannedRoute | null>(null)
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // orderDirty = the manual order / selection / settings diverge from the last
  // Google computation, so leg distances & ETAs are stale. It does NOT block
  // export anymore (the manual order is authoritative for the driver); it only
  // blanks the stale metrics and offers an optional ETA refresh.
  const [orderDirty, setOrderDirty] = useState(false)

  // Load the day's candidate stops; reset all control state on day/city change.
  useEffect(() => {
    let cancelled = false
    setLoadingCandidates(true)
    setCandidatesError(null)
    setRoute(null)
    setError(null)
    setOrderDirty(false)
    fetchRouteOrders({ day, endDay, cities: cityArg })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, endDay, citiesKey])

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
    setOrderDirty(true)
  }, [])
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(candidates.map(s => s.customerId)))
    setOrderDirty(true)
  }, [candidates])
  const selectNone = useCallback(() => { setSelectedIds(new Set()); setOrderDirty(true) }, [])

  // ---- locks ---------------------------------------------------------------
  const setLock = useCallback((id: string, position: LockPosition | null) => {
    setLocks(prev => {
      const next = new Map(prev)
      if (position === null) next.delete(id)
      else next.set(id, position)
      return next
    })
    setOrderDirty(true)
  }, [])

  // ---- manual order --------------------------------------------------------
  const moveStop = useCallback((activeId: string, overId: string) => {
    setManualOrder(prev => {
      const from = prev.indexOf(activeId)
      const to = prev.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return prev
      return arrayMove(prev, from, to)
    })
    setOrderDirty(true)
  }, [])

  // Jump a stop to an exact 1-based position within the INCLUDED subset (the
  // numbers the user sees). Reorders only the included ids and writes them back
  // into their original slots in the full manualOrder, so excluded ids keep
  // their positions. Unlike moveStop's whole-array arrayMove this places the
  // stop exactly (no off-by-one on large jumps), which is the whole point of
  // the position dropdown.
  const moveStopToPosition = useCallback((customerId: string, targetPos1Based: number) => {
    setManualOrder(prev => {
      const included = prev.filter(id => selectedIds.has(id))
      const from = included.indexOf(customerId)
      if (from < 0) return prev
      const to = Math.max(0, Math.min(targetPos1Based - 1, included.length - 1))
      if (from === to) return prev
      const reordered = arrayMove(included, from, to)
      let k = 0
      return prev.map(id => (selectedIds.has(id) ? reordered[k++] : id))
    })
    setOrderDirty(true)
  }, [selectedIds])

  // ---- settings ------------------------------------------------------------
  const updateDeparture = useCallback((hhmm: string) => { setDepartureHHmm(hhmm); setOrderDirty(true) }, [])
  const toggleReturnToDepot = useCallback(() => { setReturnToDepot(v => !v); setOrderDirty(true) }, [])

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
        { day, endDay, cities: cityArg, selectedCustomerIds: selected, lockedStops, departureTime: departureTimeIso, returnToDepot },
        candidates,
      )
      setRoute(result)
      // Re-seed manual order: planned stops first (delivery order), excluded after.
      const plannedIds = result.stops.map(s => s.customerId)
      const rest = manualOrder.filter(id => !plannedIds.includes(id))
      setManualOrder([...plannedIds, ...rest])
      setOrderDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('route.error'))
    } finally {
      setPlanning(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, locks, day, endDay, citiesKey, departureTimeIso, returnToDepot, candidates, manualOrder])

  const applyManualOrder = useCallback(async () => {
    const order = manualOrder.filter(id => selectedIds.has(id))
    if (order.length === 0) { setError(t('route.selectAtLeastOne')); return }
    setPlanning(true)
    setError(null)
    try {
      const result = await computeLegsForOrder(
        { day, endDay, cities: cityArg, order, departureTime: departureTimeIso, returnToDepot },
        candidates,
      )
      setRoute(result)
      setOrderDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('route.error'))
    } finally {
      setPlanning(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualOrder, selectedIds, day, endDay, citiesKey, departureTimeIso, returnToDepot, candidates])

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
        // sequence is renumbered below to follow the (manual) display order.
        sequence: r?.sequence,
        lat: r?.lat ?? c.cachedLat,
        lng: r?.lng ?? c.cachedLng,
        geocodeStatus: r?.geocodeStatus,
        // Leg metrics depend on the exact order, so once the manual order /
        // selection diverges from the last Google run they're stale — blank
        // them so the UI/PDF show "—" instead of wrong distances/ETAs.
        legDistanceMeters: orderDirty ? 0 : r?.legDistanceMeters,
        legDurationSeconds: orderDirty ? 0 : r?.legDurationSeconds,
        etaSeconds: orderDirty ? 0 : r?.etaSeconds,
      }
      ;(stop.included ? included : excluded).push(stop)
    }
    // Renumber included stops 1..N by their position in the (manual) order so
    // the sequence badges always match what the user sees / will load.
    included.forEach((s, i) => { s.sequence = i + 1 })
    return { includedStops: included, excludedStops: excluded }
  }, [candidates, route, manualOrder, selectedIds, locks, orderDirty])

  // The route as it should actually be exported/printed: the user's manual
  // order is authoritative. Maps onto PlannedStop, renumbered 1..N.
  const effectiveStops: PlannedStop[] = useMemo(
    () => includedStops.map((s, i) => ({
      ...s,
      sequence: i + 1,
      locked: s.lock != null,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      geocodeStatus: s.geocodeStatus ?? 'ok',
      legDistanceMeters: s.legDistanceMeters ?? 0,
      legDurationSeconds: s.legDurationSeconds ?? 0,
      etaSeconds: s.etaSeconds ?? 0,
    })),
    [includedStops],
  )

  // Totals: pass through Google's numbers while the order is clean; blank the
  // distance/time (keep stop count) once the manual order makes them stale.
  const effectiveTotals = useMemo(
    () => (route && !orderDirty
      ? route.totals
      : { distanceMeters: 0, durationSeconds: 0, stopCount: effectiveStops.length }),
    [route, orderDirty, effectiveStops.length],
  )

  // A route object reflecting the manual order, for exports/PDF/Maps. When the
  // order is stale we null the departure time so ETAs render as "—" rather than
  // a misleading clock.
  const effectiveRoute: PlannedRoute | null = useMemo(
    () => (route
      ? { ...route, stops: effectiveStops, totals: effectiveTotals, departureTime: orderDirty ? null : route.departureTime }
      : null),
    [route, effectiveStops, effectiveTotals, orderDirty],
  )

  // Loading order = reverse of the (effective) delivery order — load the last
  // stop first / deepest. Follows the manual order instantly, no Google call.
  const loadingOrder: PlannedStop[] = useMemo(
    () => [...effectiveStops].reverse(),
    [effectiveStops],
  )

  // Export is safe only when every included stop has coordinates from a prior
  // computation. A freshly toggled-in, never-geocoded stop has no lat/lng and
  // would silently drop from the Maps URL — require a (re)optimize first.
  const exportReady = useMemo(
    () => !!route && effectiveStops.length > 0 && effectiveStops.every(s => s.lat != null && s.lng != null),
    [route, effectiveStops],
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
    effectiveRoute,
    effectiveStops,
    effectiveTotals,
    exportReady,
    planning,
    error,
    orderDirty,
    // controls
    selectedCount: selectedIds.size,
    departureHHmm,
    returnToDepot,
    toggleStop,
    selectAll,
    selectNone,
    setLock,
    moveStop,
    moveStopToPosition,
    updateDeparture,
    toggleReturnToDepot,
    optimize,
    applyManualOrder,
  }
}
