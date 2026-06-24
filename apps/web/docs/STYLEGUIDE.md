# Melek — Style Guide

The single design reference for this codebase. Anything visual that ships should trace to a token or primitive here. If a screen needs a value that is not in this guide, add it here first, then implement.

**This is the v9 light-dominant system, canonical for the whole site.** The site began (v8) as a fully dark "cinematic" build; the owner found it too dark, so it was rebuilt **light-dominant** and then **rebranded to the reference site's palette + Simplicity Pro font**. **Every page is now migrated** (homepage, products, product-detail, about, forms are light; `/legal/*` is a light shell with placeholder copy). Dark is **punctuation** (the hero) and accent, not the canvas. Apply every rule below to new work. A few v8 components (`OperationalStrip`, `HalalConfidence`, `TrustArtifacts` on the homepage, `Marquee`, and the legacy bone `Categories`/`Certifications`/`Process`) are now unused — don't copy them.

Source of truth for tokens: `src/styles/tokens.css`. CSS primitives live in `src/styles/global.css` (+ per-component scoped styles). Hero styles in `src/styles/hero.css`.

---

## 1. Brand position

- **Brand**: Melek, a halal frozen-food brand. NL-based company, ships across Europe, B2B-led. **The food is NOT made in the Netherlands — never claim a production location.**
- **Feeling**: editorial, crafted, warm, European. Light and confident, not clinical and not heavy. The dark hero opens it like a film, then the page breathes in white.
- **Voice**: plain and friendly. Short, simple, everyday words. The brand is known locally, so it does not over-sell or insist on being good / certified — say what people need, then stop.
- **Reference for level**: dunyaholding.com family, executed far higher (Awwwards-grade). The site must not read AI-generated. The scroll should feel **varied and enjoyable**, never a stack of identical bands.

---

## 2. Colour

All colours are CSS variables in `tokens.css` (`@theme` block). Use the variable, never a hex inline. The system is **light-dominant** on the reference site's palette: a **warm cream** canvas (`--color-snow #FDFCF4`), **forest green** (`--color-emerald-deep / --color-emerald-black #00300C`) for headings + dark / header / hero, **medium green** (`--color-emerald #4f7f47`) for CTAs + links, and a **lime** accent (`--color-lime / --color-gold / --color-brass #A9DD72`) for the marquee, header underline and small pops. Sage panels. **`tokens.css` is the source of truth — some hex in the tables below may lag a rebrand, so trust the tokens.**

### Light canvas + ink (the default surface)
| Token | Hex | Use |
|---|---|---|
| `--color-snow` | `#FDFCF4` | **Primary light canvas.** Warm cream from the reference site. White/sage tiles, sage panels/footer, and the forest-green + lime accents sit on it. |
| `--color-panel` | `#e9efe9` | Soft emerald-tinted inset-panel fill (`.scene-panel`) and the homepage footer base. Reads as a crafted block on snow. |
| `--color-panel-deep` | `#e0e8e1` | Slightly deeper panel tint for an emphasis block (the climactic CTA), `.scene-panel--deep`. |
| `--color-line-soft` | `#e7e4dd` | Neutral hairline on snow (`--scene-line` on light scenes). |
| `--color-paper` | `#f1efe8` | De-beiged warm off-white. Ink colour on dark scenes (`--scene-ink`), pale relief on dark. |
| `--color-bone` | `#fbf8f0` | Button/ink-on-dark text, legacy light pages. |
| `--color-charcoal` | `#161311` | Primary ink on light surfaces (`--scene-ink` on light). |
| `--color-slate-700 / -500` | `#3a3733` / `#75716b` | Body / meta ink on light surfaces. `-500` for captions and `.op-label` dim. |

### Dark canvas (punctuation only)
| Token | Hex | Use |
|---|---|---|
| `--color-emerald-black` | `#051a10` | The dark **Hero** canvas and `body.has-dark-hero`. Reserved for the cinematic opener; no longer the page default. |
| `--color-char-900` | `#0c0a09` | Darkest tone, legacy dark scenes / dark tiles. |
| `--color-emerald-deep` | `#082e1c` | Mid-dark tone (legacy dark scenes, button hover ink). |

