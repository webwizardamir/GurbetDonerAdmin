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
- **Two faces only**: **Bodoni Moda** (high-contrast editorial serif) for headlines / scene titles, **Archivo** (industrial grotesk; its `wdth` axis drives expanded brutalist caps via `font-stretch: 125%`, helper `.font-x`) for body / UI / operational labels. Loaded via one Google Fonts request in `Base.astro`. Never add a third face. (v8 replaced the old Fraunces + Inter pairing, which the owner flagged as a recognizable AI-template tell.)
- Operational metadata uses `.op-label` (was `.mono-label`); oversized section numbers use `.scene-index` (was `.mono-num`). Neither is a real mono webfont; both are Archivo.
- **No italic-serif accents inside heading sans.** Headings are one face, one style. Editorial drama comes from scale contrast and Bodoni's stroke contrast, not decoration.

### Writing
- **No em-dashes (—)** anywhere in copy. Replace with commas, full stops, or restructure. (Burned twice.)
- **No fabricated trust signals** — no invented tonnage, employee counts, years in business. Only show what is real and verifiable.
- **No double-quote scare-quoting** of brand words. No corporate filler ("we believe", "we strive").

### Design (v8 cinematic direction)
- **The homepage is a dark-cinematic flow.** `body.has-dark-hero` sits on `--color-emerald-black`. Sections are "scenes" themed via `data-scene="black|char|deep|paper"`, which set `--scene-bg / --scene-ink / --scene-ink-dim / --scene-line / --scene-accent` (defined in `global.css`). Build new sections as `.scene` with a `data-scene`, not the old bone `.section`.
- **No two scenes share a skeleton.** The old `eyebrow → display headline → 6fr/5fr split → numbered equal-card grid` molecule is retired (it was the main AI tell). Vary layout, scale, and rhythm per scene. Primitives: `.op-label`, `.font-x`, `.grid-ed--*`, `.scene-rule`.
- **Do NOT number scenes** with oversized `01/02/03` indices, and **do not surface machine-y metadata** like "13 SKU" — the owner flagged both as AI-ish. The `.scene-index` class exists but is unused; leave it out. SKU counts are meaningless to buyers and the catalogue keeps growing.
- **Watch empty space.** Dark scenes must not leave large dead black areas — a narrow text column against a blank half is an AI tell. Fill the width (two-column splits, ledes, balanced grids); the cards/tiles in a set should be uniform in size.
- **Scene transitions are deliberate cuts**, not wave dividers — dark scenes may touch (the old "two darks must never touch" rule is retired for this flow). Wave dividers survive only on not-yet-rebuilt legacy sections; tone-match their wrapper bg to the neighbour (e.g. `HalalPromise` now takes a `topBg` prop, set to `--color-emerald-black` on the homepage).
- **Legacy light sections** (Process, Certifications, Footer, internal pages) still use the old bone/cream + flat-`--color-emerald-deep` system and wave dividers until rebuilt. Do not break them; expect a visible seam where new dark scenes meet old beige ones mid-redesign.
- **Palette**: dark canvas (`--color-emerald-black`, `--color-char-900`) + warm ink (`--color-paper`, `--color-bone`) + accents `--color-brass` / `--color-silver` / sparing `--color-spice`. Move off the bone/cream beige + emerald + gold combination on rebuilt scenes.

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
