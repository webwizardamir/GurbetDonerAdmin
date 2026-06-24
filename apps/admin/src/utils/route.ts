// Pure helpers for the delivery-route feature: Dutch distance/time formatting
// and the Google Maps deep-link builder. No network, no React.

import type { DepotInfo, PlannedStop } from '../services/route'

/** "12,3 km" or "850 m" (Dutch decimal comma). */
export function formatDistance(meters: number): string {
  if (!meters || meters < 0) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km.toFixed(1).replace('.', ',')} km`
}

/** "1 u 23 min" / "45 min" / "30 sec". */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '—'
  const totalMin = Math.round(seconds / 60)
  if (totalMin < 1) return `${Math.round(seconds)} sec`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} u` : `${h} u ${m} min`
}

/** Add `seconds` to an ISO departure time and format as Dutch HH:mm clock. */
export function etaClock(departureTime: string | null, etaSeconds: number): string | null {
  if (!departureTime) return null
  const base = new Date(departureTime).getTime()
  if (Number.isNaN(base)) return null
  const d = new Date(base + etaSeconds * 1000)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

/** A single waypoint usable in a Google Maps directions URL — prefer
 *  coordinates (exact), fall back to the address string. */
function waypointToken(lat: number | null, lng: number | null, address: string): string {
  if (lat != null && lng != null) return `${lat},${lng}`
  return address
}

/**
 * Build a Google Maps "directions" deep link for the optimised stop order.
 * origin/destination = depot when returnToDepot; otherwise destination is the
 * last stop. Only geocoded stops (geocodeStatus 'ok') are included.
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsUrl(
  depot: DepotInfo,
  stops: PlannedStop[],
  returnToDepot: boolean,
): string {
  const routable = stops.filter(s => s.lat != null && s.lng != null)
  const depotToken = waypointToken(depot.lat, depot.lng, depot.oneLine)

  const stopTokens = routable.map(s => waypointToken(s.lat, s.lng, s.address.oneLine))

  let destination: string
  let waypoints: string[]
  if (returnToDepot || stopTokens.length === 0) {
    destination = depotToken
    waypoints = stopTokens
  } else {
    destination = stopTokens[stopTokens.length - 1]
    waypoints = stopTokens.slice(0, -1)
  }

  const params = new URLSearchParams({
    api: '1',
    origin: depotToken,
    destination,
    travelmode: 'driving',
  })
  if (waypoints.length) params.set('waypoints', waypoints.join('|'))

  return `https://www.google.com/maps/dir/?${params.toString()}`
}
