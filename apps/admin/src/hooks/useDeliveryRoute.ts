import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import i18n from '../i18n'
import {
  fetchRouteOrders,
  planDeliveryRoute,
  computeLegsForOrder,
  getDepot,
  type DepotInfo,
  type RouteStopInput,
  type PlannedRoute,
  type PlannedStop,
  type LockPosition,
  type RouteLock,
} from '../services/route'
import {
  fetchRoutePlan,
  saveRoutePlan,
  buildPlanPayload,
  hydrateRouteFromGeometry,
  diffRoutePlan,
  type SavedRoutePlan,
  type RoutePlanDrift,
  type RoutePlanFilters,
} from '../services/routePlan'

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
// Foreign customers are usually export/freight orders, so they start deselected
// — but that is a DEFAULT, not a rule: `includeForeign` below hands the choice
// back to the admin, and the preference is remembered.
function isLocalStop(s: RouteStopInput): boolean {
  const c = (s.address.country || '').trim().toUpperCase()
  return c === '' || c === 'NL' || c === 'NEDERLAND' || c === 'NETHERLANDS'
}

// Cross-border runs are the exception (a handful of orders against a full van
// of local ones), so the toggle defaults to OFF and is remembered per browser:
// an admin who does drive abroad sets it once instead of every single day.
const INCLUDE_FOREIGN_KEY = 'route.includeForeign'
function readIncludeForeign(): boolean {
  try { return localStorage.getItem(INCLUDE_FOREIGN_KEY) === '1' } catch { return false }
}
function persistIncludeForeign(v: boolean) {
  try { localStorage.setItem(INCLUDE_FOREIGN_KEY, v ? '1' : '0') } catch { /* private mode */ }
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const sameSet = (a?: string[], b?: string[]) => {
  const x = [...(a ?? [])].sort()
  const y = [...(b ?? [])].sort()
  return x.length === y.length && x.every((v, i) => v === y[i])
}

/**
 * Whether a saved plan was arranged under the same view as the one on screen.
 * A plan is keyed on the DATE alone (so it is always found), but its order-set
 * fingerprint was taken from the candidate list AS FILTERED at save time — so
 * across different filters the added/removed diff is not comparable and would
 * report phantom drift. The panel shows the filter mismatch instead.
 */
function filtersMatch(saved: RoutePlanFilters, current: RoutePlanFilters): boolean {
  return sameSet(saved.cities, current.cities)
    && sameSet(saved.customerType, current.customerType)
    && (saved.statusFilter ?? '') === (current.statusFilter ?? '')
}

/**
 * Owner-controlled delivery-route planner. Manual hook (the app has no React
 * Query). Selection / order / locks / departure are LOCAL state and never call
 * Google — only the explicit optimize() / applyManualOrder() actions do, so we
 * never burn billed API calls on a checkbox click.
 */
export function useDeliveryRoute(day: string, endDay?: string, cities?: string[], customerType?: string[]) {
  // Stable primitive key so the array reference doesn't churn effect/callback deps.
  // Callbacks reconstruct the array from this key (cityArg) instead of closing
  // over the `cities` prop, so the value provably matches the dep — no stale set.
  const citiesKey = cities && cities.length ? cities.join('|') : ''
  const cityArg = citiesKey ? citiesKey.split('|') : undefined
  // Admin-only customer-type filter (e.g. Horeca-only route, or Horeca +
  // Supermarkt together). Filtering the candidate list is enough: selection/
  // order (already type-scoped) drives the billed optimize, and mergeRoute maps
  // back onto this filtered display list. Same primitive-key trick as `cities`
  // above — the array reference must not churn the effect dep.
  const typesKey = customerType && customerType.length ? customerType.join('|') : ''
  const customerTypeArg = typesKey ? typesKey.split('|') : undefined
  const [candidates, setCandidates] = useState<RouteStopInput[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  // Order-status filter ('' = every routable status). Drafts are never
  // routable, so they are excluded in the service and never offered here.
  const [statusFilter, setStatusFilter] = useState('')
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Stops the user DELIBERATELY took off the round (or that a saved plan left
  // out while they were deliverable). Deliberately NOT the same thing as
  // `excludedStops`: a foreign customer starts unticked automatically because it
  // ships by freight, and it still needs its invoice — so it must never be
  // unticked in Dagafsluiting on the strength of an auto-exclusion nobody chose.
  const [userExcludedIds, setUserExcludedIds] = useState<Set<string>>(new Set())
  const [locks, setLocks] = useState<Map<string, LockPosition>>(new Map())
  const [manualOrder, setManualOrder] = useState<string[]>([])
  // Admin's standing answer to "does the van go abroad?". Read through a ref by
  // the loader so flipping it re-seeds the selection without refetching the day.
  const [includeForeign, setIncludeForeign] = useState(readIncludeForeign)
  const includeForeignRef = useRef(includeForeign)
  includeForeignRef.current = includeForeign
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

  // ---- saved plan (migration 00112) ----------------------------------------
  // The owner arranges the round by hand and leaves it; a shop manager opening
  // the same day must get that exact sequence with NO billed Google call.
  const [savedPlan, setSavedPlan] = useState<SavedRoutePlan | null>(null)
  const [drift, setDrift] = useState<RoutePlanDrift | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Set once a saved plan has been applied, and cleared by any edit — so the
  // "Opslaan" button can show whether the on-screen arrangement still equals
  // what is stored.
  const [dirtyVsSaved, setDirtyVsSaved] = useState(false)

  // The depot is read from document_settings (cached lat/lng), NOT from a route
  // response — which is what makes a Maps link / PDF possible with no Google
  // call at all. Loaded once; a route result may carry a fresher one.
  const [depot, setDepot] = useState<DepotInfo | null>(null)
  // Tracked separately so the panel does not flash "needs re-optimize" during
  // the one render where the depot has not arrived yet and exportReady is
  // therefore still false.
  const [depotLoading, setDepotLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    getDepot()
      .then(d => { if (!cancelled) setDepot(d) })
      .catch(() => { /* depot is optional chrome; exports fall back to addresses */ })
      .finally(() => { if (!cancelled) setDepotLoading(false) })
    return () => { cancelled = true }
  }, [])

  const currentFilters: RoutePlanFilters = useMemo(
    () => ({ cities: cityArg, customerType: customerTypeArg, statusFilter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [citiesKey, typesKey, statusFilter],
  )
  // Ref so callbacks can read the live filters without taking them as a dep.
  const filtersRef = useRef(currentFilters)
  filtersRef.current = currentFilters
  // orderDirty = the manual order / selection / settings diverge from the last
  // Google computation, so leg distances & ETAs are stale. It does NOT block
  // export anymore (the manual order is authoritative for the driver); it only
  // blanks the stale metrics and offers an optional ETA refresh.
  const [orderDirty, setOrderDirty] = useState(false)

  // Load the day's candidate stops + any saved arrangement for the period;
  // reset all control state on day/city change.
  useEffect(() => {
    let cancelled = false
    setLoadingCandidates(true)
    setCandidatesError(null)
    setRoute(null)
    setError(null)
    setOrderDirty(false)
    setSavedPlan(null)
    setDrift(null)
    setSaveError(null)
    setDirtyVsSaved(false)
    Promise.all([
      fetchRouteOrders({
        day, endDay, cities: cityArg, customerType: customerTypeArg,
        statuses: statusFilter ? [statusFilter] : undefined,
      }),
      // A missing or unreadable plan must never stop the panel opening — the
      // route planner has to keep working exactly as it did before 00112.
      fetchRoutePlan(day, endDay).catch(() => null),
    ])
      .then(([{ stops, statusCounts: counts }, plan]) => {
        if (cancelled) return
        setCandidates(stops)
        // Counts are computed pre-status-filter, so the dropdown stays stable.
        setStatusCounts(counts)

        if (!plan) {
          // Default-select local (NL) stops only. Foreign customers are usually
          // export/freight orders, not van deliveries, so they start unticked
          // (visible in "Niet meegenomen") and a Paris order never bloats a
          // local route. The admin's "Buitenland meenemen" preference overrides
          // that, and any stop can still be ticked back one at a time.
          const wanted = (s: RouteStopInput) => includeForeignRef.current || isLocalStop(s)
          setSelectedIds(new Set(stops.filter(wanted).map(s => s.customerId)))
          setUserExcludedIds(new Set())
          setLocks(new Map())
          setManualOrder(stops.map(s => s.customerId))
          return
        }

        // --- apply the saved arrangement to LIVE data ------------------------
        // The plan supplies ordering only. Everything shown (manifest, address,
        // order numbers) comes from `stops`, which was just fetched — a saved
        // route can never hand the driver a stale product list.
        const liveIds = new Set(stops.map(s => s.customerId))
        const known = new Set(plan.plan.order)
        // Saved sequence, minus customers with no order in this window today.
        const kept = plan.plan.order.filter(id => liveIds.has(id))
        // Customers that appeared since the save go to the END of the round.
        const appended = stops.map(s => s.customerId).filter(id => !known.has(id))
        const order = [...kept, ...appended]
        setManualOrder(order)

        // Selection follows the plan. A brand-new local stop is ticked rather
        // than left out: a missed delivery is worse than a suboptimal one, and
        // the drift banner says why it is there.
        const included = new Set(plan.plan.includedIds.filter(id => liveIds.has(id)))
        for (const id of appended) {
          const s = stops.find(x => x.customerId === id)
          if (s && (includeForeignRef.current || isLocalStop(s))) included.add(id)
        }
        setSelectedIds(included)
        // A stop the saved plan leaves out while it WOULD have been picked up by
        // default was taken off the round on purpose; a foreign one left out
        // while "Buitenland meenemen" is off is only the default, not a decision.
        setUserExcludedIds(new Set(
          stops
            .filter(s => (includeForeignRef.current || isLocalStop(s)) && !included.has(s.customerId))
            .map(s => s.customerId),
        ))
        setLocks(new Map(
          plan.plan.locks
            .filter(l => liveIds.has(l.customerId))
            .map(l => [l.customerId, l.position] as const),
        ))
        if (plan.plan.departureHHmm) setDepartureHHmm(plan.plan.departureHHmm)
        setReturnToDepot(plan.plan.returnToDepot)

        const d = diffRoutePlan(plan, stops)
        setSavedPlan(plan)
        setDrift(d)

        // Rebuild the leg metrics from the saved geometry — no Google call.
        const hydrated = hydrateRouteFromGeometry(plan.plan, stops, order)
        setRoute(hydrated)
        // Those numbers describe the route as it was saved. The moment the
        // underlying order set moved, they are no longer what will be driven —
        // blank them (existing orderDirty path) rather than show stale ETAs.
        setOrderDirty(!!hydrated && d.hasDrift)
      })
      .catch(e => { if (!cancelled) setCandidatesError(e instanceof Error ? e.message : t('route.error')) })
      .finally(() => { if (!cancelled) setLoadingCandidates(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, endDay, citiesKey, typesKey, statusFilter])

  const departureTimeIso = useMemo(
    () => (departureHHmm ? `${day}T${departureHHmm}:00` : null),
    [day, departureHHmm],
  )

  // Any edit invalidates BOTH the Google metrics (orderDirty) and the stored
  // arrangement (dirtyVsSaved) — the two are separate: a reorder makes ETAs
  // stale but is perfectly exportable, while it makes the SAVE out of date.
  const markEdited = useCallback(() => {
    setOrderDirty(true)
    setDirtyVsSaved(true)
  }, [])

  // ---- selection -----------------------------------------------------------
  const toggleStop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Mirror the click into the deliberate-exclusion set, so Dagafsluiting can
    // untick exactly the orders that were taken off the round by hand.
    setUserExcludedIds(prev => {
      const next = new Set(prev)
      if (selectedIds.has(id)) next.add(id)
      else next.delete(id)
      return next
    })
    markEdited()
  }, [selectedIds, markEdited])
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(candidates.map(s => s.customerId)))
    setUserExcludedIds(new Set())
    markEdited()
  }, [candidates, markEdited])
  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
    setUserExcludedIds(new Set(candidates.map(s => s.customerId)))
    markEdited()
  }, [candidates, markEdited])

  // Standing policy for foreign stops, applied to the whole day at once. It is
  // NOT a per-order decision: switching it off leaves the userExcluded set
  // alone, so it never unticks anyone's invoice in Dagafsluiting. Excluding a
  // single foreign stop by hand still does.
  const toggleIncludeForeign = useCallback(() => {
    const next = !includeForeignRef.current
    setIncludeForeign(next)
    persistIncludeForeign(next)
    const foreignIds = candidates.filter(s => !isLocalStop(s)).map(s => s.customerId)
    setSelectedIds(prev => {
      const set = new Set(prev)
      for (const id of foreignIds) {
        if (next) set.add(id)
        else set.delete(id)
      }
      return set
    })
    if (next) {
      setUserExcludedIds(prev => {
        const set = new Set(prev)
        for (const id of foreignIds) set.delete(id)
        return set
      })
    }
    markEdited()
  }, [candidates, markEdited])

  const foreignCount = useMemo(
    () => candidates.filter(s => !isLocalStop(s)).length,
    [candidates],
  )

  // ---- locks ---------------------------------------------------------------
  const setLock = useCallback((id: string, position: LockPosition | null) => {
    setLocks(prev => {
      const next = new Map(prev)
      if (position === null) next.delete(id)
      else next.set(id, position)
      return next
    })
    markEdited()
  }, [markEdited])

  // ---- manual order --------------------------------------------------------
  const moveStop = useCallback((activeId: string, overId: string) => {
    setManualOrder(prev => {
      const from = prev.indexOf(activeId)
      const to = prev.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return prev
      return arrayMove(prev, from, to)
    })
    markEdited()
  }, [markEdited])

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
    markEdited()
  }, [selectedIds, markEdited])

  // ---- settings ------------------------------------------------------------
  const updateDeparture = useCallback((hhmm: string) => { setDepartureHHmm(hhmm); markEdited() }, [markEdited])
  const toggleReturnToDepot = useCallback(() => { setReturnToDepot(v => !v); markEdited() }, [markEdited])

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
      // Google's order almost certainly differs from what was stored.
      setDirtyVsSaved(true)
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

  // ---- save (no Google call) -----------------------------------------------
  // Freezes the arrangement so the next person — typically a shop manager on a
  // different machine — opens the day and gets exactly this sequence.
  const save = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = buildPlanPayload({
        order: manualOrder,
        includedIds: [...selectedIds],
        locks,
        departureHHmm,
        returnToDepot,
        route,
      })
      // The fingerprint covers EVERY candidate order in the window, not just the
      // included ones — otherwise deliberately excluding a stop would come back
      // next time as "new orders since the save".
      const orderIds = candidates.flatMap(c => c.orderIds)
      await saveRoutePlan({ day, endDay, plan: payload, orderIds, filters: filtersRef.current })
      // Re-read rather than construct locally: savedAt / savedByName are stamped
      // by the DB trigger, so this is the only way to show them truthfully.
      const fresh = await fetchRoutePlan(day, endDay)
      setSavedPlan(fresh)
      setDrift(fresh ? diffRoutePlan(fresh, candidates) : null)
      setDirtyVsSaved(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('route.error'))
    } finally {
      setSaving(false)
    }
  }, [manualOrder, selectedIds, locks, departureHHmm, returnToDepot, route, candidates, day, endDay])

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

  // The depot a route/export should use: whatever the last Google run returned
  // (it may have geocoded it), else the cached one from document_settings.
  const effectiveDepot = useMemo(() => route?.depot ?? depot, [route, depot])

  // A route object reflecting the manual order, for exports/PDF/Maps. When the
  // order is stale we null the departure time so ETAs render as "—" rather than
  // a misleading clock.
  //
  // 🚨 It is also synthesised when there is NO computed route at all. Everything
  // an export needs — per-stop coordinates (customers.lat/lng, cached on the
  // candidate rows) and the depot (document_settings) — is already in the
  // browser; only the OPTIMAL order and the leg metrics require Google. Before
  // this, `effectiveRoute` was null without a Google run, which is what forced
  // a shop manager to spend a billed optimize purely to print a route the owner
  // had already arranged.
  const effectiveRoute: PlannedRoute | null = useMemo(() => {
    if (route) {
      return { ...route, stops: effectiveStops, totals: effectiveTotals, departureTime: orderDirty ? null : route.departureTime }
    }
    if (!effectiveDepot || effectiveStops.length === 0) return null
    return {
      mode: 'manual',
      stops: effectiveStops,
      geocodeFailures: [],
      totals: effectiveTotals,
      overviewPolyline: '',
      // No computation behind it, so no ETAs — they render as "—".
      departureTime: null,
      returnToDepot,
      truncatedOptimization: false,
      depot: effectiveDepot,
    }
  }, [route, effectiveStops, effectiveTotals, orderDirty, effectiveDepot, returnToDepot])

  // Loading order = reverse of the (effective) delivery order — load the last
  // stop first / deepest. Follows the manual order instantly, no Google call.
  const loadingOrder: PlannedStop[] = useMemo(
    () => [...effectiveStops].reverse(),
    [effectiveStops],
  )

  // Export is safe when every included stop has coordinates and we know where
  // the van starts. The coordinates need NOT come from a Google run — they are
  // cached on the customer row (`cachedLat/cachedLng`), so a saved plan, or even
  // an untouched candidate list of already-geocoded customers, exports fine.
  //
  // What is still genuinely blocking: a freshly toggled-in customer that has
  // never been geocoded has no lat/lng and would silently DROP from the Maps
  // URL. That is the real reason this gate exists, and it stays.
  //
  // The depot only needs an address — buildGoogleMapsUrl falls back to
  // `depot.oneLine` when it has no coordinates.
  const exportReady = useMemo(
    () => effectiveStops.length > 0
      && effectiveStops.every(s => s.lat != null && s.lng != null)
      && !!effectiveDepot
      && (effectiveDepot.oneLine.trim().length > 0 || (effectiveDepot.lat != null && effectiveDepot.lng != null)),
    [effectiveStops, effectiveDepot],
  )

  // True once an arrangement has an actual plan behind it — computed this
  // session or loaded from the save. Drives the "not optimised yet" hint, so a
  // raw candidate list is never mistaken for a planned round.
  const hasPlan = !!route || !!savedPlan

  // A saved plan arranged under different filters cannot be diffed meaningfully
  // against the current candidate list (the fingerprint was taken from a
  // different set), so the panel reports the mismatch instead of phantom drift.
  const savedFiltersMismatch = useMemo(
    () => !!savedPlan && !filtersMatch(savedPlan.filters, currentFilters),
    [savedPlan, currentFilters],
  )

  const itemCount = useMemo(
    () => includedStops.reduce((s, st) => s + st.items.reduce((n, i) => n + i.quantity, 0), 0),
    [includedStops],
  )

  // Order ids behind the deliberately-excluded stops. Dagafsluiting unticks
  // these, so a stop taken off the round doesn't quietly get its invoice
  // printed a minute later — the two steps are one flow.
  const excludedOrderIds = useMemo(
    () => candidates.filter(c => userExcludedIds.has(c.customerId)).flatMap(c => c.orderIds),
    [candidates, userExcludedIds],
  )

  return {
    // candidates / loading
    loadingCandidates,
    depotLoading,
    candidatesError,
    candidateCount: candidates.length,
    // display
    includedStops,
    excludedStops,
    excludedOrderIds,
    loadingOrder,
    itemCount,
    // route result
    route,
    effectiveRoute,
    effectiveStops,
    effectiveTotals,
    exportReady,
    hasPlan,
    planning,
    error,
    orderDirty,
    // saved plan
    savedPlan,
    drift,
    savedFiltersMismatch,
    dirtyVsSaved,
    saving,
    saveError,
    save,
    // controls
    selectedCount: selectedIds.size,
    statusCounts,
    statusFilter,
    setStatusFilter,
    departureHHmm,
    returnToDepot,
    includeForeign,
    toggleIncludeForeign,
    foreignCount,
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
