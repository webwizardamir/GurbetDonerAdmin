import { tenantId } from '../../config/tenantId'

/**
 * Brand colours for the PDF document family, per tenant.
 *
 * WHY THIS FILE EXISTS: the dashboard recolours itself for Gurbet by remapping
 * Tailwind's `--color-green-*` ramp under `:root[data-tenant='father']`
 * (`src/index.css`). PDFs are rendered by `@react-pdf/renderer`, which has its own
 * StyleSheet and never sees a browser, a stylesheet or the `data-tenant`
 * attribute — so that remap could never reach them, and Gurbet's invoices stayed
 * Melek green. Templates now read their brand from here instead of hardcoding hex.
 *
 * ⚠️ BRAND vs SEMANTIC — do not "finish the job" by sweeping the rest of the hex
 * values out of the templates. Several are NOT branding and must stay put across
 * every tenant:
 *   - the amber `verlegd` (reverse-charge) notice,
 *   - the red due-date on an overdue invoice,
 *   - the GREEN in CreditNoteTemplate (money coming back) and in
 *     PaymentReminderTemplate's bank block (pay here) — green means positive/money,
 *     which is exactly why `index.css` refuses to remap `emerald` for the dashboard,
 *   - SoldProductsTemplate's critical/low/ok stock badges.
 * Recolouring those to the brand destroys the meaning they carry.
 *
 * Slot meanings (they differ slightly per template — each object lists only what
 * that template actually uses):
 *   primary   doc title, customer-box rule, totals top border, footer rule
 *   dark      items-table header BACKGROUND (white 6.5pt bold sits on it) + strong labels
 *   deep      darkest tone, for small text on a light tint
 *   accent    mid tone, where a template wants a lighter rule than `primary`
 *   tint      doc-number badge / banner background (dark text sits on it)
 *   tintSoft  secondary box background, zebra rows
 *
 * Melek's values are BYTE-IDENTICAL to what shipped before this file existed, so
 * no Melek document changes — historical or new. Only the `father` map is new.
 */

export interface DocBrand {
  primary: string
  dark: string
  deep?: string
  accent?: string
  tint?: string
  tintSoft?: string
  /** SoldProducts' "bijvullen" badge — its own pair so it can stay OFF the brand hue. */
  badgeTint?: string
  badgeText?: string
}

export interface DocBrandSet {
  invoice: DocBrand
  proforma: DocBrand
  creditNote: DocBrand
  orderConfirmation: DocBrand
  paymentReminder: DocBrand
  paymentOverview: DocBrand
  packingSlip: DocBrand
  soldProducts: DocBrand
  dataExport: DocBrand
  deliveryRoute: DocBrand
  customerActivity: DocBrand
}

const MELEK: DocBrandSet = {
  invoice: {
    primary: '#16a34a',
    dark: '#166534',
    accent: '#22c55e',
    tint: '#dcfce7',
    tintSoft: '#f0fdf4',
  },
  proforma: {
    primary: '#3b82f6',
    dark: '#1e40af',
    tint: '#dbeafe',
  },
  creditNote: {
    primary: '#7c3aed',
    dark: '#6d28d9',
    deep: '#5b21b6',
    accent: '#6b21a8',
    tint: '#ede9fe',
    tintSoft: '#faf5ff',
  },
  orderConfirmation: {
    primary: '#0891b2',
    dark: '#0e7490',
    tint: '#cffafe',
    tintSoft: '#f0fdfa',
  },
  paymentReminder: {
    primary: '#dc2626',
    dark: '#991b1b',
    accent: '#fca5a5',
    tint: '#fecaca',
    tintSoft: '#fef2f2',
  },
  /**
   * Monthly Betaaloverzicht (statement of account). Indigo, deliberately unused
   * elsewhere in either tenant's family.
   *
   * It must not read as the INVOICE (that is the payable document, and on Gurbet
   * the "darkest navy band = money is due" rule is load-bearing), nor as the
   * PAYMENT REMINDER — a statement is a courtesy summary that also goes to
   * customers who are perfectly within terms, so the dunning red would be a lie.
   * Indigo is far from both, and identical on both tenants because the document
   * is a summary, not a branding surface.
   */
  paymentOverview: {
    primary: '#4338ca',
    dark: '#312e81', // 12.3:1 on white
    accent: '#6366f1',
    tint: '#e0e7ff',
    tintSoft: '#eef2ff',
  },
  packingSlip: {
    primary: '#1e293b',
    dark: '#1e293b',
    accent: '#3b82f6',
  },
  soldProducts: {
    primary: '#16a34a',
    dark: '#166534',
    badgeTint: '#dbeafe',
    badgeText: '#2563eb',
  },
  dataExport: {
    primary: '#16a34a',
    dark: '#166534',
  },
  deliveryRoute: {
    primary: '#0891b2',
    dark: '#0e7490',
  },
  // Klantactiviteit — amber, and identical on both tenants on purpose. This is
  // an internal attention list, not a document a customer ever sees, and amber
  // is what "look at this" already means everywhere else in the app. It must not
  // read as money (green/blue) or as a failure (red).
  customerActivity: {
    primary: '#b45309',
    dark: '#78350f',
    tint: '#fef3c7',
    tintSoft: '#fffbeb',
  },
}