### Accents
| Token | Hex | Use |
|---|---|---|
| `--color-emerald` / `--color-emerald-soft` | `#0f5132` / `#1f6a47` | **The brand colour. Primary CTA fill + hover, and headings on light scenes (`--scene-title`), accents on light (`--scene-accent`), the decorative panel shapes.** This is the dominant accent now. |
| `--color-brass` | `#a9863f` | Accent on **dark** surfaces (hero ledger, scroll bead, spotlight) and the thin arc in the panel decoration. Oxidised, not shiny gold. |
| `--color-brass-deep` | `#7c5f28` | Darker brass; footer headings on light. |
| `--color-gold` / `--color-gold-soft` | `#c9a24b` / `#e3c781` | Header underline / focus ring; legacy dark accents. On light prefer emerald. |
| `--color-silver` / `--color-silver-dim` | `#c7cfca` / `#8c958f` | Cool metadata/label ink on **dark** only (freezer silver). |
| `--color-spice` | `#b1492a` | Warm red. Rare appetite accent only. |
| `--color-olive` | `#6f6c3c` | Tertiary, reserved. |

### Scene theming
Every section is a **scene** that paints itself from `data-scene`. Do not rely on the bone `.section` default.
- Markup: `<section class="scene xyz" data-scene="light|black|char|deep|paper">`.
- `data-scene` sets `--scene-bg`, `--scene-ink`, `--scene-ink-dim`, `--scene-line`, `--scene-accent`, and on `light` also `--scene-title` (emerald). `.scene` paints `background`/`color` from them and hosts a `.grain` overlay.
- **`data-scene="light"`** is the default scene now: snow bg with a soft emerald/brass **radial glow** plus a faint **diagonal weave** (`::before`), charcoal ink, emerald headings + accent, `--color-line-soft` hairlines. The weave uses `background-attachment: fixed` so its lines stay **continuous across section seams** (mobile browsers that drop `fixed` fall back to per-section, which is acceptable).
- Components that can appear on either tone take a `scene` prop (e.g. `scene="light"`); `index.astro` passes it. Default still resolves to a dark tone for not-yet-migrated usage.
- In scene CSS use `var(--scene-ink)`, `var(--scene-line)`, `var(--scene-accent)`, `var(--scene-title, var(--scene-ink))` for headings, plus helpers `.ink-dim` and `.text-accent`, so a scene re-themes by changing one attribute.
- **Homepage tonal rhythm (canonical):** `emerald-black Hero (dark) → light → light → light → light → light boxed CTA → light certs → panel-tinted footer`. Dark opens, light carries, the footer's tint closes. Keep the light stretch varied in **layout**, not tone.

### Contrast
Charcoal on snow ≈ 15:1. Emerald `#0f5132` on snow ≈ 7:1 (AA for all text) — safe for headings and links. Slate-500 is for short captions / dim labels, not long body. On dark scenes: paper on emerald-black ≈ 14:1; brass on emerald-black ≈ 5.3:1 (accents / large text only).

---

## 3. Typography

> **One face. Simplicity Pro (Semplicita Pro)**, self-hosted in `/public/fonts` (`@font-face` in `global.css`), for headings **and** body — the owner's pick, matching the reference site. (History: Fraunces+Inter → Bodoni → Clash → Manrope → Simplicity Pro.) Never add a second/third face.

| Role | Family | Notes |
|---|---|---|
| Headlines, scene titles, nav labels | **Simplicity Pro** (`--font-display`), weight 600–700 | Drama from scale + weight, **not** negative tracking; keep `letter-spacing` near 0. On light scenes headlines are **forest green** (`--scene-title` → `--color-emerald-deep #00300C`). |
| Body, UI, buttons, labels | **Simplicity Pro** (`--font-sans`), weight 400/500 | Same face. Weights available: 400 (woff/ttf), 400 italic, 500, bold 600–800. |
| Loud uppercase caps (range names, seals) | **Simplicity Pro** (`--font-grotesk-x` + `.font-x`) | No real width axis now; `.font-x` is just bold uppercase + tracking. |
| Mono | system stack (`--font-mono`) | Rare code strings only; no webfont. |

