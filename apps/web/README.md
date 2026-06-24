# Melek Halal Food — Frontend

Premium halal frozen-food brand site. B2B-led, NL-based, ships across Europe.

Built with **Astro 5 + Tailwind 4 + TypeScript + React 19** for Vercel.

---

## Quick start

```bash
pnpm install
pnpm dev          # http://127.0.0.1:4321/
pnpm build        # static output → ./dist/
pnpm typecheck    # astro check
```

`pnpm` is the canonical package manager (`pnpm-lock.yaml` is committed). Node 22+ recommended.

---

## What is this

A static-first marketing + product-catalog site for the Melek halal food brand. Sections include a video hero, an animated brand-keyword marquee, three product ranges (chicken / beef / snacks), a halal promise dark band, the production process, a distributor CTA, real certification badges, and full contact + sample-request flows.

Designed and built to outperform the reference at `dunyaholding.com` on typography, hierarchy, and motion polish — while staying in the same food-industry visual family.

---

## Routes

| Path | Notes |
|---|---|
| `/` | Homepage. Uses `<Base bodyClass="has-dark-hero">` so the fixed header floats transparent over the hero video. |
| `/products/` | Catalog landing, anchor-chip filtered by category. |
| `/products/[slug]/` | Product detail (auto-generated from `src/content/products/*.md`). 46 SKUs currently. |
| `/distributors/` | Distributor application form. |
| `/samples/` | Sample request form. Accepts `?product=` deep link. |
| `/about/` | Heritage + halal promise + process + certifications. |
| `/contact/` | Multi-route contact + general inbox form. |
| `/legal/{privacy,cookies,terms}/` | Placeholder legal pages (pending counsel review). |

---

## Folder map

```
brand_assets/           Source brand files (logo PNG)
docs/                   Design + planning docs
  STYLEGUIDE.md         Tokens, type, components — visual source of truth
  PLANNER.md            Project state, TODOs, decision log
  ARCHITECTURE.md       Tech stack rationale, folder layout, patterns
  CHANGELOG.md          Iteration history
public/                 Static assets served as-is
  images/products/      46 product packshots
  images/certifications/ Halal / BRC / IFS badges
  images/hero/          Poster fallback
  videos/hero.mp4       Hero background MP4
  logo.png              Canonical brand logo (734 × 340)
scripts/                Asset downloader + Playwright screenshot scripts
src/
  pages/                Astro routes
  layouts/Base.astro    Page shell, fonts, OG metadata
  components/           Header, MobileMenu, Footer, sections/*
  content/products/     Markdown per SKU
  styles/               tokens.css, global.css, hero.css
  lib/site.ts           Site config (name, nav, address, social, categories)
temporary_screenshots/  Iteration screenshots (gitignored)
astro.config.mjs        Astro + Tailwind Vite + Vercel adapter + sitemap + i18n
```

Full layout: `docs/ARCHITECTURE.md`.

---

## How to add things

### A new product
1. Drop the image into `public/images/products/<slug>.<ext>`.
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
3. The catalog (`/products/`) and detail (`/products/<slug>/`) routes pick it up automatically.

### A new homepage section
1. Create `src/components/sections/MySection.astro`.
2. Add it to `src/pages/index.astro` in the right spot — keep the bone / cream / emerald-deep alternation so no two dark sections touch (the wave dividers depend on it).
3. If your section is dark, use **flat** `--color-emerald-deep` background and add wave dividers at the boundaries (see `docs/STYLEGUIDE.md §10` and `docs/ARCHITECTURE.md §5.3`).

### Visual conventions
Read `docs/STYLEGUIDE.md` before changing any visual. Key rules:
- **Two fonts only**: Fraunces (headings) + Inter (body). No third face. No italic-serif accents inside heading sans.
- **No em-dashes** (—) in copy. Use commas / full stops / restructure.
- **No fabricated capacity numbers**. Trust signals are cert names only.

---

## Screenshot iteration

```bash
SHOTS_DIR=v6 node scripts/screenshot.mjs        # Full set (desktop / mobile / tablet / menu / hover)
SHOTS_DIR=v6 node scripts/shot-header.mjs       # Header transparent vs scrolled
SHOTS_DIR=v6 node scripts/shot-region.mjs       # Section close-ups
```

All scripts use the system Chrome via Playwright. Output lands in `temporary_screenshots/<SHOTS_DIR>/`.

---

## Deploying

Vercel adapter is configured in `astro.config.mjs`. Repository connects directly to Vercel for auto-deploys.

**Do not deploy without explicit user approval.** Per the root `CLAUDE.md`, deploys are user-triggered, not automatic.

---

## Documentation index

- [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md) — design tokens, components, motion principles
- [`docs/PLANNER.md`](docs/PLANNER.md) — what's done, what's next, decision log
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack rationale, folder layout, patterns
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — iteration history (v0 → v5)
- [`docs/01-reference-analysis.md`](docs/01-reference-analysis.md) — initial dunyaholding.com analysis
- [`docs/02-brief-and-stack.md`](docs/02-brief-and-stack.md) — original brief + stack recommendation
