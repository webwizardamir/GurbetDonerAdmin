# Melek — Style Guide

The single design reference for this codebase. Anything visual that lands in production should be traceable to a token here. If a screen needs a value that is not in this guide, add it here first, then implement.

Source of truth for tokens: `src/styles/tokens.css`. CSS-side primitives live in `src/styles/global.css` and `src/styles/hero.css`.

---

## 1. Brand position

- **Brand**: Melek — standalone halal frozen food brand.
- **Voice**: confident, factual, B2B-led. Sentences over slogans.
- **Audience**: distributors, retailers, HoReCa procurement.
- **Tone**: same family as dunyaholding.com but executed at a higher level. Cleaner spacing, real typographic discipline, named certifications, no factory-default red.

---

## 2. Colour

All colours are exposed as CSS variables in `tokens.css`. Use the variable, never the hex inline.

### Brand
| Token | Hex | Use |
|---|---|---|
| `--color-emerald` | `#0F5132` | Primary brand surfaces: primary CTAs, key headlines on light, eyebrow text on light bg, focus ring. |
| `--color-emerald-deep` | `#082E1C` | Hero background, all dark sections, footer background. **Always flat** — see §6. |
| `--color-emerald-soft` | `#1F6A47` | Hover state for emerald CTAs, secondary green tone. |
| `--color-gold` | `#C9A24B` | Decorative accents only: marquee separators, eyebrow text on dark, hover underlines. Never as a fill on large surfaces. |
| `--color-gold-soft` | `#E3C781` | Eyebrow / numeric / accent text on dark sections. |

### Neutrals (warm)
| Token | Hex | Use |
|---|---|---|
| `--color-bone` | `#FBF8F0` | Page background, header opaque state, default card surface. |
| `--color-cream` | `#F4EEDD` | Section alternation band (`FeaturedProducts`), divider backgrounds adjacent to cream sections. |
| `--color-cream-deep` | `#EDE4CD` | Reserved for future depth on cream surfaces. |
| `--color-charcoal` | `#161311` | Primary text on light, hamburger bars when scrolled, button outlines. |
| `--color-slate-700` | `#3A3733` | Body copy on light. |
| `--color-slate-500` | `#75716B` | Meta text, labels. |
| `--color-line` | `#E5DECB` | Hairline borders on light. |
| `--color-line-dark` | `#1B362A` | Hairlines on dark. |

### Signal
| Token | Hex | Use |
|---|---|---|
| `--color-success` | `#2F7D55` | Form success state. |
| `--color-error` | `#A33A2A` | Form errors. |

### Contrast guarantees
Charcoal on Bone → 15.7:1 (AAA). Bone on Emerald-deep → 15.1:1 (AAA). Gold on Emerald-deep → 5.3:1 (AA normal text, AAA large). Gold is **decorative only** at small sizes.

---

## 3. Typography

> **Two fonts. Period.** No third decorative face, no italic-serif accents inside heading sans (that pattern was removed in v2 — it read AI-generated). The discipline is: serif headings, sans body.

| Role | Family | Weights | Notes |
|---|---|---|---|
| Headings (h1–h3, eyebrows-as-display, marquee labels) | **Fraunces** | 400–600 variable | Variable axis: `opsz 9..144`, `SOFT 0..100`. Use `font-variation-settings: "opsz" 144, "SOFT" 50` for the hero; reduce opsz/SOFT as size shrinks. |
| Body, UI, navigation, buttons, eyebrows-uppercase | **Inter** | 400, 500, 600, 700 | The workhorse. |
| Mono (rare: SKU codes) | System mono stack | — | `ui-monospace, SFMono-Regular, ...` |

Both faces are loaded once in `src/layouts/Base.astro` via a single Google Fonts CSS request. Never add a third face without removing one.

### Type scale (fluid)
Defined in `tokens.css` as `:root` CSS vars. Helper classes in `global.css`.

