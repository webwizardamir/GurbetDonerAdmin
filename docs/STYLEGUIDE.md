# Melek — Style Guide

The single design reference for this codebase. Anything visual that ships should trace to a token or primitive here. If a screen needs a value that is not in this guide, add it here first, then implement.

**This is the v8 cinematic dark system, and it is canonical for the whole site.** The homepage was rebuilt into it; the products, product-detail, about and form pages are being migrated into it next. Apply every rule below to new work. Where a legacy (bone/cream + Fraunces + wave-divider) section still exists, it is queued for rebuild, not a pattern to copy.

Source of truth for tokens: `src/styles/tokens.css`. CSS primitives live in `src/styles/global.css` (+ per-component scoped styles). Hero styles in `src/styles/hero.css`.

---

## 1. Brand position

- **Brand**: Melek, a standalone halal frozen-food manufacturer. NL-based, ships across Europe, B2B-led.
- **Feeling**: editorial, cinematic, crafted, European, industrial confidence. A premium food house and an export operation, not a SaaS startup.
- **Voice**: documentary and operational. Specific, grounded, sensory, sharp. Procurement-team confidence, not lifestyle copy.
- **Reference for level**: dunyaholding.com family, executed far higher (Awwwards-grade). The site must not read AI-generated.

---

## 2. Colour

All colours are CSS variables in `tokens.css` (`@theme` block). Use the variable, never a hex inline. The system is **dark-dominant**: dark canvas, warm ink, metal accents.

### Dark canvas + ink
| Token | Hex | Use |
|---|---|---|
| `--color-emerald-black` | `#051a10` | Primary page canvas (`body.has-dark-hero`), most scenes, footer. |
| `--color-char-900` | `#0c0a09` | Darkest scenes (proof strip, export CTA) for tonal variation. |
| `--color-emerald-deep` | `#082e1c` | Mid-dark scenes (halal). |
| `--color-paper` | `#f1efe8` | De-beiged warm off-white. Pale relief: document/record cards on dark, the rare light scene. Use sparingly. |
| `--color-bone` | `#fbf8f0` | Legacy light pages only. Avoid on new dark scenes. |
| `--color-charcoal` | `#161311` | Ink on paper/bone surfaces. |
| `--color-slate-700 / -500` | `#3a3733` / `#75716b` | Body / meta ink on light surfaces. |

### Accents (metal, used with restraint)
| Token | Hex | Use |
|---|---|---|
| `--color-brass` | `#a9863f` | The primary accent on dark: eyebrows, ticks, arrows, hover, scroll bead, spotlight. Oxidised, not shiny gold. |
| `--color-brass-deep` | `#7c5f28` | Darker brass. |
| `--color-silver` / `--color-silver-dim` | `#c7cfca` / `#8c958f` | Cool metadata/label ink on dark (freezer silver). |
| `--color-spice` | `#b1492a` | Warm red. Rare appetite/stamp accent only (e.g. the "Verified" passport stamp). |
| `--color-olive` | `#6f6c3c` | Tertiary, reserved. |
| `--color-emerald` / `--color-emerald-soft` | `#0f5132` / `#1f6a47` | Primary CTA fill + hover. Accent on paper scenes. |
| `--color-gold` / `--color-gold-soft` | `#c9a24b` / `#e3c781` | Legacy accents; on rebuilt scenes prefer brass. |

### Scene theming
Every section is a **scene** that paints itself from `data-scene`. Do not rely on the bone `.section` default.
- Markup: `<section class="scene xyz" data-scene="black|char|deep|paper">`.
- `data-scene` sets `--scene-bg`, `--scene-ink`, `--scene-ink-dim`, `--scene-line`, `--scene-accent`; `.scene` paints `background`/`color` from them and hosts a `.grain` overlay.
- In scene CSS, use `var(--scene-ink)`, `var(--scene-line)`, `var(--scene-accent)`, plus helpers `.ink-dim` and `.text-accent`, so a scene re-themes by changing one attribute.
- Tonal rhythm across the homepage: `black → char → black → deep → char → black → emerald-black footer`. Vary it; never run the same tone for three scenes straight without intent.

### Contrast
Paper on emerald-black ≈ 14:1. Brass on emerald-black ≈ 5.3:1 (AA text / AAA large) — keep brass for accents and large/short text, not long body. Silver-dim is for short metadata labels only.

---

## 3. Typography

> **Two faces. Bodoni Moda + Archivo.** (v8 replaced Fraunces + Inter, which the owner flagged as a recognisable AI-template tell.) Never add a third face. Loaded via one Google Fonts request in `Base.astro`. *(TODO: self-host both to drop the CDN dependency and FOUT.)*

