# Melek — Architecture

Tech-stack rationale, folder layout, and the patterns that matter (and the ones that bit us in earlier versions).

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 5** | Content-led, static-first, ships zero JS by default → Lighthouse 95+. Built-in Content Collections fit our `.md` product model. Native i18n. Vercel adapter ships in one line. |
| Styling | **Tailwind 4** (via `@tailwindcss/vite`) | Utility-first; CSS variables for tokens; no `tailwind.config.js` needed in v4 (CSS-first config). |
| Interactive islands | **React 19** | Only used where needed (form panels). Astro keeps the rest as zero-JS HTML. |
| Motion | CSS + IntersectionObserver | GSAP is installed but not currently used. Plain CSS transitions handle everything we ship today. |
| Forms | Plain `<form>` + inline JS | Submissions are logged + show a thank-you panel. Resend wiring intentionally deferred. |
| Images | Astro Image (sharp at build) + plain `<img>` for public/ paths | Product / cert badge images live in `/public/` so they have stable absolute URLs. |
| Icons | Inline SVG | Lucide installed but rarely used; small SVGs are written inline next to the markup that needs them. |
| Type | TypeScript strict | Catches broken product frontmatter at build. |
| Hosting | Vercel (EU edge) | Best-in-class Astro support. Adapter is `@astrojs/vercel`. |
| Screenshot tooling | Playwright + system Chrome | Playwright's bundled Chromium download kept failing; we use the executablePath of the system Chrome. |

---

## 2. Folder layout

```
melek-halal-food-frontend/
├─ brand_assets/                     # Source brand files (logo PNG)
├─ docs/                             # All design + planning docs (this folder)
│  ├─ 01-reference-analysis.md
│  ├─ 02-brief-and-stack.md
│  ├─ 03-design-system.md            # v1 design doc, partially outdated; STYLEGUIDE.md supersedes
│  ├─ STYLEGUIDE.md                  # ← current visual reference
│  ├─ PLANNER.md                     # ← state of the project
│  ├─ ARCHITECTURE.md                # ← this file
│  └─ CHANGELOG.md
├─ public/
│  ├─ logo.png                       # Single canonical logo (734 × 340)
│  ├─ favicon.png
│  ├─ images/
│  │  ├─ products/{slug}.png         # 46 SKU packshots
│  │  ├─ certifications/{slug}.png   # Halal, BRC, IFS
│  │  ├─ trust/                      # Older D2C trust marks (not wired)
│  │  └─ hero/field.webp             # Poster fallback for hero video
│  └─ videos/hero.mp4                # Hero background MP4
├─ scripts/
│  ├─ download-assets.sh             # Re-fetches product / cert / hero assets via curl
│  ├─ download-assets.mjs            # (Same task in Node; curl is the working path on Windows)
│  ├─ screenshot.mjs                 # Full v-set Playwright capture (writes to /temporary_screenshots/$SHOTS_DIR/)
│  ├─ shot-region.mjs                # Targeted region screenshots
│  ├─ shot-seam.mjs                  # Diagnostic: zoom on a single seam
│  ├─ shot-marquee.mjs               # Marquee close-up
│  ├─ shot-header.mjs                # Header at both states + both viewports
│  ├─ shot-nonhero.mjs               # /about/, /products/ etc.
│  └─ debug-menu.mjs                 # Mobile menu DOM state diagnostic
├─ src/
│  ├─ pages/
│  │  ├─ index.astro                 # Homepage (uses bodyClass="has-dark-hero")
│  │  ├─ products/index.astro        # Catalog landing
│  │  ├─ products/[slug].astro       # Product detail (static, fallback monogram)
│  │  ├─ about/index.astro
│  │  ├─ distributors/index.astro
│  │  ├─ samples/index.astro
│  │  ├─ contact/index.astro
│  │  └─ legal/{privacy,cookies,terms}.astro
│  ├─ layouts/
│  │  └─ Base.astro                  # Shell, fonts, OG metadata, JSON-LD, scroll-reveal observer
│  ├─ components/
│  │  ├─ Header.astro                # Fixed header, transparent-when-over-hero pattern
│  │  ├─ MobileMenu.astro            # Full-screen sheet, lives in Base layout (NOT in Header — see §5)
│  │  ├─ Footer.astro                # Wave divider at top, footer card grid
│  │  └─ sections/
│  │     ├─ Hero.astro               # MP4 video bg
│  │     ├─ Marquee.astro            # Brand keyword loop
│  │     ├─ Categories.astro         # 3 cards with product image accents
│  │     ├─ FeaturedProducts.astro   # Reads from content collection
│  │     ├─ HalalPromise.astro       # Dark section + wave dividers top & bottom
│  │     ├─ Process.astro            # 4-step grid + quick-stats
│  │     ├─ DistributorCTA.astro     # Dark section + wave dividers
│  │     ├─ Certifications.astro     # 5 badges (3 real + 2 text seals)
│  │     └─ TrustStrip.astro         # DEPRECATED in v4 (kept around for reference)
│  ├─ content/
│  │  └─ products/{slug}.md          # 46 SKUs
│  ├─ content.config.ts              # Zod schema for the products collection
│  ├─ lib/
│  │  └─ site.ts                     # Single source of site config (name, nav, address, social, categories)
│  ├─ styles/
│  │  ├─ tokens.css                  # @theme block + :root vars
│  │  ├─ global.css                  # @import tailwindcss + tokens + hero, plus primitives
│  │  └─ hero.css                    # Extracted from Hero.astro in v5 to keep the Astro file readable
│  └─ env.d.ts
├─ temporary_screenshots/            # Iteration screenshots, gitignored
│  ├─ reference_analysis/            # dunyaholding.com captures
│  ├─ reference_old_melek/           # User's prior hostinger site
│  ├─ v1/ ... v5/                    # Per-iteration snapshots
├─ .gitignore
├─ astro.config.mjs                  # Astro + Tailwind Vite plugin + Vercel adapter + sitemap + i18n
├─ tsconfig.json
├─ package.json
├─ pnpm-lock.yaml
└─ CLAUDE.md                         # Rules for the next Claude session
```

