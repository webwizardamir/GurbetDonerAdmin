# Project Rules

Read these before touching code. Then read `docs/STYLEGUIDE.md`, `docs/PLANNER.md`, and `docs/ARCHITECTURE.md`. They contain the rest of the context.

---

## Project at a glance

- **Brand**: Melek — standalone halal frozen-food brand, NL-based, ships across Europe.
- **Audience**: B2B distributors / importers primarily.
- **Stack**: Astro 5 + Tailwind 4 + TypeScript + React 19 + Vercel.
- **Dev server**: `pnpm dev` → use **http://localhost:4321/**. (On this machine `127.0.0.1:4321` is intercepted by a local proxy and returns 503; `localhost` serves. Screenshot scripts default to `localhost` + launch Chrome with `--no-proxy-server`.) **Never run `pnpm build` while `pnpm dev` is running** — Vite's watcher scandirs `.vercel/output` and crashes the dev server (`errno -4094`). Stop dev before building, then restart it.
- **Languages**: EN at launch, NL later (i18n scaffolded, not yet built).

---

## Hard rules (do not violate)

### Typography
- **One face: Simplicity Pro** (Semplicita Pro), **self-hosted** in `/public/fonts` (`@font-face` in `global.css`), used for headings AND body / UI / everything — owner's choice, matching the reference site. Drives `--font-display`, `--font-sans`, `--font-grotesk-x`. Weights: 400 (woff/ttf), 400 italic, 500, 600–800→Bold. No second/third face. (History: Fraunces+Inter → Bodoni → Clash → Manrope → Simplicity Pro.) On light scenes headlines are dark-green via `--scene-title`.
- Operational metadata uses `.op-label` (was `.mono-label`); oversized section numbers use `.scene-index` (was `.mono-num`). Neither is a real mono webfont; both are Archivo.
- **No eyebrow pre-headings, no hero fact ledgers (owner).** Do not place a small kicker label above a heading, and do not add "at a glance" fact strips to heroes (and never surface SKU counts). `.op-label` is for functional micro-labels only (breadcrumbs, tile meta, captions, scroll cue). See `docs/STYLEGUIDE.md §3`.
- **No italic-serif accents inside heading sans.** Headings are one face, one style. Editorial drama comes from scale and weight contrast, not decoration.

### Writing
- **No em-dashes (—)** anywhere in copy. Replace with commas, full stops, or restructure. (Burned twice.)
- **No fabricated trust signals** — no invented tonnage, employee counts, years in business. Only show what is real and verifiable.
- **No double-quote scare-quoting** of brand words. No corporate filler ("we believe", "we strive").
- **Plain, friendly, short copy. Do not insist.** Everyday words. The owner found the old copy too harsh / AI-ish. The brand is known locally, so don't keep selling that we're good / certified / "defensible in a tender" — say what people need, once, then stop. Detail lives on About; the homepage stays light. (See `docs/STYLEGUIDE.md §1, §7`.)
- **Food is NOT made in the Netherlands, and Melek does not make it at all** — it **sells / supplies / distributes** halal frozen food. Never claim a production location or manufacturing; use "sell / supply / offer", never "make / produce / our production". NL is the company base; "shipped across Europe" is fine.

### Design (v9 light-dominant direction)
- **The homepage is light-dominant.** A dark `--color-emerald-black` Hero opens it (`body.has-dark-hero`), then the page runs light end to end. Sections are "scenes" themed via `data-scene="light|black|char|deep|paper"`, which set `--scene-bg / --scene-ink / --scene-ink-dim / --scene-line / --scene-accent` (+ forest-green `--scene-title` on light) in `global.css`. **`light` (cream `--color-snow #FDFCF4`, forest-green headings, soft glow + a diagonal weave that stays continuous across seams) is the default; dark is punctuation.** Build new sections as `.scene` with a `data-scene`, not the old bone `.section`. Full detail: `docs/STYLEGUIDE.md`.
- **No two scenes share a skeleton.** The old `eyebrow → display headline → 6fr/5fr split → numbered equal-card grid` molecule is retired (it was the main AI tell). Vary layout, scale, and rhythm per scene. Primitives: `.op-label`, `.font-x`, `.grid-ed--*`, `.scene-rule`, `.scene-panel`.
- **Boxed-panel motif, one per page.** To keep the light scroll crafted, one scene's content sits in an inset `.scene-panel` (soft emerald tint `--color-panel`/`--color-panel-deep`, padding, `--radius-xl`, a decorative top-right shape, the body showing around it). Owner rule: **only one box per page** for variety; the rest stay full-bleed on snow. On the homepage that box is the ExportCTA.
- **Do NOT number scenes** with oversized `01/02/03` indices, and **do not surface machine-y metadata** like "13 SKU" — the owner flagged both as AI-ish. The `.scene-index` class exists but is unused; leave it out. SKU counts are meaningless to buyers and the catalogue keeps growing.
- **Watch empty space.** A narrow text column against a blank half is an AI tell. Fill the width (two-column splits, ledes, balanced grids); the cards/tiles in a set should be uniform in size. Certs are a moving icon-marquee (homepage `CertMarquee`) or a one-line row of marks (about `TrustArtifacts`), not a record-card grid.
- **Scene transitions are deliberate cuts**, not wave dividers — the hero→light boundary is a clean cut, and light scenes flow on the shared snow + weave. Wave dividers survive only on not-yet-rebuilt legacy sections; tone-match their wrapper bg to the neighbour.
- **Legacy sections** (internal pages, the shared `Certifications`/`HalalPromise`/`DistributorCTA`, and the still-dark v8 inner pages) are queued for rebuild into this light system. Do not break them; expect a visible seam until migrated.
- **Palette (reference site, v9.13)**: warm **cream** canvas `--color-snow #FDFCF4`; **forest green** `--color-emerald-deep #00300C` (headings on light, dark sections, header/hero); **medium green** `--color-emerald #4f7f47` (CTA, links, accents); **lime** `--color-lime / --color-gold / --color-brass #A9DD72` (bright accent — marquee, header underline, hero bead). Sage panels (`--color-panel`). `tokens.css` is the source of truth.

