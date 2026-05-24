# Melek — Changelog

One-line entries per ship. Most recent at the top. "v" is an iteration label, not a release version.

---

## v8 — Cinematic anti-AI homepage, vertical slice (2026-05-24)

The owner asked for a complete anti-AI overhaul: the bone/cream + Fraunces/Inter + repeating "eyebrow → headline → card grid" homepage read as AI-generated. This pass rebuilds the top of the homepage (scenes 01-04) into an editorial, dark-cinematic flow and leaves the lower sections for later passes. Three old CLAUDE.md rules were deliberately overridden (two-fonts=Fraunces+Inter, bone/cream palette, flat-dark + wave-divider alternation); docs updated to match.

- **8.1 Typography.** Replaced Fraunces + Inter with **Bodoni Moda** (high-contrast editorial serif, headlines) + **Archivo** (industrial grotesk, body/UI/labels; `wdth` axis → expanded brutalist caps via `.font-x`). One Google Fonts request. Retuned the `global.css` type helpers for Bodoni (dropped Fraunces `SOFT`/`opsz`). Renamed `.mono-label`→`.op-label`, `.mono-num`→`.scene-index` (neither was ever a mono webfont).
- **8.2 Dark scene system.** `body.has-dark-hero` now sits on `--color-emerald-black`. Added `data-scene="black|char|deep|paper"` theming (`--scene-bg/ink/ink-dim/line/accent`) + a `.scene` base, plus a `--color-paper` de-beiged off-white. Added editorial primitives: `.scene-index`, `.op-label`, `.font-x`, `.grid-ed--*`, `.scene-rule`, `.text-accent`, `.ink-dim`. Legacy light sections keep their own bone backgrounds, so they are unaffected.
- **8.3 Hero reconcile.** `.cine-hero` re-skinned to the new faces (Bodoni masked headline, Archivo ledger/labels). Scroll cue now targets `#proof`. Transition into scene 02 is a deliberate dark cut (the deleted wave divider is not reintroduced).
- **8.4 Scene 02 — Operational Proof Strip** (`OperationalStrip.astro`, replaced `Marquee`). Brutalist data band: "What a buyer checks before listing a supplier" + verifiable facts (46 SKU, Halal·BRC·IFS, EU, NL) in mixed grotesk/serif, hairline-separated. No stars, no farm-to-fork.
- **8.5 Scene 03 — The Production Story** (`ProductionStory.astro`, replaced `Categories`). Sticky facility visual cross-dissolves through four documentary beats (Sourcing/Production/Quality release/Logistics) as the narrative scrolls. Facility stills are dunya placeholders, duotone-muted onto the dark palette; mobile shows inline beat images. Added `revealOnScroll()` to `motion.ts`.
- **8.6 Scene 04 — Product Worlds** (`ProductWorlds.astro`, replaced `FeaturedProducts`). Per-range horizontal lookbook rails (Chicken/Beef/Snacks) of varying-scale packshots on dark tiles with a brass studio-spotlight and cinematic hover zoom. Reads the products collection; metadata only where present. Not an equal-card grid.
- **8.7 Seam + tooling.** `HalalPromise` gained a `topBg` prop so its top wave tone-matches the dark scene above on the homepage (still cream on About). Screenshot scripts switched to `localhost` + `--no-proxy-server` (here `127.0.0.1:4321` is proxy-intercepted, returns 503) and now force `[data-reveal]` visible after GSAP runs.
- **8.9 Owner feedback pass.** Header now stays dark (not bone) when scrolled on the homepage. Removed the hero coordinates (`N 52° · E 05°` / `The Netherlands`). Removed all oversized scene numbers (`02/03/04`) and the machine-y `· NN SKU` range counts (flagged as AI-ish; catalogue keeps growing). ProductWorlds: uniform tile size, one-line names with ellipsis, header filled with a lede. ExportCTA: rebalanced to a two-column split so the right half is no longer empty. TrustArtifacts: five cards rebalanced (three across, then two wide) so there is no empty half-row. Footer: fixed the beige wave (now emerald-black on the homepage), set the footer to emerald-black, and added a brutalist masthead (closing statement + operational strip). Recorded the no-numbering / no-SKU / watch-empty-space rules in `CLAUDE.md`.
- **8.8 Lenis + lower-stack + owner feedback.** Added **Lenis** smooth-inertia scroll (`initSmoothScroll()` in `motion.ts`, GSAP-ticker driven, dynamic-imported, reduced-motion gated, animates in-page anchors). Boxed the ProductWorlds rails to the container and shrank the tiles (owner: too big / full-width). Closed the beige seam: removed the redundant legacy `Process` from the homepage (ProductionStory covers it), gave `HalalPromise` + `DistributorCTA` a `dividers` prop and ran them dark with dividers off, and replaced homepage Certifications with a new **`TrustArtifacts.astro`** (certs as pale inspection-record cards with passport-style stamps on the dark archive). The shared components keep their bone/wave defaults for About + products. Named **Amsterdam** (owner-confirmed) in the Production Story; tagline kept (owner). Dropped "curated assortment" from the CTA copy. The homepage is now fully dark end to end.