| Class | Var | Mobile | Desktop max |
|---|---|---|---|
| `.text-hero` | `--text-hero` | `2.5rem` | `5rem` |
| `.text-display` | `--text-display` | `1.875rem` | `3rem` |
| `.text-h2` | `--text-h2` | `1.5rem` | `2.125rem` |
| `.text-h3` | `--text-h3` | `1.375rem` | `1.375rem` |
| `.text-body-lg` | `--text-body-lg` | `1.0625rem` | `1.0625rem` |
| body default | — | `1rem` | `1rem` |
| eyebrow / footnote | — | `0.75rem` | `0.75rem` |

### Line-height & tracking
- Hero: `line-height: 1.02`, `letter-spacing: -0.03em`
- Display: `line-height: 1.08`, `letter-spacing: -0.02em`
- H2 / H3: `line-height: 1.12–1.20`, `letter-spacing: -0.015em → -0.01em`
- Body: `line-height: 1.6`
- Eyebrow (uppercase 12px): `letter-spacing: 0.22em`

### Eyebrow component
Class `.eyebrow`. Plain uppercase gold/emerald text — **no leading horizontal rule**. Variants:
- `.eyebrow` → emerald (default, on light bg)
- `.eyebrow.eyebrow--gold` → gold
- `.eyebrow.eyebrow--bone` → gold-soft (for dark bg sections like Halal Promise, Distributor CTA, Mobile Menu)

---

## 4. Spacing & layout

8-point base. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.

| Token | Value | Use |
|---|---|---|
| `--gutter` | `clamp(20px, 5vw, 72px)` | Horizontal page padding. Use `.container-x` / `.container-narrow`. |
| `--section-y` | `clamp(56px, 8vw, 104px)` | Default vertical section padding. |
| `--section-y-sm` | `clamp(40px, 6vw, 72px)` | Compact section padding. |
| `--container-width` | `1280px` | Standard content container. |
| `--container-narrow` | `960px` | Editorial / form pages. |
| `--header-h` | `76px` desktop, `64px` mobile (<720px) | Header height; `main` reserves this unless `body.has-dark-hero`. |

### Containers
- `.container-x` — max-width 1280px, gutter-padded.
- `.container-narrow` — max-width 960px, gutter-padded. For legal pages, long-form copy, single-form pages.

### Section rhythm
The homepage alternates bone → cream → emerald-deep → bone, so the eye gets a tonal break every section. Adjacent sections must not share a dark base (handled in v4 by inserting the bone `Certifications` between `DistributorCTA` and `Footer`). See `PLANNER.md` for current section order.

---

## 5. Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `4px` | Chips, badges. |
| `--radius` | `8px` | Buttons, inputs. |
| `--radius-lg` | `16px` | Cards, panels. |
| `--radius-xl` | `24px` | Feature panels (category cards), distributor CTA edges. |

Images keep `border-radius: 8px` unless intentionally full-bleed.

---

## 6. Surfaces & elevation

**Avoid heavy drop shadows.** Use:
- Hairline borders (`--color-line`, 1px) at rest.
- Soft layered shadow on hover only:
  ```css
  box-shadow:
    0 1px 0 rgba(22, 19, 17, 0.04),
    0 14px 24px -16px rgba(22, 19, 17, 0.18);
  ```

### Dark sections (`Halal`, `DistributorCTA`, `Footer`)
**Background must be flat `--color-emerald-deep`.** No radial gradients on dark sections — they bleed to edges and create visible seams against wave dividers (lesson from v3 → v4). Visual interest on dark sections comes from:
- The `hero__grain` / `halal__grain` SVG noise pattern (5–7% opacity, mix-blend overlay).
- Decorative SVG marks rendered inline (e.g., the crescent + star in `HalalPromise`).
- Numbered lists (`01`, `02`, `03`) in gold-soft.

---

## 7. Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entries (`--ease-out-expo`); `cubic-bezier(0.4, 0, 0.2, 1)` for exits (`--ease-in-out`).
- Durations: 200ms for hover, 350–400ms for header fades, 400–700ms for scroll reveals, 1200ms for any signature moment (currently none — hero is video-driven).
- Stagger: 50–80ms between siblings via `transition-delay: calc(var(--i) * 60ms)` pattern.
- Honour `prefers-reduced-motion: reduce` — all reveals collapse to opacity 1 / no transform; marquee + scroll-dot animations stop.

