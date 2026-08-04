import { supabase } from './supabase'
import type { DepotInfo, LockPosition, PlannedRoute, RouteStopInput } from './route'

// ===========================================================================
// Saved delivery-route plans (migration 00112)
// ---------------------------------------------------------------------------
// The owner optimises and then REORDERS the stops by hand; that arrangement is
// the part carrying his knowledge of the round, and it used to die with the
// modal. A saved plan lets a shop manager open the same day and drive exactly
// what the owner left — with no billed Google call.
//
// 🚨 A PLAN IS A SEQUENCE, NOT A SNAPSHOT. It stores ordering, selection, locks
// and departure settings, plus an OPTIONAL geometry cache. Manifests, addresses
// and order numbers are always re-fetched live, so a saved route can never hand
// a driver a stale product list.
// ===========================================================================

/** Per-stop numbers from the Google run that backed a save. Keyed by customer
 *  so it can be re-joined onto freshly fetched (live) stop data. */
export interface SavedStopGeometry {
  customerId: string
  lat: number | null
  lng: number | null
  geocodeStatus: 'ok' | 'zero_results' | 'error'
  legDistanceMeters: number
  legDurationSeconds: number
  etaSeconds: number
}

export interface SavedRouteGeometry {
  mode: 'auto' | 'manual' | 'mixed'
  totals: { distanceMeters: number; durationSeconds: number; stopCount: number }
  overviewPolyline: string
  departureTime: string | null
  truncatedOptimization: boolean
  depot: DepotInfo
  stops: SavedStopGeometry[]
}

export interface RoutePlanPayload {
  /** Bumped only on a shape change the loader cannot read; an unknown version
   *  is ignored rather than mis-applied (see `readPayload`). */
  version: 1
  /** Full manual order (customer ids), included stops first. */
  order: string[]
  /** The ticked subset. */
  includedIds: string[]
  locks: { customerId: string; position: LockPosition }[]
  departureHHmm: string
  returnToDepot: boolean
  geometry?: SavedRouteGeometry
}

/** The filters the plan was arranged under. Metadata only — the plan is keyed
 *  on the DATE alone, so it is always found. Shown when they differ from the
 *  current view so a smaller-than-expected route explains itself. */
export interface RoutePlanFilters {
  cities?: string[]
  customerType?: string[]
  statusFilter?: string
}

export interface SavedRoutePlan {
  id: string
  routeDate: string
  endDate: string
  plan: RoutePlanPayload
  filters: RoutePlanFilters
  savedAt: string
  savedByName: string | null
  /** Order ids at save time, ALREADY filtered to what this caller may see (the
   *  RPC applies the hidden_from_managers predicate). Diffed against the live
   *  set to detect drift. */
  orderIds: string[]
}

interface RawPlanRow {
  id: string
  routeDate: string
  endDate: string
  plan: unknown
  filters: unknown
  savedAt: string
  savedByName: string | null
  orderIds: string[] | null
}

/** Defensive parse: a plan written by a newer build (or hand-edited) must not
 *  crash the panel — an unreadable payload is treated as "no saved plan". */
function readPayload(raw: unknown): RoutePlanPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<RoutePlanPayload>
  if (p.version !== 1) return null
  if (!Array.isArray(p.order) || !Array.isArray(p.includedIds)) return null
  return {
    version: 1,
    order: p.order.filter((v): v is string => typeof v === 'string'),
    includedIds: p.includedIds.filter((v): v is string => typeof v === 'string'),
    locks: Array.isArray(p.locks) ? p.locks : [],
    departureHHmm: typeof p.departureHHmm === 'string' ? p.departureHHmm : '',
    returnToDepot: p.returnToDepot !== false,
    geometry: p.geometry,
  }
}

export async function fetchRoutePlan(day: string, endDay?: string): Promise<SavedRoutePlan | null> {
  const { data, error } = await supabase.rpc('get_delivery_route_plan', {
    p_day: day,
    p_end_day: endDay || day,
  })
  if (error) throw error
  if (!data) return null
  const row = data as RawPlanRow
  const plan = readPayload(row.plan)
  if (!plan) return null
  return {
    id: row.id,
    routeDate: row.routeDate,
    endDate: row.endDate,
    plan,
    filters: (row.filters && typeof row.filters === 'object' ? row.filters : {}) as RoutePlanFilters,
    savedAt: row.savedAt,
    savedByName: row.savedByName,
    orderIds: row.orderIds ?? [],
  }
}

