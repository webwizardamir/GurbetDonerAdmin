// Supabase Edge Function: plan-delivery-route
//
// Geocodes the day's delivery addresses (cache-miss only, written back to
// customers) and optimises the driving order via the Google Directions API.
//
// Security model:
//  - Caller authenticates with their normal user JWT. We verify the user is an
//    admin (owner / shop_manager) — the same roles that may see Sold Products.
//  - The candidate stop set is derived SERVER-SIDE from {delivery_date, city}.
//    The client can only narrow it (selectedCustomerIds), constrain its order
//    (lockedStops / order), and set departureTime / returnToDepot. It can NEVER
//    send arbitrary addresses to geocode — that would be an open billed proxy.
//  - GOOGLE_MAPS_API_KEY is a function secret; it never reaches the browser.
//
// Request:
//   { delivery_date: 'YYYY-MM-DD', city?, mode?: 'auto'|'manual'|'mixed',
//     selectedCustomerIds?: string[], order?: string[],
//     lockedStops?: {customerId, position: number|'first'|'last'}[],
//     departureTime?: string|null, returnToDepot?: boolean }
//
// Response: see EdgePlanResponse below (matches src/services/route.ts).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_STOPS = 60                 // hard cap — bounds billed Google calls
const DIRECTIONS_WAYPOINT_CAP = 23   // intermediate waypoints per Directions call (≤25 incl. some headroom)

type LockPosition = number | 'first' | 'last'
interface RouteLock { customerId: string; position: LockPosition }

interface PlanRequest {
  delivery_date: string
  city?: string
  mode?: 'auto' | 'manual' | 'mixed'
  selectedCustomerIds?: string[]
  order?: string[]
  lockedStops?: RouteLock[]
  departureTime?: string | null
  returnToDepot?: boolean
}

interface Candidate {
  customerId: string
  oneLine: string
  lat: number | null
  lng: number | null
  hash: string
  status: 'ok' | 'zero_results' | 'error' | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!GOOGLE_KEY) return json({ error: 'GOOGLE_MAPS_API_KEY secret is not set' }, 500)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // 1. Verify caller + role
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)
    const { data: profile } = await userClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'owner' && profile.role !== 'shop_manager')) {
      return json({ error: 'forbidden: admin only' }, 403)
    }

    // 2. Validate input
    const body = await req.json() as PlanRequest
    if (!body.delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.delivery_date)) {
      return json({ error: 'invalid delivery_date (YYYY-MM-DD)' }, 400)
    }
    const mode = body.mode ?? 'auto'
    const returnToDepot = body.returnToDepot ?? true

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 3. Derive candidate stops server-side
    const candidates = await deriveCandidates(admin, body.delivery_date, body.city)
    if (candidates.length === 0) {
      return json(emptyResponse(mode, body.departureTime ?? null, returnToDepot), 200)
    }
    if (candidates.length > MAX_STOPS) {
      return json({ error: `too many stops (${candidates.length} > ${MAX_STOPS})` }, 400)
    }

    // 4. Determine the working set
    let workingIds: string[]
    if (mode === 'manual' && body.order?.length) {
      const valid = new Set(candidates.map(c => c.customerId))
      workingIds = body.order.filter(id => valid.has(id))
    } else if (body.selectedCustomerIds?.length) {
      const sel = new Set(body.selectedCustomerIds)
      workingIds = candidates.filter(c => sel.has(c.customerId)).map(c => c.customerId)
    } else {
      workingIds = candidates.map(c => c.customerId)
    }

    // 5. Geocode the depot (if needed) + the working stops (cache-miss only)
    const depot = await getDepot(admin)
    let depotPersist: { lat: number; lng: number } | undefined
    if (depot && (depot.lat == null || depot.lng == null) && depot.oneLine) {
      const g = await geocode(depot.oneLine, GOOGLE_KEY)
      if (g.status === 'ok') { depot.lat = g.lat; depot.lng = g.lng; depotPersist = { lat: g.lat!, lng: g.lng! } }
    }
    if (!depot || depot.lat == null || depot.lng == null) {
      return json({ error: 'depot address is not set or could not be geocoded (Instellingen → Bezorgdepot)' }, 400)
    }

    const candById = new Map(candidates.map(c => [c.customerId, c]))
    for (const id of workingIds) {
      const c = candById.get(id)!
      const cacheHit = c.lat != null && c.lng != null && c.status === 'ok'
      if (cacheHit) continue
      const g = await geocode(c.oneLine, GOOGLE_KEY)
      c.lat = g.lat; c.lng = g.lng; c.status = g.status
      await admin.from('customers').update({
        latitude: g.lat, longitude: g.lng,
        geocoded_at: new Date().toISOString(),
        geocode_address_hash: c.hash,
        geocode_status: g.status,
      }).eq('id', id)
    }

    // 6. Split routable vs failed
    const routable = workingIds.map(id => candById.get(id)!).filter(c => c.lat != null && c.lng != null && c.status === 'ok')
    const geocodeFailures = workingIds
      .map(id => candById.get(id)!)
      .filter(c => !(c.lat != null && c.lng != null && c.status === 'ok'))
      .map(c => ({ customerId: c.customerId, reason: c.status || 'no_result' }))

    const geocodeStatuses = workingIds.map(id => {
      const c = candById.get(id)!
      return { customerId: id, status: (c.status ?? 'error') as 'ok' | 'zero_results' | 'error', lat: c.lat, lng: c.lng }
    })

    if (routable.length === 0) {
      return json({
        ...emptyResponse(mode, body.departureTime ?? null, returnToDepot),
        geocodeFailures, geocodeStatuses, depotPersist,
      }, 200)
    }

    // 7. Build the visiting order
    let orderedIds: string[]
    let truncated = false
    if (mode === 'manual') {
      orderedIds = routable.map(c => c.customerId)
    } else if (mode === 'mixed') {
      orderedIds = buildConstrainedOrder(routable, depot, body.lockedStops ?? [])
    } else {
      // auto
      if (routable.length <= DIRECTIONS_WAYPOINT_CAP) {
        const opt = await optimizeDirections(routable, depot, returnToDepot, GOOGLE_KEY)
        orderedIds = opt.orderedIds
      } else {
        orderedIds = greedyOrder(routable, depot)
        truncated = true
      }
    }

    // 8. Compute legs for the final order (chunked when > cap)
    const ordered = orderedIds.map(id => candById.get(id)!)
    if (ordered.length > DIRECTIONS_WAYPOINT_CAP) truncated = true
    const legs = await computeLegsChunked(ordered, depot, returnToDepot, GOOGLE_KEY)

    // 9. Assemble response
    const orderedStops = ordered.map((c, i) => ({
      customerId: c.customerId,
      sequence: i + 1,
      locked: isLocked(c.customerId, body.lockedStops),
      legDistanceMeters: legs.perStop[i]?.distance ?? 0,
      legDurationSeconds: legs.perStop[i]?.duration ?? 0,
      etaSeconds: legs.perStop[i]?.eta ?? 0,
    }))

    return json({
      mode,
      orderedStops,
      totals: { distanceMeters: legs.totalDistance, durationSeconds: legs.totalDuration, stopCount: ordered.length },
      overviewPolyline: legs.polyline,
      departureTime: body.departureTime ?? null,
      returnToDepot,
      truncatedOptimization: truncated,
      geocodeFailures,
      geocodeStatuses,
      depotPersist,
    }, 200)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