/**
 * Gurbet Doner. Brand blue #0a62b4 — the logo, and the hue the dashboard's
 * remapped ramp already uses.
 *
 * The invoice takes the brand blue and the rest of the family moves out of its
 * way. The governing rule: **a proforma is not payable and must never read as
 * the invoice.** Melek's proforma blue (#3b82f6) sat right on top of the new
 * brand, so it moved to burnt amber — 183° away, the furthest any hue can get —
 * and the order confirmation moved off cyan (only 16° from the brand) for the
 * same reason. The credit note shifts 10° further from blue.
 *
 * The one deliberate limit: six saturated mid-tones cannot all be told apart in
 * pure greyscale, because holding every table-header band at ≥7:1 against white
 * compresses them into L* 26–38. The system is therefore "darkest navy band =
 * money is due" — the invoice sits ≥6.9 L* from every other customer document,
 * and the three that cluster (proforma, order confirmation, credit note) are all
 * non-payable and 90°+ apart in hue.
 */
const FATHER: DocBrandSet = {
  invoice: {
    primary: '#0a62b4',
    dark: '#07406f', // 10.65:1 on white — the heaviest band in the family
    accent: '#2b82d4',
    tint: '#dbeafe',
    tintSoft: '#eff6ff',
  },
  proforma: {
    primary: '#b45309', // 183° from the invoice, and 11 L* lighter in greyscale
    dark: '#92400e',
    deep: '#92400e',
    accent: '#b45309',
    tint: '#ffedd5', // NOT #fef3c7 — that would blend into the amber verlegd notice
    tintSoft: '#fff7ed',
  },
  creditNote: {
    primary: '#9333ea',
    dark: '#7e22ce',
    deep: '#6b21a8',
    accent: '#6b21a8',
    tint: '#f3e8ff',
    tintSoft: '#faf5ff',
  },
  orderConfirmation: {
    // Teal, not green: this template's thank-you banner IS green (#10b981), and a
    // green primary would swallow it.
    primary: '#0f766e',
    dark: '#115e59',
    deep: '#134e4a',
    tint: '#ccfbf1',
    tintSoft: '#f0fdfa',
  },
  paymentReminder: {
    // Unchanged. Red is the only correct hue for a dunning letter.
    primary: '#dc2626',
    dark: '#991b1b',
    accent: '#fca5a5',
    tint: '#fecaca',
    tintSoft: '#fef2f2',
  },
  paymentOverview: {
    // Same indigo as Melek — see the note on the MELEK entry. It has to stay clear
    // of the brand blue here too, which the invoice owns.
    primary: '#4338ca',
    dark: '#312e81',
    accent: '#6366f1',
    tint: '#e0e7ff',
    tintSoft: '#eef2ff',
  },
  packingSlip: {
    // Unchanged neutral — a warehouse pick list, not a branding surface. Only the
    // customer rule moves: it was #3b82f6, which lands 8° off the new brand and
    // would read as almost-but-not-quite the brand. Made exact instead.
    primary: '#1e293b',
    dark: '#1e293b',
    accent: '#0a62b4',
  },
  soldProducts: {
    primary: '#0a62b4',
    dark: '#07406f',
    // Melek's blue refill badge would collide with the brand here.
    badgeTint: '#f3e8ff',
    badgeText: '#7e22ce',
  },
  dataExport: {
    primary: '#0a62b4',
    dark: '#07406f',
  },
  deliveryRoute: {
    // Keeps cyan: now uniquely cyan (order confirmation vacated it), and it is an
    // internal driver sheet that never sits in a customer's stack of paperwork.
    primary: '#0891b2',
    dark: '#0e7490',
  },
  // Same amber as Melek: an internal attention list, never customer-facing, so
  // it carries no brand and needs none.
  customerActivity: {
    primary: '#b45309',
    dark: '#78350f',
    tint: '#fef3c7',
    tintSoft: '#fffbeb',
  },
}

export const docBrand: DocBrandSet = tenantId === 'father' ? FATHER : MELEK
