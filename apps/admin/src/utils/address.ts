import type { Customer } from '../types'

/**
 * Address helpers for customer-facing documents.
 *
 * The canonical *route* rule lives in `services/route.ts` (`resolveDeliveryAddress`)
 * and answers "where does the van go?" — it always returns an address. Documents
 * ask a different question: "is there a SEPARATE delivery address worth printing
 * next to the invoice address?". Some customers have
 * `shipping_same_as_billing = false` while the shipping address is byte-identical
 * to the billing one (WooCommerce imports do this), and printing the same block
 * twice looks like a bug. So this helper returns null unless the address really
 * differs.
 */

export interface AddressParts {
  street?: string
  postalCode?: string
  city?: string
  country?: string
}

const norm = (v?: string | null) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
/** Postal codes differ only in spacing between systems ("2521BC" vs "2521 BC"). */
const normPostal = (v?: string | null) => (v ?? '').replace(/\s+/g, '').toLowerCase()

/**
 * The customer's shipping address, but only when it is actually filled in AND
 * differs from the billing address. Returns null otherwise — callers use that
 * to decide whether a "Afleveradres" block belongs on the document at all.
 */
export function resolveShippingAddress(c: Partial<Customer> | null | undefined): AddressParts | null {
  if (!c) return null
  // `true`/undefined both mean "same as billing" (the column defaults to true).
  if (c.shipping_same_as_billing !== false) return null

  const street = (c.shipping_street ?? '').trim()
  const city = (c.shipping_city ?? '').trim()
  // An empty shipping address is not a delivery address, whatever the flag says.
  if (!street && !city) return null

  const postalCode = (c.shipping_postal_code ?? '').trim()
  const country = ((c.shipping_country ?? '') || (c.billing_country ?? '')).trim()

  const sameAsBilling =
    norm(street) === norm(c.billing_street) &&
    normPostal(postalCode) === normPostal(c.billing_postal_code) &&
    norm(city) === norm(c.billing_city) &&
    norm(country) === norm(c.billing_country)
  if (sameAsBilling) return null

  return {
    street: street || undefined,
    postalCode: postalCode || undefined,
    city: city || undefined,
    country: country || undefined,
  }
}

/**
 * Compact address lines for a PDF block: street, then "1234 AB Stad, NL".
 * Mirrors the country-merged-into-the-city-line convention used by every
 * document template (see CLAUDE.md → PDF Document Templates).
 */
export function buildAddressLines(a: AddressParts | null | undefined): string[] {
  if (!a) return []
  const lines: string[] = []
  if (a.street) lines.push(a.street)
  const cityParts: string[] = []
  if (a.postalCode && a.city) cityParts.push(`${a.postalCode} ${a.city}`)
  else if (a.city) cityParts.push(a.city)
  if (a.country && a.country !== a.city) cityParts.push(a.country)
  if (cityParts.length) lines.push(cityParts.join(', '))
  return lines
}