// ===========================================================================
// Candidate derivation
// ===========================================================================
async function deriveCandidates(admin: ReturnType<typeof createClient>, day: string, city?: string): Promise<Candidate[]> {
  const { data, error } = await admin
    .from('orders')
    .select(`
      customer_id,
      customer:customers!customer_id(
        id, billing_street, billing_postal_code, billing_city, billing_country,
        shipping_same_as_billing, shipping_street, shipping_postal_code, shipping_city, shipping_country,
        latitude, longitude, geocode_address_hash, geocode_status
      )
    `)
    .eq('order_date', day)
    .not('status', 'in', '(cancelled,refunded)')
  if (error) throw error

  const byId = new Map<string, Candidate>()
  for (const row of (data as Record<string, unknown>[]) ?? []) {
    const c = row.customer as Record<string, unknown> | null
    if (!c) continue
    const addr = resolveAddress(c)
    if (city && addr.city !== city) continue
    const id = c.id as string
    if (byId.has(id)) continue
    const hash = await sha256(addr.oneLine.toLowerCase().trim())
    const storedHash = (c.geocode_address_hash as string | null) ?? ''
    const fresh = storedHash === hash
    byId.set(id, {
      customerId: id,
      oneLine: addr.oneLine,
      lat: fresh ? (c.latitude as number | null) : null,
      lng: fresh ? (c.longitude as number | null) : null,
      hash,
      status: fresh ? ((c.geocode_status as Candidate['status']) ?? null) : null,
    })
  }
  return Array.from(byId.values())
}