---

## 3. Routing

Static output (`output: "static"`) with Vercel adapter. Trailing slashes always. i18n is configured (`en` default + `nl`) but `nl` routes are not yet built.

Site canonical URL: `https://melekhalalfood.nl` (set in `astro.config.mjs`).

---

## 4. Content collections

Defined in `src/content.config.ts` with a Zod schema:

```ts
{
  name: string,
  category: "chicken" | "beef" | "snacks",
  weight?: string,
  tagline?: string,
  image?: string,        // path under /public/, e.g. /images/products/chicken-kebab.png
  badges?: string[],
  featured?: boolean,
  order?: number
}
```

Markdown files live in `src/content/products/`. The Astro pages query the collection in their frontmatter, no runtime database needed.

---

## 5. Patterns that mattered (and the gotchas behind them)

### 5.1 Header is `position: fixed`, not `sticky`

**Why:** with `position: sticky` the header occupies normal flow, pushing the hero below it. The page-body bone shows behind a transparent header — not the hero video. Fixed positioning floats the header above content and the hero extends up under it.

**How:**
- `position: fixed; inset-inline: 0; inset-block-start: 0`
- `main` reserves space via `padding-block-start: var(--header-h)`
- The homepage uses `<Base bodyClass="has-dark-hero">` which sets `body.has-dark-hero main { padding-block-start: 0 }` so the hero starts at viewport top.
- `--header-h: 76px` desktop, `64px` mobile.

### 5.2 Mobile menu lives **outside** the header

**Why:** `.site-header` has `backdrop-filter: saturate(140%) blur(16px)`. `backdrop-filter` makes the element a containing block for any fixed-positioned descendant. A `<MobileMenu>` rendered inside the header gets sized to the header's box (76px tall) instead of the viewport. This bit us in v2 — the menu opened with state="open" but was 64 px tall.

**How:** `MobileMenu.astro` is rendered as a sibling of `<Header>` in `Base.astro`. The hamburger toggle in `Header` queries the menu element by data-attribute and toggles its state. Z-indexes: header 50, menu 70.

### 5.3 Wave dividers between sections