### Header
- `position: fixed` (not sticky). The hero extends up under the header.
- `body.has-dark-hero` (set in `index.astro` only) tells the header to start transparent over the video and tells `main` to not offset for the header.
- Mobile menu lives in `Base.astro`, **outside** the header. The header has `backdrop-filter` which creates a containing block for `position: fixed` descendants; a mobile menu inside the header gets sized to the header's box.

### Hero
- Self-hosted MP4 at `/public/videos/hero.mp4`. Never go back to a YouTube iframe — three iterations of pain.
- Poster fallback at `/public/images/hero/field.webp`.

### Logo
- Canonical file: `/public/logo.png`. Intrinsic dimensions **734 × 340** (aspect 2.16:1).
- When declaring `<img width=... height=...>`, use values that preserve this ratio. Footer logo uses `object-fit: contain; align-self: flex-start; height: 90px`.

### Deploy
- **Never deploy automatically. Never push to GitHub automatically.** Always wait for explicit user approval.
- Vercel adapter is configured but not connected.

---

## Workflow

### When the user reports an issue
1. Reproduce it first if possible (screenshot, dev server check).
2. Plan in `TaskCreate` items so progress is visible.
3. Make one small testable change per turn.
4. **Ask the user to check the live site** (`http://localhost:4321/`) instead of screenshotting every change — he reviews it himself. Run a capture (`scripts/shot-*.mjs`) only when he reports an issue and asks for one, or when a change genuinely can't be judged without seeing it.
5. Update `docs/PLANNER.md` checklists and `docs/CHANGELOG.md` after shipping.

### When picking up from a prior session
1. Read `docs/PLANNER.md` for current state and TODOs.
2. Read `docs/CHANGELOG.md` for direction history.
3. Check `temporary_screenshots/v5/` (or latest `vN/`) to see where the visuals are.
4. Verify the dev server is still healthy: `curl -s --noproxy '*' -o /dev/null -w "%{http_code}\n" http://localhost:4321/` (use **localhost**, not 127.0.0.1 — see the dev-server note below).

### Screenshot tooling
- Playwright with **system Chrome** (Playwright's bundled Chromium fails to download on this network — use `executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`, launch with `--no-proxy-server`, target `localhost`).
- Current scripts: `scripts/shot-hero.mjs` (hero at 3 widths), `scripts/shot-home.mjs` (full page + per-section crops), `scripts/probe-hero.mjs` (computed token/color sanity).
- Before full-page captures, force `.is-visible` on `.reveal` AND set `opacity:1; transform:none` on `[data-reveal]` (the new GSAP reveal targets only un-hide on scroll, so a non-scrolling full-page capture renders them empty otherwise).
- Element crops of sticky/pinned scenes are unreliable (the fixed header bleeds in, sticky children mis-position). Judge those from the full-page capture.
- `shot-home.mjs` captures under `reducedMotion: "reduce"` so Lenis smooth-scroll does not initialise — otherwise `scrollIntoViewIfNeeded` triggers a smooth scroll that never settles and element screenshots time out on "element is not stable". `shot-hero.mjs` keeps motion on (it needs the GSAP intro) and is safe because it never scrolls.
- Output goes to `temporary_screenshots/<SHOTS_DIR>/`. Set `SHOTS_DIR=v8` env var to bump the version folder.

### Branding assets
- Source files: `/brand_assets/`.
- Working assets in `/public/`: logo, products/, certifications/, hero/, videos/.
- Real product packshots: 46 SKUs already downloaded.
- Real cert badges: HALAL (circular), BRC, IFS available. HACCP and ISO 22000 are text-only seals (no licensed badge yet).

---

## Quality standard

The website must not feel AI-generated. It must feel premium, branded, and professionally art-directed.

Reference site: `https://dunyaholding.com` — same family, but cleaner and more sophisticated.

---

## File paths to know

- `src/lib/site.ts` — single source of site config (name, nav, address, social, categories).
- `src/styles/tokens.css` — CSS variables, the source of truth for all colour, spacing, radius, font tokens.
- `src/styles/global.css` — Tailwind import + tokens + primitive classes (`.btn`, `.eyebrow`, `.card`, `.reveal`, `.marquee`, forms).
- `src/styles/hero.css` — hero-only styles, imported from global.css.
- `src/content.config.ts` — Zod schema for the products content collection.
- `astro.config.mjs` — site URL, Tailwind Vite plugin, Vercel adapter, sitemap, i18n.

---

## When in doubt

- **About design**: read `docs/STYLEGUIDE.md`.
- **About what's done / what's next**: read `docs/PLANNER.md`.
- **About how the project is wired**: read `docs/ARCHITECTURE.md`.
- **About history of decisions**: read `docs/CHANGELOG.md`.
- **About the user's original brief**: read `docs/02-brief-and-stack.md`.
- **About what dunyaholding.com does**: read `docs/01-reference-analysis.md`.