function resolveAddress(c: Record<string, unknown>): { oneLine: string; city?: string } {
  const useShipping = c.shipping_same_as_billing === false && !!(c.shipping_street || c.shipping_city)
  const street = (useShipping ? c.shipping_street : c.billing_street) as string | null
  const postal = (useShipping ? c.shipping_postal_code : c.billing_postal_code) as string | null
  const city = (useShipping ? c.shipping_city : c.billing_city) as string | null
  const country = ((useShipping ? c.shipping_country : c.billing_country) || c.billing_country) as string | null
  const parts: string[] = []
  if (street) parts.push(street)
  const cityParts: string[] = []
  if (postal && city) cityParts.push(`${postal} ${city}`)
  else if (city) cityParts.push(city)
  if (country && country !== city) cityParts.push(country)
  if (cityParts.length) parts.push(cityParts.join(', '))
  return { oneLine: parts.join(', '), city: city ?? undefined }
}

async function getDepot(admin: ReturnType<typeof createClient>): Promise<{ oneLine: string; lat: number | null; lng: number | null } | null> {
  const { data } = await admin.from('document_settings')
    .select('depot_street, depot_postal_code, depot_city, depot_country, depot_latitude, depot_longitude')
    .limit(1).maybeSingle()
  if (!data) return null
  const s = data as Record<string, unknown>
  const parts: string[] = []
  if (s.depot_street) parts.push(s.depot_street as string)
  const cityParts: string[] = []
  if (s.depot_postal_code && s.depot_city) cityParts.push(`${s.depot_postal_code} ${s.depot_city}`)
  else if (s.depot_city) cityParts.push(s.depot_city as string)
  if (s.depot_country) cityParts.push(s.depot_country as string)
  if (cityParts.length) parts.push(cityParts.join(', '))
  return { oneLine: parts.join(', '), lat: (s.depot_latitude as number | null) ?? null, lng: (s.depot_longitude as number | null) ?? null }
}

// ===========================================================================
// Google APIs
// ===========================================================================
async function geocode(address: string, key: string): Promise<{ lat: number | null; lng: number | null; status: 'ok' | 'zero_results' | 'error' }> {
  if (!address) return { lat: null, lng: null, status: 'zero_results' }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=nl&key=${key}`
    const r = await fetch(url)
    const d = await r.json()
    if (d.status === 'OK' && d.results?.[0]) {
      const loc = d.results[0].geometry.location
      return { lat: loc.lat, lng: loc.lng, status: 'ok' }
    }
    if (d.status === 'ZERO_RESULTS') return { lat: null, lng: null, status: 'zero_results' }
    return { lat: null, lng: null, status: 'error' }
  } catch {
    return { lat: null, lng: null, status: 'error' }
  }
}

interface Pt { customerId: string; lat: number | null; lng: number | null }

/** Directions with optimize:true over all stops; depot as origin (+destination if return). */
async function optimizeDirections(stops: Candidate[], depot: { lat: number | null; lng: number | null }, returnToDepot: boolean, key: string): Promise<{ orderedIds: string[] }> {
  const origin = `${depot.lat},${depot.lng}`
  const destination = returnToDepot ? origin : `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`
  const waypointStops = returnToDepot ? stops : stops.slice(0, -1)
  const wp = 'optimize:true|' + waypointStops.map(s => `${s.lat},${s.lng}`).join('|')
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(wp)}&mode=driving&region=nl&key=${key}`
  const r = await fetch(url)
  const d = await r.json()
  if (d.status !== 'OK' || !d.routes?.[0]) {
    // fall back to input order
    return { orderedIds: stops.map(s => s.customerId) }
  }
  const order: number[] = d.routes[0].waypoint_order ?? waypointStops.map((_: unknown, i: number) => i)
  const orderedWaypoints = order.map(i => waypointStops[i].customerId)
  const orderedIds = returnToDepot ? orderedWaypoints : [...orderedWaypoints, stops[stops.length - 1].customerId]
  return { orderedIds }
}

/** Compute real legs/distances/ETAs for a fixed visiting order, chunking the
 *  Directions calls when the order exceeds the waypoint cap. */