**Why:** purely-SVG dividers leave a transparent strip above and below the wave path. Without a wrapper background-color, that strip shows the page body bone — causing a "white sliver" between sections that should flow smoothly.

**How (canonical):**
```html
<!-- Bone (section above) → Cream (section below) -->
<div class="cats__divider" aria-hidden="true">
  <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
    <path d="M0,40 C240,8 480,8 720,38 ... L1440,80 L0,80 Z"
          fill="var(--color-cream)"/>
  </svg>
</div>
```
```css
.cats__divider {
  background: var(--color-bone);   /* matches the section ABOVE the divider */
  line-height: 0;                  /* kills inline whitespace */
}
.cats__divider svg {
  display: block;
  margin-block-start: -1px;        /* close sub-pixel hairline */
}
```
Plus dark sections that meet a divider must be **flat** `--color-emerald-deep` (no radial gradients) so the divider's flat fill tone-matches.

### 5.4 Header transparent over dark hero

`body.has-dark-hero .site-header:not([data-scrolled="true"])` toggles a state where:
- Background: transparent, no backdrop-filter.
- Logo: drop-shadow for legibility.
- Nav links / hamburger bars / secondary CTA: bone-coloured.
- Scroll listener uses hysteresis (`ON: 40`, `OFF: 12`) to prevent flicker right at the top.

### 5.5 Hero is a `<video>`, not a YouTube iframe

Self-hosted MP4 in `/public/videos/hero.mp4`. `<video autoplay muted loop playsinline preload="auto">` with a `poster` fallback. **Never go back to a YouTube iframe** — the API plus the controls suppression was three iterations of pain in v3–v5.

### 5.6 Scroll-reveal forced on for screenshots

`scripts/screenshot.mjs` injects `.is-visible` on every `.reveal` element before screenshotting. Without this, full-page captures of long pages show empty below-fold sections (IntersectionObserver never fires for elements below the viewport).

---

## 6. Adding a new section

1. Create `src/components/sections/MySection.astro`.
2. Import + add to `src/pages/index.astro` in the right spot so the bone / cream / emerald-deep alternation holds.
3. If your section is dark (emerald-deep), give it **flat** background and add wave dividers at the boundaries.
4. Run `pnpm dev` and check via the dev server.
5. Capture a screenshot pass via `node scripts/screenshot.mjs` and present.
6. Update `PLANNER.md` §2 (section order) and §3 (complete).

---

## 7. Adding a new product

1. Drop the image at `public/images/products/<slug>.<ext>`.
2. Create `src/content/products/<slug>.md`:
   ```md
   ---
   name: "Display Name"
   category: chicken | beef | snacks
   weight: "800 g"
   image: "/images/products/<slug>.png"
   featured: false
   order: 100
   ---
   ```
3. The catalog and detail routes pick it up automatically.

---

## 8. Running

```bash
pnpm install
pnpm dev            # http://127.0.0.1:4321/
pnpm build          # static output → dist/
pnpm typecheck      # astro check
```

`pnpm` is the canonical package manager (`pnpm-lock.yaml` is committed). Sharp + esbuild are listed as `onlyBuiltDependencies` because pnpm 10 quarantines build scripts otherwise.

---

## 9. Screenshot workflow

```bash
SHOTS_DIR=v6 node scripts/screenshot.mjs        # Full v-set (desktop / mobile / tablet / menu / hover)
SHOTS_DIR=v6 node scripts/shot-region.mjs       # Region close-ups
SHOTS_DIR=v6 node scripts/shot-header.mjs       # Header both states
SHOTS_DIR=v6 node scripts/shot-nonhero.mjs      # Internal pages
SHOTS_DIR=v6 node scripts/shot-seam.mjs         # Single-seam diagnostic
SHOTS_DIR=v6 node scripts/shot-marquee.mjs      # Marquee close-up
```

All Playwright scripts use the system Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) — the bundled Chromium download is flaky on this network.

---

## 10. Deploy

Not yet wired. Vercel adapter is in `astro.config.mjs`. When ready:
1. Connect the repo to Vercel.
2. Vercel auto-detects Astro and runs `astro build`.
3. Set domain to `melekhalalfood.nl`.
4. **Do not deploy without explicit user approval** (per root `CLAUDE.md`).
