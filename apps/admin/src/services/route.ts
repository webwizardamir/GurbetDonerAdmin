import { supabase } from './supabase'
import { fetchDocumentSettings, updateDocumentSettings } from './documents'
import type { Customer } from '../types'
import { catchWeightPartsOf } from '../utils/catchWeight'

// ===========================================================================
// Delivery Route (Bezorgroute) service
// ---------------------------------------------------------------------------
// Two responsibilities:
//   1. fetchRouteOrders() — client-side display data (customer, address,
//      product manifest) for the day, one stop per customer.
//   2. planDeliveryRoute() / computeLegsForOrder() — invoke the secure
//      plan-delivery-route edge function which geocodes (cache-miss only) and
//      optimises the order via Google Directions. The function derives the
//      candidate stop set server-side from {delivery_date, city}; the client
//      only controls *which* stops + ordering constraints (never raw
//      addresses), and joins the manifests back in by customerId.
// ===========================================================================

export type LockPosition = number | 'first' | 'last'
export interface RouteLock {
  customerId: string
  position: LockPosition
}

export interface DeliveryAddress {
  street?: string
  postalCode?: string
  city?: string
  country?: string
  oneLine: string
}

export interface RouteManifestItem {
  productName: string
  quantity: number
  unitType: string
  // Catch weight (00117). The van is loaded by the PIECE, not the kilo — "35
  // spiesen" is what the driver counts off the tail lift — so the manifest and
  // the loading list carry the breakdown beside the kilos.
  pieceCount?: number | null
  pieceWeightKg?: number | null
  notes?: string | null
}

/** Display data for one delivery stop (one customer, 1+ merged orders). */
export interface RouteStopInput {
  customerId: string
  customerName: string
  contactPerson?: string
  phone?: string
  deliveryNotes?: string
  address: DeliveryAddress
  items: RouteManifestItem[]
  orderIds: string[]
  orderNumbers: string[]
  cachedLat: number | null
  cachedLng: number | null
}

export interface DepotInfo {
  label: string
  oneLine: string
  lat: number | null
  lng: number | null
}

// ---- Edge function wire shapes --------------------------------------------
type RouteMode = 'auto' | 'manual' | 'mixed'

interface EdgeOrderedStop {
  customerId: string
  sequence: number
  locked: boolean
  legDistanceMeters: number
  legDurationSeconds: number
  etaSeconds: number
}

interface EdgePlanResponse {
  mode: RouteMode
  orderedStops: EdgeOrderedStop[]
  totals: { distanceMeters: number; durationSeconds: number; stopCount: number }
  overviewPolyline: string
  departureTime: string | null
  returnToDepot: boolean
  truncatedOptimization: boolean
  geocodeFailures: { customerId: string; reason: string }[]
  geocodeStatuses: { customerId: string; status: 'ok' | 'zero_results' | 'error'; lat: number | null; lng: number | null }[]
  depotPersist?: { lat: number; lng: number }
}

// ---- Client result shapes -------------------------------------------------
export interface PlannedStop extends RouteStopInput {
  sequence: number
  locked: boolean
  lat: number | null
  lng: number | null
  geocodeStatus: 'ok' | 'zero_results' | 'error'
  legDistanceMeters: number
  legDurationSeconds: number
  etaSeconds: number
}

export interface PlannedRoute {
  mode: RouteMode
  stops: PlannedStop[]              // delivery order (sequence ascending)
  geocodeFailures: PlannedStop[]    // stops that could not be geocoded (off-route)
  totals: { distanceMeters: number; durationSeconds: number; stopCount: number }
  overviewPolyline: string
  departureTime: string | null
  returnToDepot: boolean
  truncatedOptimization: boolean
  depot: DepotInfo
}

export interface PlanRouteArgs {
  day: string
  endDay?: string
  cities?: string[]
  selectedCustomerIds?: string[]
  lockedStops?: RouteLock[]
  departureTime?: string | null
  returnToDepot?: boolean
}

export interface ComputeLegsArgs {
  day: string
  endDay?: string
  cities?: string[]
  order: string[]
  departureTime?: string | null
  returnToDepot?: boolean
}

// ===========================================================================
// Address resolution
// ===========================================================================

/** Resolve the delivery address: shipping when set & not "same as billing",
 *  else billing. Country is merged into the city line to stay compact. */
export function resolveDeliveryAddress(c: Partial<Customer>): DeliveryAddress {
  const useShipping =
    c.shipping_same_as_billing === false && !!(c.shipping_street || c.shipping_city)

  const street = useShipping ? c.shipping_street : c.billing_street
  const postalCode = useShipping ? c.shipping_postal_code : c.billing_postal_code
  const city = useShipping ? c.shipping_city : c.billing_city
  const country = (useShipping ? c.shipping_country : c.billing_country) || c.billing_country

  const parts: string[] = []
  if (street) parts.push(street)
  const cityParts: string[] = []
  if (postalCode && city) cityParts.push(`${postalCode} ${city}`)
  else if (city) cityParts.push(city)
  if (country && country !== city) cityParts.push(country)
  if (cityParts.length) parts.push(cityParts.join(', '))

  return {
    street: street || undefined,
    postalCode: postalCode || undefined,
    city: city || undefined,
    country: country || undefined,
    oneLine: parts.join(', '),
  }
}