async function computeLegsChunked(ordered: Pt[], depot: { lat: number; lng: number }, returnToDepot: boolean, key: string): Promise<{ perStop: { distance: number; duration: number; eta: number }[]; totalDistance: number; totalDuration: number; polyline: string }> {
  const perStop: { distance: number; duration: number; eta: number }[] = []
  let totalDistance = 0
  let totalDuration = 0
  let cumEta = 0
  const polylines: string[] = []

  // Sequence of points: depot, stop1..stopN, [depot]
  const points: { lat: number; lng: number }[] = [
    { lat: depot.lat, lng: depot.lng },
    ...ordered.map(s => ({ lat: s.lat as number, lng: s.lng as number })),
  ]
  if (returnToDepot) points.push({ lat: depot.lat, lng: depot.lng })

  // Walk the point chain in chunks of (cap + 2) points so each Directions
  // request stays within the waypoint limit. legIndex maps to ordered[] index.
  let legCursor = 0 // index into ordered[] for the next arriving stop
  for (let start = 0; start < points.length - 1; start += DIRECTIONS_WAYPOINT_CAP + 1) {
    const end = Math.min(start + DIRECTIONS_WAYPOINT_CAP + 1, points.length - 1)
    const chunk = points.slice(start, end + 1)
    if (chunk.length < 2) break
    const origin = `${chunk[0].lat},${chunk[0].lng}`
    const destination = `${chunk[chunk.length - 1].lat},${chunk[chunk.length - 1].lng}`
    const mid = chunk.slice(1, -1).map(p => `${p.lat},${p.lng}`)
    const wpParam = mid.length ? `&waypoints=${encodeURIComponent(mid.join('|'))}` : ''
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${wpParam}&mode=driving&region=nl&key=${key}`
    const r = await fetch(url)
    const d = await r.json()
    const route = d.routes?.[0]
    if (!route) continue
    if (route.overview_polyline?.points) polylines.push(route.overview_polyline.points)
    for (const leg of route.legs ?? []) {
      const dist = leg.distance?.value ?? 0
      const dur = leg.duration?.value ?? 0
      totalDistance += dist
      totalDuration += dur
      cumEta += dur
      // Each leg arrives at the next point. Only record per-stop legs for the
      // ordered[] stops (skip the final return-to-depot leg).
      if (legCursor < ordered.length) {
        perStop.push({ distance: dist, duration: dur, eta: cumEta })
        legCursor++
      }
    }
  }
  return { perStop, totalDistance, totalDuration, polyline: polylines[0] ?? '' }
}

// ===========================================================================
// Ordering helpers (haversine greedy nearest-neighbour)
// ===========================================================================
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function greedyOrder(stops: Candidate[], depot: { lat: number | null; lng: number | null }): string[] {
  const remaining = stops.slice()
  const out: string[] = []
  let cur = { lat: depot.lat as number, lng: depot.lng as number }
  while (remaining.length) {
    let bestIdx = 0, bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const dd = haversine(cur, { lat: remaining[i].lat as number, lng: remaining[i].lng as number })
      if (dd < bestDist) { bestDist = dd; bestIdx = i }
    }
    const next = remaining.splice(bestIdx, 1)[0]
    out.push(next.customerId)
    cur = { lat: next.lat as number, lng: next.lng as number }
  }
  return out
}

/** Honour locked positions (first/last/index); fill the rest greedily. */
function buildConstrainedOrder(stops: Candidate[], depot: { lat: number | null; lng: number | null }, locks: RouteLock[]): string[] {
  const N = stops.length
  const byId = new Map(stops.map(s => [s.customerId, s]))
  const slots: (string | null)[] = new Array(N).fill(null)
  const lockedIds = new Set<string>()

  // Resolve each lock to a concrete slot index.
  const resolved = locks
    .filter(l => byId.has(l.customerId))
    .map(l => ({
      id: l.customerId,
      idx: l.position === 'first' ? 0 : l.position === 'last' ? N - 1 : Math.max(0, Math.min(N - 1, l.position)),
    }))
    .sort((a, b) => a.idx - b.idx)
  for (const r of resolved) {
    let idx = r.idx
    while (idx < N && slots[idx] !== null) idx++
    if (idx >= N) { idx = slots.lastIndexOf(null) }
    if (idx >= 0) { slots[idx] = r.id; lockedIds.add(r.id) }
  }

  const free = stops.filter(s => !lockedIds.has(s.customerId))
  let cur = { lat: depot.lat as number, lng: depot.lng as number }
  for (let i = 0; i < N; i++) {
    if (slots[i] !== null) { const s = byId.get(slots[i]!)!; cur = { lat: s.lat as number, lng: s.lng as number }; continue }
    if (!free.length) continue
    let bestIdx = 0, bestDist = Infinity
    for (let j = 0; j < free.length; j++) {
      const dd = haversine(cur, { lat: free[j].lat as number, lng: free[j].lng as number })
      if (dd < bestDist) { bestDist = dd; bestIdx = j }
    }
    const next = free.splice(bestIdx, 1)[0]
    slots[i] = next.customerId
    cur = { lat: next.lat as number, lng: next.lng as number }
  }
  return slots.filter((s): s is string => s !== null)
}

function isLocked(id: string, locks?: RouteLock[]): boolean {
  return !!locks?.some(l => l.customerId === id)
}

// ===========================================================================
// Utils
// ===========================================================================
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function emptyResponse(mode: string, departureTime: string | null, returnToDepot: boolean) {
  return {
    mode, orderedStops: [], totals: { distanceMeters: 0, durationSeconds: 0, stopCount: 0 },
    overviewPolyline: '', departureTime, returnToDepot, truncatedOptimization: false,
    geocodeFailures: [], geocodeStatuses: [],
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