| Role | Family | Notes |
|---|---|---|
| Headlines, scene titles, editorial moments | **Bodoni Moda** (`--font-display`) | High-contrast didone. Axes `opsz 6..96`, `wght 500..900`. Drama comes from stroke contrast + scale, not negative tracking. Keep `letter-spacing` near 0. |
| Body, UI, nav, buttons, operational labels | **Archivo** (`--font-sans`) | Industrial grotesk. Has a `wdth` axis. |
| Brutalist display caps (range names, big metadata) | **Archivo Expanded** (`--font-grotesk-x` + `.font-x`, `font-stretch: 125%`) | Same family, widened. For loud uppercase moments. |
| Mono | system stack (`--font-mono`) | Rare SKU/code strings only; no webfont. |

### Type scale (fluid, in `tokens.css`; helpers in `global.css`)
| Class | Var | Use |
|---|---|---|
| `.text-mega` | `--text-mega` `clamp(2.85rem, 9vw, 8.5rem)` | Film-title moments (hero, climactic CTA). Bodoni 700. |
| `.text-hero` | `--text-hero` | Large page headlines. |
| `.text-display` | `--text-display` | Scene headlines. |
| `.text-h2` / `.text-h3` | — | Sub-headings. |
| `.text-body-lg` | `--text-body-lg` | Ledes. |

Vary headline scale **between** scenes (the old failure was six identical `.text-display` H2s). A scene head can be `.text-mega`, a serif `.text-display`, or `.font-x` expanded caps, but not the same recipe every time.

### Operational labels + numbers
- `.op-label` / `.op-label--sm`: tiny uppercase Archivo with wide tracking and tabular figures. The "spec sheet" voice (eyebrows, metadata, captions). On dark, colour with `.ink-dim` (silver) or `.text-accent` (brass).
- `.scene-index`: exists in CSS but is **unused and must stay unused. Do NOT number scenes** (`01/02/03` over titles read AI-ish — owner feedback).

### Grain
`.grain` / `.grain--strong` / `.grain--dark`: reusable SVG-noise overlay (absolute, `pointer-events:none`). Drop one inside any `position:relative` dark scene for tactile texture. This (not gradients) is how dark scenes get visual interest.

---

## 4. Layout, scenes & the anti-AI rules

8-point spacing. `--gutter`, `--section-y`, `--section-y-sm`, `--container-width` 1280px, `--container-narrow` 960px, `--header-h` 76/64px. Containers: `.container-x`, `.container-narrow`.