export async function saveRoutePlan(args: {
  day: string
  endDay?: string
  plan: RoutePlanPayload
  orderIds: string[]
  filters: RoutePlanFilters
}): Promise<void> {
  // `saved_by` / `saved_at` are stamped by a BEFORE trigger, never sent from
  // here — a client-supplied author would be spoofable, and an upsert that
  // omitted the column would leave the previous author's name on a re-save.
  const { error } = await supabase
    .from('delivery_route_plans')
    .upsert(
      {
        route_date: args.day,
        end_date: args.endDay || args.day,
        plan: args.plan,
        order_ids: args.orderIds,
        filters: args.filters,
      },
      { onConflict: 'route_date,end_date' },
    )
  if (error) throw error
}

export async function deleteRoutePlan(day: string, endDay?: string): Promise<void> {
  const { error } = await supabase
    .from('delivery_route_plans')
    .delete()
    .eq('route_date', day)
    .eq('end_date', endDay || day)
  if (error) throw error
}

// ---- payload <-> runtime helpers ------------------------------------------

/** Freeze the current arrangement into a storable payload. */
export function buildPlanPayload(args: {
  order: string[]
  includedIds: string[]
  locks: Map<string, LockPosition>
  departureHHmm: string
  returnToDepot: boolean
  route: PlannedRoute | null
}): RoutePlanPayload {
  const { route } = args
  return {
    version: 1,
    order: args.order,
    includedIds: args.includedIds,
    locks: [...args.locks.entries()].map(([customerId, position]) => ({ customerId, position })),
    departureHHmm: args.departureHHmm,
    returnToDepot: args.returnToDepot,
    geometry: route
      ? {
          mode: route.mode,
          totals: route.totals,
          overviewPolyline: route.overviewPolyline,
          departureTime: route.departureTime,
          truncatedOptimization: route.truncatedOptimization,
          depot: route.depot,
          stops: route.stops.map(s => ({
            customerId: s.customerId,
            lat: s.lat,
            lng: s.lng,
            geocodeStatus: s.geocodeStatus,
            legDistanceMeters: s.legDistanceMeters,
            legDurationSeconds: s.legDurationSeconds,
            etaSeconds: s.etaSeconds,
          })),
        }
      : undefined,
  }
}

/**
 * Rebuild a `PlannedRoute` from a saved geometry cache by joining it onto the
 * LIVE candidate stops. Stops whose customer no longer has an order that day
 * simply drop out; a live stop with no saved geometry is skipped here and
 * surfaces through the drift banner instead.
 */
export function hydrateRouteFromGeometry(
  payload: RoutePlanPayload,
  candidates: RouteStopInput[],
  order: string[],
): PlannedRoute | null {
  const geometry = payload.geometry
  if (!geometry) return null
  const geoById = new Map(geometry.stops.map(g => [g.customerId, g]))
  const candById = new Map(candidates.map(c => [c.customerId, c]))
  const stops = order
    .map(id => {
      const c = candById.get(id)
      const g = geoById.get(id)
      if (!c || !g) return null
      return {
        ...c,
        sequence: 0,
        locked: false,
        lat: g.lat,
        lng: g.lng,
        geocodeStatus: g.geocodeStatus,
        legDistanceMeters: g.legDistanceMeters,
        legDurationSeconds: g.legDurationSeconds,
        etaSeconds: g.etaSeconds,
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s, i) => ({ ...s, sequence: i + 1 }))

  if (stops.length === 0) return null
  return {
    mode: geometry.mode,
    stops,
    geocodeFailures: [],
    totals: geometry.totals,
    overviewPolyline: geometry.overviewPolyline,
    departureTime: geometry.departureTime,
    returnToDepot: payload.returnToDepot,
    truncatedOptimization: geometry.truncatedOptimization,
    depot: geometry.depot,
  }
}

/** Drift between the order set a plan was saved against and the live one. */
export interface RoutePlanDrift {
  addedOrderIds: string[]
  removedOrderIds: string[]
  /** Customers that are in the live set but were not in the saved arrangement —
   *  these become brand-new stops appended at the end. */
  newCustomerIds: string[]
  hasDrift: boolean
}

export function diffRoutePlan(
  saved: SavedRoutePlan,
  candidates: RouteStopInput[],
): RoutePlanDrift {
  const savedOrders = new Set(saved.orderIds)
  const liveOrders = new Set(candidates.flatMap(c => c.orderIds))
  const knownCustomers = new Set(saved.plan.order)

  const addedOrderIds = [...liveOrders].filter(id => !savedOrders.has(id))
  const removedOrderIds = [...savedOrders].filter(id => !liveOrders.has(id))
  const newCustomerIds = candidates
    .filter(c => !knownCustomers.has(c.customerId))
    .map(c => c.customerId)

  return {
    addedOrderIds,
    removedOrderIds,
    newCustomerIds,
    hasDrift: addedOrderIds.length > 0 || removedOrderIds.length > 0,
  }
}
