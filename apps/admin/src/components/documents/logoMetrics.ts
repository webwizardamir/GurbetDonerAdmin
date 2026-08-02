import { tenantId } from '../../config/tenantId'

/**
 * How the company logo is sized in the PDF header, per tenant.
 *
 * WHY THIS FILE EXISTS: the header logo used to be a fixed `width: 80` box with
 * `maxHeight: 36` and `objectFit: 'contain'`. That is a WIDE slot, and it only
 * ever fitted a wide logo. Melek's (500x232, aspect 2.16) fills it; Gurbet's
 * (720x682, effectively SQUARE) could only scale to 38 x 36 inside it and was
 * then centred, leaving ~21pt of white on EACH side of the mark — verified from
 * the rendered PDF content stream: `38.005865 0 0 -36 20.997067 36 cm`. On every
 * document, that read as a small logo floating in a gap before the company name.
 *
 * THE FIX IS SHAPE-AGNOSTIC, not a per-logo nudge: size the image by HEIGHT and
 * let @react-pdf derive the width from the image's own aspect ratio. Verified
 * behaviour (see the table below) — with a height and no width, the drawn box is
 * exactly the image's aspect, so there is no dead space for ANY logo shape, and
 * the owner can re-upload a differently proportioned logo without a code change.
 *
 *                       old (width 80 / maxHeight 36)   new (height-driven)
 *   Melek  500x232      77.6 x 36 @ x1.2                77.6 x 36 @ x0
 *   Gurbet 720x682      38.0 x 36 @ x21.0               46.5 x 44 @ x0
 *
 * Melek's logo therefore renders at the SAME size it always has; it only loses
 * the 1.2pt of centring padding it never needed (the whole header block shifts
 * 2.4pt left — below the threshold of noticing, and no line count changes).
 *
 * `height` is the one tenant-dependent value. Gurbet's square mark is taller
 * than Melek's wide one on purpose: matched at 36pt it is visually tiny next to
 * the company block, and 44pt is the tallest it can be while staying INSIDE the
 * height of the 4-line company address block beside it — so the header does not
 * grow and the "15-16 line items per page" spec in CLAUDE.md still holds.
 *
 * `maxWidth` is a safety valve, not a layout value: nothing today comes near it.
 * It stops a future ultra-wide upload (a wordmark, say) from pushing the company
 * name off the header. `objectFit: 'contain'` is what makes that clamp letterbox
 * instead of STRETCH — dropping it distorts a clamped logo (verified: 60 x 46
 * instead of 60 x 27.8). Do not remove it.
 */

export interface DocLogoMetrics {
  height: number
  maxWidth: number
  objectFit: 'contain'
  marginRight: number
}

const MELEK: DocLogoMetrics = {
  height: 36,
  maxWidth: 120,
  objectFit: 'contain',
  marginRight: 10,
}

const FATHER: DocLogoMetrics = {
  ...MELEK,
  height: 44,
}

export const docLogo: DocLogoMetrics = tenantId === 'father' ? FATHER : MELEK