Hard composition rules (these are what keep it from reading AI-generated):
- **No two scenes share a skeleton.** The retired molecule was `eyebrow → display headline → 6fr/5fr split → numbered equal-card grid`. Each scene gets a distinct structure: full-bleed data band, sticky scroll-story, horizontal lookbook rail, statement + definition list, etc.
- **Watch empty space.** Dark scenes must not leave large dead black areas. A narrow text column against a blank half is a tell. Fill the width with two-column splits (`.grid-ed--7-5` etc.), ledes, or balanced grids. Compression and expansion are deliberate, not accidental gaps.
- **Uniform within a set.** Cards/tiles in one rail or grid are the **same size**. Titles sit on **one line** and truncate with an ellipsis if longer (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`). Do not vary tile sizes "for scatter".
- **No machine metadata.** No "13 SKU", batch numbers, or coordinate stamps surfaced to buyers. The catalogue grows; counts are meaningless and read AI-ish.
- Asymmetry helpers: `.grid-ed` + `.grid-ed--7-5 / --5-7 / --4-8 / --8-4` (collapse to one column under 880px). Hairlines: `.scene-rule` / `.scene-rule--accent`.

### Scene transitions
Deliberate **dark cuts**, not wave dividers. Adjacent dark scenes simply abut (a hairline + breathing space if a seam is wanted). Wave dividers are **retired** for new scenes and survive only on not-yet-rebuilt legacy sections.

---

## 5. Motion

GSAP + ScrollTrigger, plus Lenis smooth scroll. Helpers in `src/lib/motion.ts`; run them from a per-component inline `<script type="module">` (static, no React island). **Every effect has a `prefers-reduced-motion` path and content is fully visible without JS.**

| Helper | Use |
|---|---|
| `initGsap()` | Registers ScrollTrigger once; returns `{ gsap, ScrollTrigger }`. |
| `prefersReducedMotion()` | SSR-safe guard. |
| `revealOnScroll(els, opts)` | Staggered editorial rise on enter (replaces the uniform `.reveal` IO fade for new scenes). Mark targets with `data-reveal`. |
| `splitLinesReveal` / hero timeline | Masked line slide-up for headlines. |
| `magnetize(el)` | Cursor-follow on CTAs; no-ops on touch / reduced motion. |
| `initSmoothScroll()` | Lenis inertia, GSAP-ticker driven, animates in-page anchors. Called once on the homepage; reduced-motion gated. |

Easing: `--ease-out-expo` for entries, `--ease-in-out` for state. Durations 200ms hover, 350–400ms header, 600–1100ms reveals. Motion supports storytelling; never decorate.

---

## 6. Components & surfaces

- **Buttons** (`global.css`): `.btn-primary` (emerald fill, bone text), `.btn-secondary` (charcoal outline — light pages), `.btn-secondary-light` (bone outline 40% — dark scenes), `.btn-ghost`. Focus-visible: 2px gold outline, 3px offset.
- **Header** (`Header.astro`): `position: fixed`. On `body.has-dark-hero` pages it is transparent over the hero and **dark (emerald-black, translucent) when scrolled** with light contents — never bone. Legacy light pages keep the bone scrolled state.
- **Footer** (`Footer.astro`): emerald-black, brutalist masthead (closing statement + operational strip of verifiable facts) over the link grid. Its wave divider is hidden on `body.has-dark-hero` (clean dark continuation) and only shows on bone pages.
- **Mobile menu** (`MobileMenu.astro`): full-screen flat emerald-black + grain, Bodoni nav labels with brass arrows, **no numbered list**, brass/silver accents. Lives in `Base.astro` outside the header's backdrop-filter.
- **Product tiles**: dark tile (`--color-char-900`) with a brass radial "studio spotlight" behind the packshot, `object-fit: contain`, cinematic hover zoom (`scale(1.07)`). Uniform size; one-line names.
- **Document/record cards** (certs): pale `--color-paper` cards on the dark archive, `REF · / ON FILE` header, a ghosted spice "Verified" stamp. Trust as artifact, not badge grid.
- **Surfaces**: avoid heavy drop shadows. Hairline borders (`--scene-line`) at rest; restrained hover lifts. Texture from grain.
- Radius: `--radius-sm 4 / --radius 8 / --radius-lg 16 / --radius-xl 24`.

### Legacy component props (until rebuilt)
`HalalPromise.astro` takes `topBg` and `dividers`; `DistributorCTA.astro` takes `dividers`. The homepage swaps these for bespoke scenes (`HalalConfidence`, `ExportCTA`, `TrustArtifacts`); the shared originals still serve About/products with their bone/wave defaults until those pages are migrated.

---

## 7. Writing

- **No em-dashes (—).** Commas, full stops, or restructure.
- **No fabricated trust signals.** Only verifiable: 46+ SKU (don't surface the count), three ranges, Halal / BRC / IFS by name, "made in the Netherlands", "Amsterdam" (owner-confirmed). HACCP + ISO 22000 stay text seals (no badge, no "verified" claim) until confirmed. No "100% traceability".
- **No machine metadata** surfaced to buyers (SKU counts, batch refs).
- **Banned AI copy**: "premium quality", "trusted partner", "tailored", "industry-leading", "curated assortment", "we believe / we strive", scare-quotes.
- Write like documentary narration / an industrial manifesto: short, specific, sensory, operational. Example tone: "Every batch leaves the floor with a signed release, freezer-stable coating, and full traceability attached."
- Tagline (kept, owner-approved): "Halal, perfected. Crafted in Europe."

---

## 8. Asset paths

| Asset | Path | Notes |
|---|---|---|
| Fonts | Google Fonts CDN (Bodoni Moda + Archivo) in `Base.astro` | One `<link>`. TODO: self-host. |
| Logo | `/public/logo.png` (734×340, 2.16:1); `/public/logo-light.png` | Declare `<img>` dims ratio-preserving. |
| Product packshots | `/public/images/products/{slug}.{png,jpg}` | 46 SKUs; white-bg, sit on dark spotlight tiles. |
| Hero video | `/public/videos/hero.mp4` | dünya aerial placeholder, owner-replaceable. |
| Facility stills | `/public/images/facility/*` | dünya placeholders; pull onto palette with a dark duotone filter. |
| Cert badges | `/public/images/certifications/{halal,brc,ifs}.png` | HACCP / ISO are text seals. |

---

## 9. Migrating a page into this system (products / detail / about / forms)

1. Theme the page dark: give it `body` dark context (or wrap content in dark `.scene`s); stop using bone `.section`.
2. Rebuild each block as a distinct `.scene data-scene=...` with its own skeleton — no repeated molecule, no numbered headers.
3. Swap Fraunces/Inter usage to the helpers (they already resolve to Bodoni/Archivo via tokens), set eyebrows as `.op-label`, range/loud headers as `.font-x`.
4. Replace card grids with editorial compositions; uniform tiles, one-line ellipsis titles, brass spotlight on packshots.
5. Forms need a **dark variant** (inputs on dark with `--scene-line` borders, paper-on-dark or emerald focus ring) — add tokens/classes here when building the first dark form.
6. Drop wave dividers; use dark cuts. Reuse `revealOnScroll` for entrances. Keep the reduced-motion path.
7. Copy: documentary voice, verifiable only, no SKU counts, no banned phrases.