### Marquee
- 38–42s linear infinite, hover pauses, edge fade via `mask-image: linear-gradient(...)`.
- Track contains items duplicated 2× for a seamless `-50%` loop.

### Scroll reveals
- Components use `.reveal { opacity: 0; transform: translateY(20px) }` → IntersectionObserver adds `.is-visible` once per element.
- Forced visible in Playwright screenshot capture (`scripts/screenshot.mjs` injects `is-visible` so full-page captures don't show empty below-fold sections).

---

## 8. Buttons

Defined in `global.css` as `.btn` + variants.

| Variant | Use | Style |
|---|---|---|
| `.btn-primary` | Main CTA | Emerald fill, bone text. Hover lifts + soft shadow. |
| `.btn-secondary` | Secondary CTA on light | Transparent fill, charcoal outline, fills charcoal on hover. |
| `.btn-secondary-light` | Secondary CTA on dark | Transparent fill, bone outline at 40% alpha. Fills bone on hover. |
| `.btn-ghost` | Tertiary link-style | Underline grows on hover, gold accent. |

Buttons must have `focus-visible: outline 2px var(--color-gold) outline-offset: 3px` for keyboard a11y.

---

## 9. Cards

Default card via `.card` class: bone bg, line border, no shadow at rest, soft lift on hover. Product cards extend this with a media area + body. Category cards have an accent radial gradient + a product image silhouette in the corner.

---

## 10. Wave dividers

**The technique that took 3 iterations to get right.** Documented in detail in `ARCHITECTURE.md §wave-dividers`. Rules:
- Each wave divider is a `<div>` sibling to the section, containing an inline `<svg>`.
- The `<div>` must have `background: <matching-color>` of the section ABOVE it (otherwise the page-body bone shows through the empty SVG region, creating a white sliver).
- SVG path fills with the colour of the section BELOW it.
- `line-height: 0` on the wrapper kills inline-text rendering gaps.
- `margin: -1px` on the SVG itself prevents sub-pixel hairline gaps.
- Dark sections that meet a wave divider must use **flat** `--color-emerald-deep` (no radial gradients) — otherwise the gradient bleeds to the edge and the wave doesn't tone-match.

---

## 11. Forms

- Inputs / textareas / selects share `.input` / `.textarea` / `.select`.
- Bone background, line border, focus ring in emerald with 12%-alpha glow.
- Labels are `.label` — slate-700 8.125 px, weight 500, slight negative letter-spacing.
- Consent checkboxes inline with their description, 0.8125 rem.

---

## 12. Asset paths

| Asset | Path | Notes |
|---|---|---|
| Logo | `/public/logo.png` | Intrinsic 734 × 340 (aspect 2.16:1). When declaring `<img>` dimensions, use **324 × 150** or any ratio-preserving multiple. Footer logo uses `object-fit: contain; align-self: flex-start; height: 90px`. |
| Logo (favicon) | `/public/favicon.png` | Same source for now. |
| Product images | `/public/images/products/{slug}.{ext}` | 46 SKUs downloaded from the prior site. Real Melek packaging photos. |
| Hero video | `/public/videos/hero.mp4` | 7.14 MB MP4 (aerial production-facility footage). User-replaceable. |
| Hero poster fallback | `/public/images/hero/field.webp` | Shown for ~200ms before video first-frame decodes. |
| Cert badges | `/public/images/certifications/{halal,brc,ifs}.png` | Real badges. HACCP / ISO 22000 currently text-only (no licensed badge available). |
| Trust badges (old) | `/public/images/trust/*.png` | Generic D2C trust marks. Not currently wired. |

---

## 13. Writing style

- **No em-dashes (—).** Use commas, full stops, or restructure the sentence. (Burned twice.)
- **No double-quote scare-quoting** of brand words.
- **No "we believe" / "we strive"** corporate filler.
- Prefer concrete numbers, certifications by name, and short declarative sentences. The brand voice is procurement-team confidence, not lifestyle blog.
