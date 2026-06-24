# Melek — Planner

Snapshot of where the project is, what's locked, and what's left. Update at the end of any session so the next pickup is fast. `CHANGELOG.md` has the detailed blow-by-blow; this is the current state.

Last updated: 2026-05-26.

---

## Current state

The site is **light-dominant** and rebranded to the owner's reference build (`lightyellow-penguin-202886.hostingersite.com` / melekhalalfood). Every page is off the old dark v8 system. Stack unchanged: **Astro 5 + Tailwind 4 + TypeScript + React islands + Vercel**.

- **Font — one face: Simplicity Pro** (Semplicita Pro), **self-hosted** in `/public/fonts` (`@font-face` in `global.css`), used for headings AND body. No Manrope/Archivo, no Google Fonts.
- **Palette (reference):** cream canvas `--color-snow #FDFCF4`; **forest green** `--color-emerald-deep / -black #00300C` (headings on light, header, hero); **medium green** `--color-emerald #4f7f47` (CTA, links); **lime** `--color-lime / --color-gold / --color-brass #A9DD72` (accent). Sage panels (`--color-panel`). `tokens.css` is the source of truth.
- **Header:** greeny forest-green bar on every page — transparent over the dark hero on the homepage, solid greeny elsewhere (`body.page-light`). **Home** is in the nav.
- **Copy:** plain, friendly, short; **do not insist** on being good/certified. **Melek SELLS / supplies — it does not make or manufacture** the food. **Never claim "made in the Netherlands"** or a production location (NL = company base + contact address only). No eyebrow pre-headings, no hero fact ledgers, no SKU counts, no em-dashes, no italic-serif accents.
- **Spacing:** compact — per-section vertical padding (`--section-y` + per-component `--scene-pad`) cut roughly in half, desktop + mobile.
- **Motion:** GSAP + Lenis, all reduced-motion gated (`src/lib/motion.ts`).

### Homepage flow
`Hero` (dark, MP4 video) → `CertMarquee` (green band, white cert icon-chips: Halal/BRC/IFS logos + HACCP/ISO check, scrolling) → `ProductionStory` ("From source to freezer", interactive click-driven walk-through: a tablist of steps Sourced/Selected/Checked/Delivered drives a cross-dissolving facility still, with an auto-advancing progress bar) → `ProductWorlds` (per-range packshot rails) → `ExportCTA` (the one boxed light `.scene-panel` CTA) → `Footer` (sage, light).
Removed from the homepage during simplification: `OperationalStrip`, `HalalConfidence`, `TrustArtifacts` (the marquee carries the certs now). Those components + `Marquee` are now unused/unrendered.

---

## 1. Page status

| Route | State |
|---|---|
| `/` homepage | ✅ light + rebranded (flow above) |
| `/products/` catalog | ✅ light; range sections, white packshot tiles, mobile carousel peek+fade, `ExportCTA` |
| `/products/[slug]/` detail | ✅ light; white presentation media, facts (Unit weight / Certification / Packaging), related rail, `ExportCTA` |
| `/about/` | ✅ light; lighter video hero (`/videos/about-hero.mp4`), manifesto, principles, Google Street View tour, facility gallery, video block, **`TrustArtifacts` cert section still here**, `ExportCTA` |
| `/distributors/`, `/samples/`, `/contact/` | ✅ light forms (white cards, light inputs, emerald focus ring) |
| `/legal/{privacy,cookies,terms}/` | ✅ light shell, **placeholder copy** (awaits counsel) |

---

## 2. Open / next (priority order)