// ===========================================================================
// Display data for the day (one stop per customer)
// ===========================================================================

interface OrderItemRow {
  product_name: string
  quantity: number | string
  piece_count?: number | string | null
  piece_weight_kg?: number | string | null
  unit_type: string
  notes: string | null
}
interface OrderRow {
  id: string
  order_number: string
  status: string
  delivery_notes: string | null
  customer_id: string
  customer: (Partial<Customer> & { id: string; company_name: string }) | null
  items: OrderItemRow[]
}

/** Statuses that can never be delivered, so they never become a route stop.
 *  `draft` (Concept) is an unfinalised order — it carries no invoice and must
 *  not be planned into a van run (see CLAUDE.md → Draft orders). */
const NON_ROUTABLE_STATUSES = ['draft', 'cancelled', 'refunded'] as const

export interface RouteCandidates {
  stops: RouteStopInput[]
  /** Order counts per status for the window (after city/customer-type filtering
   *  but BEFORE the status filter), so the panel's dropdown can show a stable
   *  "Afgerond (12)" next to every option regardless of what's selected. */
  statusCounts: Record<string, number>
}

export async function fetchRouteOrders(args: { day: string; endDay?: string; cities?: string[]; customerType?: string[]; statuses?: string[] }): Promise<RouteCandidates> {
  const citySet = args.cities && args.cities.length ? new Set(args.cities) : null
  const statusSet = args.statuses && args.statuses.length ? new Set(args.statuses) : null
  const typeSet = args.customerType && args.customerType.length ? new Set(args.customerType) : null
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, delivery_notes, customer_id,
      customer:customers!customer_id(
        id, company_name, contact_person, phone, customer_type,
        billing_street, billing_postal_code, billing_city, billing_country,
        shipping_same_as_billing, shipping_street, shipping_postal_code, shipping_city, shipping_country,
        latitude, longitude, geocode_status
      ),
      items:order_items(product_name, quantity, unit_type, piece_count, piece_weight_kg, notes)
    `)
    .gte('order_date', args.day)
    .lte('order_date', args.endDay || args.day)
    .not('status', 'in', `(${NON_ROUTABLE_STATUSES.join(',')})`)
    .is('deleted_at', null)

  if (error) throw error

  const rows = (data as unknown as OrderRow[]) ?? []

  // Merge all of a customer's orders for the day into one stop.
  const byCustomer = new Map<string, RouteStopInput>()
  const statusCounts: Record<string, number> = {}
  for (const row of rows) {
    const c = row.customer
    if (!c) continue
    // Optional admin-only customer-type filter (e.g. a Horeca-only route, or
    // Horeca + Supermarkt in one run). Untagged customers match no selected
    // type, same as everywhere else the type filter is applied.
    if (typeSet && !(c.customer_type && typeSet.has(c.customer_type))) continue
    const address = resolveDeliveryAddress(c)
    if (citySet && !(address.city && citySet.has(address.city))) continue

    // Count before the status filter so every option keeps its true count.
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1
    // Filter per ORDER, not per stop: a customer with a completed and an
    // on-hold order for the same day keeps only the matching order's items.
    if (statusSet && !statusSet.has(row.status)) continue

    let stop = byCustomer.get(c.id)
    if (!stop) {
      stop = {
        customerId: c.id,
        customerName: c.company_name,
        contactPerson: c.contact_person || undefined,
        phone: c.phone || undefined,
        deliveryNotes: row.delivery_notes || undefined,
        address,
        items: [],
        orderIds: [],
        orderNumbers: [],
        cachedLat: c.latitude ?? null,
        cachedLng: c.longitude ?? null,
      }
      byCustomer.set(c.id, stop)
    } else if (row.delivery_notes && !stop.deliveryNotes) {
      stop.deliveryNotes = row.delivery_notes
    }

    stop.orderIds.push(row.id)
    stop.orderNumbers.push(row.order_number)
    for (const it of row.items ?? []) {
      const cw = catchWeightPartsOf(it)
      stop.items.push({
        productName: it.product_name,
        quantity: Number(it.quantity) || 0,
        unitType: it.unit_type,
        pieceCount: cw.pieceCount,
        pieceWeightKg: cw.pieceWeightKg,
        notes: it.notes,
      })
    }
  }

  const stops = Array.from(byCustomer.values()).sort((a, b) =>
    a.customerName.localeCompare(b.customerName, 'nl'),
  )
  return { stops, statusCounts }
}

// ===========================================================================
// Depot
// ===========================================================================

export async function getDepot(): Promise<DepotInfo> {
  const s = await fetchDocumentSettings()
  const parts: string[] = []
  if (s?.depot_street) parts.push(s.depot_street)
  const cityParts: string[] = []
  if (s?.depot_postal_code && s?.depot_city) cityParts.push(`${s.depot_postal_code} ${s.depot_city}`)
  else if (s?.depot_city) cityParts.push(s.depot_city)
  if (s?.depot_country) cityParts.push(s.depot_country)
  if (cityParts.length) parts.push(cityParts.join(', '))
  return {
    label: s?.depot_label || 'Magazijn',
    oneLine: parts.join(', '),
    lat: s?.depot_latitude ?? null,
    lng: s?.depot_longitude ?? null,
  }
}

// ===========================================================================
// Plan / recompute via the edge function
// ===========================================================================

async function invokePlan(body: Record<string, unknown>): Promise<EdgePlanResponse> {
  const { data, error } = await supabase.functions.invoke('plan-delivery-route', { body })
  if (error) throw error
  const resp = data as EdgePlanResponse
  // Persist a freshly-geocoded depot so we never pay to geocode it again.
  if (resp.depotPersist) {
    try {
      await updateDocumentSettings({
        depot_latitude: resp.depotPersist.lat,
        depot_longitude: resp.depotPersist.lng,
      })
    } catch {
      // Non-fatal: the route is still valid this session.
    }
  }
  return resp
}

/** Merge the edge response (ordering + geocode status) onto the display
 *  stops, producing the UI-ready PlannedRoute. */
function mergeRoute(
  display: RouteStopInput[],
  resp: EdgePlanResponse,
  depot: DepotInfo,
): PlannedRoute {
  const displayById = new Map(display.map(s => [s.customerId, s]))
  const statusById = new Map(resp.geocodeStatuses.map(g => [g.customerId, g]))
  const failedIds = new Set(resp.geocodeFailures.map(f => f.customerId))

  const stops: PlannedStop[] = resp.orderedStops
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map(o => {
      const d = displayById.get(o.customerId)
      const st = statusById.get(o.customerId)
      return {
        ...(d as RouteStopInput),
        sequence: o.sequence,
        locked: o.locked,
        lat: st?.lat ?? d?.cachedLat ?? null,
        lng: st?.lng ?? d?.cachedLng ?? null,
        geocodeStatus: st?.status ?? 'ok',
        legDistanceMeters: o.legDistanceMeters,
        legDurationSeconds: o.legDurationSeconds,
        etaSeconds: o.etaSeconds,
      }
    })
    .filter(s => s.customerId)

  const geocodeFailures: PlannedStop[] = display
    .filter(d => failedIds.has(d.customerId))
    .map(d => ({
      ...d,
      sequence: 0,
      locked: false,
      lat: null,
      lng: null,
      geocodeStatus: 'zero_results' as const,
      legDistanceMeters: 0,
      legDurationSeconds: 0,
      etaSeconds: 0,
    }))

  const depotResolved: DepotInfo = resp.depotPersist
    ? { ...depot, lat: resp.depotPersist.lat, lng: resp.depotPersist.lng }
    : depot

  return {
    mode: resp.mode,
    stops,
    geocodeFailures,
    totals: resp.totals,
    overviewPolyline: resp.overviewPolyline,
    departureTime: resp.departureTime,
    returnToDepot: resp.returnToDepot,
    truncatedOptimization: resp.truncatedOptimization,
    depot: depotResolved,
  }
}

/** Optimise the route over the selected subset, honouring any locks. */
export async function planDeliveryRoute(
  args: PlanRouteArgs,
  display: RouteStopInput[],
): Promise<PlannedRoute> {
  const depot = await getDepot()
  const resp = await invokePlan({
    delivery_date: args.day,
    end_date: args.endDay,
    cities: args.cities,
    mode: args.lockedStops && args.lockedStops.length ? 'mixed' : 'auto',
    selectedCustomerIds: args.selectedCustomerIds,
    lockedStops: args.lockedStops,
    departureTime: args.departureTime ?? null,
    returnToDepot: args.returnToDepot ?? true,
  })
  return mergeRoute(display, resp, depot)
}

/** Recompute legs/ETAs for an exact manual order (no reordering). */
export async function computeLegsForOrder(
  args: ComputeLegsArgs,
  display: RouteStopInput[],
): Promise<PlannedRoute> {
  const depot = await getDepot()
  const resp = await invokePlan({
    delivery_date: args.day,
    end_date: args.endDay,
    cities: args.cities,
    mode: 'manual',
    order: args.order,
    departureTime: args.departureTime ?? null,
    returnToDepot: args.returnToDepot ?? true,
  })
  return mergeRoute(display, resp, depot)
}
