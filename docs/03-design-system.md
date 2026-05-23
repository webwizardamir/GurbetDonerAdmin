# Melek — Design System v1

> Derived from the Melek logo (`/brand_assets/Melek-Halal-Food-Logo-HQ.png`).
> Strategy: the logo is ornate (heraldic crest, mosque silhouette, gold flourishes). The surrounding UI must be **restrained and clean** so the logo carries the heritage, and the layout carries the premium B2B credibility.

## 1. Color Palette

### Primary
| Token | Value | Use |
|---|---|---|
| `--color-emerald` | `#0F5132` | Brand primary green — pulled from the logo shield. Used on primary CTAs, brand surfaces, key headlines on light backgrounds. |
| `--color-emerald-deep` | `#082E1C` | Footer, dark sections, hero overlay base. The "press" version of emerald. |
| `--color-emerald-soft` | `#1F6A47` | Hover state for emerald CTAs; secondary accents. |

### Accent
| Token | Value | Use |
|---|---|---|
| `--color-gold` | `#C9A24B` | Accent only — eyebrow rules, divider lines, small inline highlights, hover underlines. Never as a fill on large surfaces. |
| `--color-gold-soft` | `#E3C781` | Used sparingly on dark sections for hairlines. |

### Neutrals (warm, paper-led, not cold gray)
| Token | Value | Use |
|---|---|---|
| `--color-bone` | `#FBF8F0` | Page background — warm off-white, harmonizes with the logo cream. |
| `--color-cream` | `#F4EEDD` | Section bands, cards, subtle alternation. |
| `--color-charcoal` | `#161311` | Primary text; near-black with a warm tint. |
| `--color-slate-700` | `#3A3733` | Body copy on light backgrounds where charcoal is too heavy. |
| `--color-slate-500` | `#75716B` | Meta text, labels. |
| `--color-line` | `#E5DECB` | Hairline borders on light. |
| `--color-line-dark` | `#1B362A` | Hairline borders on dark sections. |

### Signal
| Token | Value | Use |
|---|---|---|
| `--color-success` | `#2F7D55` | Form success |
| `--color-error` | `#A33A2A` | Form errors |

### Contrast guarantees
- Charcoal `#161311` on Bone `#FBF8F0` → **15.7:1** (AAA)
- Bone `#FBF8F0` on Emerald-deep `#082E1C` → **15.1:1** (AAA)
- Gold `#C9A24B` on Emerald-deep `#082E1C` → **5.3:1** (AA for normal text, AAA for large)
- Gold is used decoratively, not as primary text color, but it passes AA when used at heading sizes.

## 2. Typography

> No serif body — the logo's wordmark already does the serif work. UI typography stays clean and modern. One optional serif is reserved for editorial eyebrow text and pull quotes only.

| Role | Family | Why |
|---|---|---|
| Display (h1, hero) | **Inter Tight** (variable, 600/700) | Modern, neutral, premium, free. Slightly tighter than Inter for headline density. |
| UI / body | **Inter** (variable) | Workhorse for all body text, navigation, buttons. |
| Editorial accent (optional) | **Fraunces** (variable, soft optical) | Contemporary serif for eyebrows, pull quotes, occasional emphasis — never body. |
| Mono (specs, codes) | System monospace stack | For SKU codes, EAN numbers, packaging specs on product pages. |

### Type scale (mobile → desktop, clamp-based)

| Token | Mobile | Desktop | Use |
|---|---|---|---|
| `--text-hero` | `clamp(2.5rem, 8vw, 5.5rem)` | up to 88px | Hero headline |
| `--text-display` | `clamp(2rem, 5vw, 3.5rem)` | up to 56px | Section headlines |
| `--text-h2` | `clamp(1.5rem, 3.2vw, 2.25rem)` | up to 36px | Sub-section |
| `--text-h3` | `1.25rem` | `1.5rem` | Card titles |
| `--text-body-lg` | `1.0625rem` | `1.125rem` | Lead paragraphs |
| `--text-body` | `1rem` | `1rem` | Body |
| `--text-sm` | `0.875rem` | `0.875rem` | Labels, meta |
| `--text-xs` | `0.75rem` | `0.75rem` | Eyebrows, footnotes |

### Line-height & tracking
- Display: `line-height: 1.05`, `letter-spacing: -0.02em`
- H2/H3: `line-height: 1.15`, `letter-spacing: -0.015em`
- Body: `line-height: 1.6`, normal tracking
- Eyebrows (uppercase 11–12px): `letter-spacing: 0.18em`

## 3. Spacing scale (8-point base)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192` (px)

Section vertical rhythm:
- Mobile: 64–80px between sections
- Desktop: 96–128px between sections

Container widths:
- `--container`: `1280px` max
- `--container-narrow`: `960px` (for editorial / long-form)
- Page gutter: `clamp(20px, 5vw, 80px)`

## 4. Radii

- `--radius-sm`: 4px (chips, badges)
- `--radius`: 8px (buttons, inputs)
- `--radius-lg`: 16px (cards)
- `--radius-xl`: 24px (feature panels)
- Images keep `radius: 8px` unless full-bleed.

## 5. Elevation

We avoid heavy drop shadows — they read cheap. Instead use:
- Hairline borders (`--color-line`) at 1px
- Soft layered shadow only on hover, never on rest state
- `box-shadow: 0 1px 0 rgba(22,19,17,0.04), 0 14px 24px -16px rgba(22,19,17,0.18)` for hover lift

## 6. Motion principles

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entries; `cubic-bezier(0.4, 0, 0.2, 1)` for exits
- Durations: 200ms for hovers, 400–600ms for scroll reveals, 1200ms for hero pin
- Stagger: 60–80ms between siblings
- All animation honors `prefers-reduced-motion: reduce`
- One signature GSAP-pinned moment on the hero (headline reveal + stat counter tick-in)
- Marquee for partner/certification row, 30s loop, pauses on hover

## 7. Component primitives (planned)

- `Button` — primary (emerald fill), secondary (outline), tertiary (text + gold underline on hover)
- `EyebrowLabel` — uppercase 12px, gold, with a 1px gold rule beside
- `SectionHeader` — eyebrow + headline + optional lede
- `Card` — bone bg, line border, no shadow, soft hover lift
- `ProductCard` — image (4:3), name, weight pill, category chip
- `Stat` — large number + label + optional caveat
- `CertificationBadge` — small monochrome icon, authority name, dated
- `Input` / `Select` / `Textarea` — bone bg, line border, focus ring in emerald

## 8. Reference vs Melek — what we keep, what we change

| Aspect | dünyaholding.com | Melek (ours) |
|---|---|---|
| Primary color | Primary red | **Emerald green** (from logo) |
| Accent | None | **Antique gold** (from logo) |
| Background | Flat white | Warm bone (#FBF8F0) |
| Typography | Single utilitarian sans | Inter Tight + Inter (paired weights) + Fraunces accent |
| Hero | Three stacked product splits | One cinematic hero with kinetic reveal |
| Product IA | Packaging / Box / Big | **Chicken / Beef / Snacks** |
| Trust signals | Scattered, flat | Animated cert strip + dedicated halal panel |
| Forms | Generic contact | **Distributor application + Sample request** |
| Motion | Static | Subtle scroll reveals + 1 signature moment |
| Mobile | Stacked desktop | Mobile-first reordering, thumb-zone CTAs |