1. **About facility content** — the virtual tour + facility gallery + "From source to freezer" still imply an operation/facility. Since Melek only sells, owner to decide: trim those, or keep as illustrative (with brand-owned photos).
2. **Marquee elsewhere?** — the cert icon-marquee is homepage-only; `/about/` still has the `TrustArtifacts` cert section. Option: put the marquee under the products + about heroes and drop the separate cert section there.
3. **Homepage hero** — still the dark full-bleed MP4. Owner deferred swapping it for the lighter "feature-window" treatment used on About.
4. **Legal copy** — real privacy/cookies/terms text from counsel.
5. **Real cert authority + dates** — confirm the halal authority and BRC/IFS/HACCP/ISO certificate details to show as named, dated marks (currently names only).
6. **Real brand media** — replace dünya placeholders: facility stills (`/public/images/facility/*`), `hero.mp4`. (`about-hero.mp4` came from the reference site.)
7. **Forms delivery** — currently log + thank-you panel; wire to a real inbox (Resend) when credentials are provided.
8. **NL locale** (`/nl/*` route tree), **sitemap/robots** verify, **OG image** (`/og-default.jpg` referenced, not created).

---

## 3. Locked decisions

- **One face: Simplicity Pro** (self-hosted), headings + body. Never add a second/third font.
- **Reference palette:** cream `#FDFCF4`, forest green `#00300C`, medium green `#4f7f47`, lime `#A9DD72`. `tokens.css` authoritative.
- **Greeny header everywhere; Home in nav.**
- **Plain, friendly, non-insisting copy.** **Sell, not make.** **No "made in the Netherlands" / no production claim.** No SKU counts, no em-dashes, no italic-serif accents, no eyebrow pre-headings, no hero fact ledgers.
- **Cert marquee** carries the certs on the homepage (replaces the cert section).
- Tagline kept: "Halal, perfected. Crafted in Europe." Logo `/public/logo.png` 2.16:1 (734×340). Hero background **MP4 only** (never YouTube). Products are file-based Markdown in `/src/content/products/`. Audience: B2B. Languages: EN now, NL later.

---

## 4. Assets the owner provides later

- Brand-owned hero + facility video and photography (to replace dünya/reference placeholders).
- Real cert PDFs / images per authority → `/public/images/certifications/`.
- Distributor / retailer partner logos.
- Final legal copy (privacy / cookies / terms).
- Resend (or other) credentials for form delivery.

---

## 5. Versions / iteration history

Full log in `CHANGELOG.md`. Short version:

| Version | Theme |
|---|---|
| v1–v3 | Scaffold, typography rebuild (Fraunces + Inter), logo/divider fixes |
| v4–v5 | Flat dark sections + wave dividers; MP4 hero; fixed header with `has-dark-hero` |
| v6–v7 | `/products/` catalog + detail; `/about/` rebuild (Street View tour, gallery) |
| v8 | Dark "cinematic" rebuild — Bodoni Moda + Archivo, `data-scene` theming, scenes 01–04 |
| v9 | **Light-dominant**: Clash Display → Manrope → **Simplicity Pro**; whole site migrated to light; **reference-site rebrand** (cream + forest green + lime); cert **icon-marquee**; **sell-not-make** + de-Netherlands, plainer/non-insisting copy; Home nav; compact spacing |

---

## 6. How to resume

1. Start the dev server: `pnpm dev` → **http://localhost:4321/** (use `localhost`, not `127.0.0.1` — local proxy intercepts it). Never run `pnpm build` while `pnpm dev` is watching.
2. Read this file, `STYLEGUIDE.md`, recent `CHANGELOG.md`, and `ARCHITECTURE.md` before touching code.
3. The owner reviews the live site himself — ask him to check `localhost` rather than auto-screenshotting every change.
4. **Never commit or push without explicit approval.** Never deploy automatically.

---

## 7. Conventions for picking up work

- One small testable change per turn, not five.
- Ask the owner to check `localhost`; capture a screenshot only when he asks or when a change genuinely can't be judged otherwise.
- After shipping: update this file + `CHANGELOG.md`.
- Hard rules (also in `CLAUDE.md` / `STYLEGUIDE.md`): one font (Simplicity Pro); no em-dashes; no italic-serif accents; no insisting; **sell not make**; **no "made in the Netherlands" / no production claim**; no SKU counts; no fabricated trust signals.