---

## v7 — About page rebuild (2026-05-22)

- Studied `dunyaholding.com/meet-us/` (screenshots in `temporary_screenshots/reference_meet_us/`). Extracted the Google Street View virtual-tour iframe src, the shared MP4, and facility image URLs.
- Rebuilt `/about/` to v2+ rules. Sections: hero (title + facts aside), "The Melek way" mission/vision/standard cards, **Google Street View virtual tour** embed (location reused with permission), **video block** (same `/public/videos/hero.mp4`, with controls), **facility gallery** (5 photos), then reused `HalalPromise` + `Process` + `Certifications` + `DistributorCTA`.
- Facility gallery photos are sourced from dunya and carry their branding, so they get an **emerald duotone CSS filter** (`grayscale + sepia + hue-rotate`) to pull them onto the Melek palette until real Melek facility photos are supplied. Hover lifts the duotone toward full colour.
- About styles extracted to `src/styles/about.css`, imported from `global.css`.
- Downloaded facility images to `public/images/facility/` (placeholders, flagged for replacement).
- **v7.3 divider review** (same audit as the homepage): reordered the end so it alternates `Process(bone) → DistributorCTA(emerald) → Certifications(bone) → Footer(emerald)`, matching the colour flow the reusable components hardcode. Changed `ab-gallery` to cream so `HalalPromise`'s cream-above wave divider matches (fixes the beige/white/green sliver above "The Melek halal promise"). Added CSS-var-driven wave dividers between the custom sections (values→tour, tour→video, video→gallery). Removed the straight `border-block` lines on `ab-tour` and the `border-block-end` on the shared `Certifications` component (killed the straight-line-then-wave double divider; benefits the homepage too). Tightened oversized section padding.

---

## v6 — Product pages polish (2026-05-20)