### Type scale (fluid, in `tokens.css`; helpers in `global.css`)
| Class | Var | Use |
|---|---|---|
| `.text-mega` | `--text-mega` `clamp(2.85rem, 9vw, 8.5rem)` | Film-title moments (hero, climactic CTA). Simplicity Pro 700/800. |
| `.text-hero` | `--text-hero` `clamp(2.5rem, 7vw, 5rem)` | Large page headlines. |
| `.text-display` | `--text-display` `clamp(1.875rem, 4.5vw, 3rem)` | Scene headlines. |
| `.text-h2` / `.text-h3` | — | Sub-headings. |
| `.text-body-lg` | `--text-body-lg` | Ledes. |

Vary headline scale **between** scenes (the old failure was six identical `.text-display` H2s). A scene head can be `.text-mega`, `.text-display`, or `.font-x` expanded caps, but not the same recipe every time.

### Operational labels
- `.op-label` / `.op-label--sm`: tiny uppercase Archivo with wide tracking and tabular figures. The "spec sheet" voice. Colour with `.ink-dim` (slate-500 on light / silver on dark) or `.text-accent` (emerald on light / brass on dark).
- **No eyebrow pre-headings (owner).** Do **not** put a small kicker label above a section/page heading (the "Operational proof", "Verification", "About Melek" pattern is retired site-wide). Headings stand on their own. `.op-label` is now only for genuinely functional micro-labels: breadcrumbs, product-tile meta, image/cert captions, contact-method labels, the hero scroll cue. When in doubt, leave it out.
- **No hero fact ledgers.** The Origin/Distribution/Certified/Range-style fact strips were removed from the heroes. Don't reintroduce labelled "at a glance" ledgers, and never surface SKU counts.
- `.scene-index`: exists in CSS but is **unused and must stay unused. Do NOT number scenes** (`01/02/03` over titles read AI-ish — owner feedback).

### Grain
`.grain` / `.grain--strong` / `.grain--dark`: reusable SVG-noise overlay (absolute, `pointer-events:none`). On **light** scenes use `.grain--dark` (multiply blend, ~0.05) for a faint tooth; on dark scenes use `.grain` / `--strong` (overlay blend).

---

## 4. Layout, scenes & the anti-AI rules

8-point spacing. `--gutter` `clamp(20px,5vw,72px)`, `--section-y`, `--section-y-sm`, `--container-width` 1280px, `--container-narrow` 960px, `--header-h` 76/64px. Containers: `.container-x`, `.container-narrow`. Per-scene `--scene-pad` lets rhythm compress/expand.

Hard composition rules (these are what keep it from reading AI-generated):
- **No two scenes share a skeleton.** The retired molecule was `eyebrow → display headline → 6fr/5fr split → numbered equal-card grid`. Each scene gets a distinct structure: full-bleed data band, sticky scroll-story, horizontal lookbook rail, statement + definition list, one-line cert-mark row, etc.
- **Watch empty space.** A narrow text column against a blank half is a tell. Fill the width with two-column splits (`.grid-ed--7-5` etc.), ledes, or balanced grids. Compression and expansion are deliberate, not accidental gaps.
- **Uniform within a set.** Cards/tiles in one rail or grid are the **same size**. Titles sit on **one line** and truncate with an ellipsis if longer. Do not vary tile sizes "for scatter".
- **No machine metadata.** No "13 SKU", batch numbers, or coordinate stamps surfaced to buyers.
- Asymmetry helpers: `.grid-ed` + `.grid-ed--7-5 / --5-7 / --4-8 / --8-4` (collapse to one column under 880px). Hairlines: `.scene-rule` / `.scene-rule--accent`.

