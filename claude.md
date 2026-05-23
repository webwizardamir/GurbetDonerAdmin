# Project Rules

Read these before touching code. Then read `docs/STYLEGUIDE.md`, `docs/PLANNER.md`, and `docs/ARCHITECTURE.md`. They contain the rest of the context.

---

## Project at a glance

- **Brand**: Melek — standalone halal frozen-food brand, NL-based, ships across Europe.
- **Audience**: B2B distributors / importers primarily.
- **Stack**: Astro 5 + Tailwind 4 + TypeScript + React 19 + Vercel.
- **Dev server**: `pnpm dev` → http://127.0.0.1:4321/.
- **Languages**: EN at launch, NL later (i18n scaffolded, not yet built).

---

## Hard rules (do not violate)

### Typography
- **Two fonts only**: Fraunces (variable serif) for all headings, Inter for body / UI. Loaded via one Google Fonts request in `Base.astro`. Never add a third face.
- **No italic-serif accents inside heading sans.** That pattern was removed in v2 because it read AI-generated. Headings are one font, one style.

### Writing
- **No em-dashes (—)** anywhere in copy. Replace with commas, full stops, or restructure. (Burned twice.)
- **No fabricated trust signals** — no invented tonnage, employee counts, years in business. Only show what is real and verifiable.
- **No double-quote scare-quoting** of brand words. No corporate filler ("we believe", "we strive").

### Design
- **Dark sections must be flat `--color-emerald-deep`.** No radial gradients on Halal, DistributorCTA, or Footer — they bleed to edges and break wave-divider tone matching (lesson from v3 → v4). Visual interest comes from the grain pattern + inline decorative SVGs.
- **Section alternation matters.** Bone / cream / emerald-deep. Two dark sections must never touch directly — insert a bone section between them.
- **Wave dividers need wrapper bg-color.** Set the wrapper `<div>` background to the section ABOVE it so the empty SVG region doesn't reveal page-body bone. Set `line-height: 0` on the wrapper. Use `margin: -1px` on the SVG to close hairline gaps.

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
4. Screenshot before presenting (use `scripts/screenshot.mjs` or a region-specific script in `scripts/`).
5. Update `docs/PLANNER.md` checklists and `docs/CHANGELOG.md` after shipping.

### When picking up from a prior session
1. Read `docs/PLANNER.md` for current state and TODOs.
2. Read `docs/CHANGELOG.md` for direction history.
3. Check `temporary_screenshots/v5/` (or latest `vN/`) to see where the visuals are.
4. Verify the dev server is still healthy: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/`.

### Screenshot tooling
- Playwright with **system Chrome** (Playwright's bundled Chromium fails to download on this network — use `executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`).
- Force `.is-visible` on all `.reveal` elements before full-page captures, otherwise below-fold sections render empty.
- Output goes to `temporary_screenshots/<SHOTS_DIR>/`. Set `SHOTS_DIR=v6` env var to bump the version folder.

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