- **6.1** Catalog (`/products/`) rebuilt. Hero headline drops the italic-serif `<em>` accent. Lede + filter chips rephrased with no em-dashes. Filter chips now show per-category counts. Sections alternate bone / cream with wave dividers between them. Cards render real product packshots (46 of 46 wired from the content collection's `image` field; one mono fallback for the unimported Köfte). Card tagline drops italic-serif. `<DistributorCTA>` appended at the bottom.
- **6.2** Detail (`/products/[slug]/`) rebuilt. Real packshot in the media slot with a drop-shadow lift. 4-cell facts grid (Unit weight, Certification, Origin, Packaging). Tagline drops italic. Removed `.rule-gold` element from the note. Added a `More from the {category}` strip — up to 4 related products from the same category on a cream band. Distributor CTA appended at the bottom. Page now lazy-prefetches related images via `loading="lazy"`.
- **6.4** Catalog hero restructured into a tight two-column grid: title + chips left, stats aside right (total SKU count, halal status, EU shipping, food-safety standards), plus a primary CTA for the full catalogue. Hero top padding cut from 80–140 px to 40–72 px so the first row of products appears above the fold on a 1440×900 desktop. Filter chip count badges restyled as gold-bg pills (no parentheses). First category section padding-top removed so it sits flush under the hero.

---

## v5 — Hero video + fixed header (2026-05-20)

- **5.1** Replaced YouTube iframe with a self-hosted `<video>` element pointing to `/public/videos/hero.mp4` (7.14 MB, dünya's aerial footage). All YT API code, postMessage handlers, and iframe oversize hacks removed.
- **5.2** Header gains a transparent-over-hero state. `body.has-dark-hero .site-header:not([data-scrolled="true"])` flips background to transparent, logo gets a drop-shadow, nav / hamburger / secondary CTA switch to bone. 350–400 ms fade transitions. Hysteresis on the scroll listener (ON 40, OFF 12) prevents flicker.
- **5.3** `position: sticky` → `position: fixed` on `.site-header`. `main` reserves `--header-h` space by default; `body.has-dark-hero main { padding-block-start: 0 }` lets the hero extend up under the header. New CSS var `--header-h` with mobile variant (`76px` → `64px` at ≤720 px).
- Hero CSS extracted to `src/styles/hero.css` and imported from `global.css`.

---

## v4 — Two-font discipline + flat-color dark sections (2026-05-19)

- **4.1** YouTube iframe oversized to 240% so chrome sits off-screen. (Superseded in v5 by MP4 switch.)
- **4.2** Removed all radial gradients from Halal and DCTA sections — now flat `--color-emerald-deep`. Wave dividers (also flat) tone-match perfectly.
- **4.3** Footer restored to emerald-deep. `Certifications` moved between `DistributorCTA` and `Footer` so two dark sections never touch.
- **4.4** Footer logo gets `object-fit: contain; align-self: flex-start; height: 90px` to fix the stretch.
- **4.5** Replaced static `TrustStrip` with animated `Marquee`: brand keywords scrolling with gold star separators, 42 s loop, pause on hover, edge fade.
- **4.6** All wave-divider wrappers got a `background-color` matching the section above so the empty SVG region no longer reveals page-body bone. The "small white sliver above Halal" is gone.
- **4.7** Wave divider above `FeaturedProducts` flipped: cream now fills the bottom of the SVG with a wavy top edge.

---

## v3 — Logo + tonal cleanup (2026-05-19)

- **3.1** Footer logo width/height attributes corrected from `150 × 62` (aspect 2.42:1) to `324 × 150` (aspect 2.16:1) — matches the intrinsic PNG (734 × 340).
- **3.2** Radial gradients on dark sections pulled inward (away from edges) to reduce divider seam mismatch. (Superseded in v4 by removing gradients entirely.)
- **3.3** Footer separated from DCTA by switching footer bg to near-black `#0a0f0d`. (Reverted to emerald-deep in v4 once `Certifications` was inserted between them.)
- **3.4** Real certification badges downloaded from `/over-ons/` on the prior site: HALAL (circular dark green), BRC FOOD, IFS FOOD. Wired into the Certifications section alongside text seals for HACCP and ISO 22000.
- **3.5** YouTube hero (initial attempt) added with iframe oversize.

---

## v2 — Typography rebuild + content (2026-05-19)

- **2.1** Crawled the user's prior Hostinger site (`lightyellow-penguin-202886.hostingersite.com`). Extracted product list, image URLs, and contact info.
- **2.2** Downloaded 46 product packshots into `/public/images/products/` via `scripts/download-assets.sh`. Generated one `.md` per product in `src/content/products/`.
- **2.3** Typography overhauled. Dropped Inter Tight + Fraunces-as-italic-accent. Now **Fraunces** (variable serif) for all headings and **Inter** for body. Two fonts only. No italic-serif decoration anywhere.
- **2.4** Removed every em-dash (—) from copy across all components and pages.
- **2.5** Removed the gold `::before` rule on `.eyebrow` — clean uppercase text only.
- **2.6** Hero replaces type-only headline with a video-backed composition. (Used a `<video>` placeholder until v3's YouTube switch.)
- **2.7** Logo sized down: 150 px desktop, ~110 px mobile.
- **2.8** Mobile menu rebuilt as a full-screen sheet with numbered nav. Moved out of `Header.astro` into its own component rendered in `Base.astro` to escape the header's `backdrop-filter` containing-block trap.
- **2.9** Section dividers replaced with SVG wave/curve shapes. Section background alternation introduced.
- **2.10** Real cert badges acquired (carried into v3).
- **2.11** Distributor / sample / contact form copy refreshed.

---

## v1 — Initial scaffold (2026-05-19)

- Astro 5 + Tailwind 4 + TypeScript + React 19 + Vercel adapter project scaffolded. `pnpm` package manager.
- All routes built: `/`, `/products/`, `/products/[slug]/`, `/distributors/`, `/samples/`, `/about/`, `/contact/`, `/legal/{privacy,cookies,terms}/`.
- Homepage sections (v1 order): Hero, TrustStrip, Categories, FeaturedProducts, HalalPromise, Process, Certifications, DistributorCTA.
- Initial design system documented in `docs/03-design-system.md`. (Superseded by `STYLEGUIDE.md` in v5.)
- Content collections set up with Zod schema for products.
- 12 placeholder products generated as fallback. Replaced in v2 by real downloads.

---

## v0 — Discovery (2026-05-19)

- Reference site analysis: `dunyaholding.com`. Sitemap, section-by-section breakdown, IA observations, opportunities to outperform. Saved to `docs/01-reference-analysis.md`.
- User answered strategic discovery questions: standalone Melek brand, B2B distributors primary, NL-based shipping all Europe, EN-first with i18n-ready NL, motion subtle, no fabricated trust numbers.
- Stack recommended: Astro + Tailwind + TS + React islands + Vercel. Approved with "skip Resend for now".
- Logo (`brand_assets/Melek-Halal-Food-Logo-HQ.png`) provided by user. Palette derived: emerald + gold from the logo, charcoal + bone neutrals.
- Brief and stack rationale saved to `docs/02-brief-and-stack.md`.