### The boxed-panel motif (`.scene-panel`)
To keep the light scroll crafted rather than a stack of flat bands, a scene's content can sit in an **inset boxed panel**: the light body (snow + weave + glow) shows in the gutters around it, while the panel carries a soft emerald tint (`--color-panel`, or `--color-panel-deep` via `.scene-panel--deep`), padding, `--radius-xl` corners, a soft emerald-tinted lift shadow, and a **layered decorative shape** anchored top-right (two emerald blobs + a thin brass arc, drawn in `::before` behind the content). Drop content straight inside `.scene-panel`; children sit above the shape automatically. Reference: the dunya products block.
- **One box per page for variety.** The owner's rule: a single boxed scene punctuates the scroll; the rest stay full-bleed on snow. On the homepage that one box is the **ExportCTA**. Do not box every section.

### Scene transitions
The hero→first-light boundary is a deliberate **dark cut** (no wave divider). Between light scenes the snow body and continuous weave carry through; vary the section with layout and `--scene-pad`, not dividers. Wave dividers are **retired** for new scenes and survive only on not-yet-rebuilt legacy sections.

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

- **Buttons** (`global.css`): `.btn-primary` (emerald fill, bone text — works on light and dark), `.btn-secondary` (charcoal outline — **light** surfaces), `.btn-secondary-light` (bone outline 40% — **dark** scenes), `.btn-ghost`. Focus-visible: 2px gold outline, 3px offset. On light scenes and panels use `.btn-secondary`, not `-light`.
- **`.scene-panel` / `.scene-panel--deep`**: the boxed inset panel (see §4). Soft emerald tint, `--radius-xl`, decorative top shape, lift shadow. Use once per page.
- **Header** (`Header.astro`): `position: fixed`, `z-index: 50`, **greeny on every page**. On `body.has-dark-hero` (homepage) it is transparent over the hero, then on scroll becomes a **dark emerald-black translucent bar**. On `body.page-light` inner pages (no dark hero) it shows that same greeny emerald-black bar **at all scroll positions**. Both carry light (bone) contents; `logo.png` reads on the dark bar.
- **Footer** (`Footer.astro`): light on the new-system pages, gated `body:is(.has-dark-hero, .page-light)` — the `--color-panel` emerald tint with charcoal/slate ink, emerald hovers, brass-deep headings, so it reads as the page's distinct grounded base. The wave divider is hidden there. Legacy bone pages keep the default dark footer until migrated. `logo.png` is full-colour on transparency, legible on light and dark, no swap.
- **Mobile menu** (`MobileMenu.astro`): full-screen **light** overlay (`z-index: 70`, fully covers the header so it uses its own close button). Snow bg with the same emerald/brass radial glow as light scenes, `.grain--dark` tooth, **Simplicity Pro** nav labels in charcoal with emerald hover + emerald arrows, light hairlines, `.btn-secondary` for the secondary CTA. **No numbered list.** Lives in `Base.astro` outside the header's backdrop-filter.
- **Product tiles**: on **light** scenes, white tiles (`.worlds[data-scene="light"] .worlds__media`) with the packshot `object-fit: contain` and a soft lift; on dark scenes a `--color-char-900` tile with a brass radial "studio spotlight". Uniform size; one-line names. The upcoming products pages are light, so default to white tiles.
- **Certifications.** **Homepage:** `CertMarquee` — a green band of white **icon chips** (real Halal/BRC/IFS badge logos; a check icon for HACCP/ISO 22000) + labels (weight 500), scrolling in a seamless loop directly under the hero; replaces a standalone cert section. **About:** `TrustArtifacts` — a single hairline-separated row of the same marks. The old dark record-card pattern is retired.
- **Surfaces**: avoid heavy drop shadows. Hairline borders (`--scene-line`) at rest; restrained hover lifts. On light, cards/panels use soft **emerald-tinted** shadows (`rgba(15,81,50,…)`), not neutral grey. White cards lift off the panel tint. Texture from grain + the weave.
- Radius: `--radius-sm 4 / --radius 8 / --radius-lg 16 / --radius-xl 24`.

### Unused / legacy components
Several v8/legacy components are now **unused / not rendered**: `OperationalStrip`, `HalalConfidence`, `Marquee`, and the bone `HalalPromise` / `DistributorCTA` / `Categories` / `Certifications` / `Process`. The live section components are `Hero`, `CertMarquee`, `ProductionStory`, `ProductWorlds`, `ExportCTA`, `Footer`, plus `TrustArtifacts` on `/about/`. Don't reuse the unused ones; build fresh.

---

## 7. Writing

- **No em-dashes (—).** Commas, full stops, or restructure.
- **Plain and short.** Everyday words, few of them. The owner found the old copy too harsh / hard / AI-ish. If a line sounds like a brochure or a procurement deck, rewrite it the way you'd say it out loud.
- **Do not insist.** The brand is known locally; stop repeating that we're good, certified, trusted, or "defensible in a tender". State a fact once. Keep detail on the About page, keep the homepage light.
- **No production claim at all.** Melek **sells / supplies** the food, it doesn't make it. Don't write "made / produced / frozen in the Netherlands", name a production city, or imply manufacturing — use "sell / supply / offer". NL is the company base; "shipped across Europe" is fine.
- **No fabricated trust signals**, no SKU counts, no "100% traceability". Halal / BRC / IFS by name is fine; HACCP + ISO 22000 stay text seals.
- **Banned phrasing** — AI clichés ("premium quality", "trusted partner", "tailored", "curated", "we believe") plus the jargon the owner flagged: "tender", "auditable", "documentary", "retail-grade specification", "cold chain intact", "lot-level traceability", "the cabinet your buyer opens", "every shift".
- Tagline (kept, owner-approved): "Halal, perfected. Crafted in Europe."

---

## 8. Asset paths

| Asset | Path | Notes |
|---|---|---|
| Fonts | **Simplicity Pro** (Semplicita Pro), self-hosted woff2/woff/ttf in `/public/fonts`; `@font-face` in `global.css`, preloads in `Base.astro` | one face, headings + body |
| Logo | `/public/logo.png` (734×340, 2.16:1); `/public/logo-light.png` | Both are the full-colour emblem on transparency; legible on light and dark. Declare `<img>` dims ratio-preserving. |
| Product packshots | `/public/images/products/{slug}.{png,jpg}` | 46 SKUs; white-bg, sit on white (light) or spotlight (dark) tiles. |
| Hero video | `/public/videos/hero.mp4` | dünya aerial placeholder, owner-replaceable. |
| Facility stills | `/public/images/facility/*` | dünya placeholders; pull onto palette with a duotone filter. |
| Cert badges | `/public/images/certifications/{halal,brc,ifs}.png` | HACCP / ISO are text seals. |

---

## 9. Migrating a page into this system (products / detail / about / forms)

1. Theme the page **light**: build blocks as `.scene data-scene="light"` on the snow canvas (with the glow + continuous weave). Stop using bone `.section` and stop defaulting to dark — dark is the hero/punctuation only.
2. Rebuild each block as a distinct skeleton — no repeated molecule, no numbered headers. Keep the scroll varied in **layout**.
3. Use **one** `.scene-panel` boxed block per page for punctuation; keep the rest full-bleed on snow.
4. Headlines: `.text-*` helpers (resolve to Simplicity Pro) in **emerald** on light (`--scene-title`); loud range/seal headers `.font-x`. No eyebrow kickers above headings (see §3).
5. Tiles/cards: white on light with soft emerald-tinted shadows, packshot `object-fit: contain`, uniform size, one-line ellipsis titles. Cert marks follow the minimalist one-line row, not record cards.
6. Buttons: `.btn-primary` + `.btn-secondary` (not `-light`) on light surfaces.
7. Forms: build a **light** variant (inputs on snow/white with `--color-line-soft` borders, emerald focus ring, slate placeholder). Add tokens/classes here when building the first one.
8. Drop wave dividers; light scenes flow on the shared snow + weave. Reuse `revealOnScroll` for entrances. Keep the reduced-motion path.
9. Copy: documentary voice, verifiable only, no SKU counts, no banned phrases.
