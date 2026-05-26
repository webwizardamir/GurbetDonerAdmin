# Melek — Planner

Snapshot of where the project is, what is locked in, and what is left. Update this file at the end of any working session so the next pickup is fast.

Last updated: 2026-05-26 (homepage moving to light-dominant + Clash Display headings; WORK IN PROGRESS).

**Current direction (v9, in progress): lighter homepage + new heading font.**
- All four core pages (home, products, product detail, about) were migrated to the dark cinematic system in v8.
- The owner then asked for two changes: (a) replace the Bodoni Moda headings with **Clash Display** (Fontshare; Archivo kept for body) — done site-wide via `--font-display`; (b) the site felt **too dark** — so the **homepage** now runs **light-dominant**.
- Homepage layout now: **dark** Hero + **dark** ExportCTA / TrustArtifacts / Footer as punctuation; the four middle scenes (OperationalStrip, ProductionStory, ProductWorlds, HalalConfidence) flipped to **light** via a `scene` prop (`scene="light"` passed from `index.astro`). Light scenes use `--color-snow #f7f6f3` (NOT beige) with a soft emerald/brass radial glow + a faint diagonal weave (`.scene[data-scene="light"]` + `::before` in `global.css`), **emerald headings** (`--scene-title`), and **white product tiles** (`.worlds[data-scene="light"] .worlds__media`).

### NOT DONE — pick up here next session
1. **The lower dark containers still need rework** — the owner does not like ExportCTA / TrustArtifacts / Footer as they are now (too dark against the lightened page). Rework them (likely lighten/restyle, or a different treatment) so the bottom of the homepage matches the new lighter feel.
2. **Roll the light-dominant theme + Clash to the other pages** (products, product detail, about) — they are still fully dark. Each scene component already takes a `scene` prop; pass `scene="light"` where appropriate and adjust.
3. Then the **form/legal pages** (distributors, samples, contact, legal) — still legacy bone.

### Locked decisions
Clash Display (headings) + Archivo (body). Light-dominant homepage (near-white `--color-snow`, not beige). Emerald headings on light. Tagline kept ("Halal, perfected. Crafted in Europe."). City = Amsterdam. Product tiles: dark on dark scenes, white on light scenes.

---

## 1. Locked-in decisions

| Decision | Status |
|---|---|
| Brand: Melek (standalone, not Dünya sub-brand) | ✅ locked |
| HQ: Netherlands; reach: all Europe | ✅ |
| Audience: B2B distributors / importers primary | ✅ |
| Languages: EN first, NL later (i18n-ready) | ✅ |
| Visual tone: dünyaholding family, cleaner | ✅ |
| Motion: tasteful and subtle | ✅ |
| Trust signals: certs only, no fabricated capacity numbers | ✅ |
| Content store: file-based Markdown in `/src/content/products/` | ✅ |
| Hosting: Vercel (EU edge), MP4 / images self-hosted in `/public/` | ✅ |
| Stack: Astro 5 + Tailwind 4 + TS + React islands + Vercel | ✅ |
| Typography: Fraunces (headings) + Inter (body), 2 fonts only | ✅ (v2) |
| No em-dashes anywhere in copy | ✅ (v2) |
| No italic-serif accents inside heading sans | ✅ (v2) |
| Logo aspect ratio: 2.16:1 (intrinsic 734 × 340) | ✅ (v3) |
| Hero background: **MP4 only**, not YouTube | ✅ (v5) |
| Header: `position: fixed`, transparent over hero, fades on scroll | ✅ (v5) |
| Section alternation prevents two dark sections touching | ✅ (v4) |

---

## 2. Section order (homepage)

v8 rebuilt the homepage into a fully dark-cinematic flow. The whole page is dark now (no beige seam). Scenes 01-04 + TrustArtifacts are bespoke; HalalPromise + DistributorCTA are legacy components running dark with wave dividers off (`dividers={false}`) until their bespoke rebuilds.

```
01 Hero               (cine-hero, emerald-black, MP4, Bodoni masked headline)        NEW v8
02 OperationalStrip   (char-900, brutalist proof band)                               NEW v8
03 ProductionStory    (emerald-black, sticky facility cross-dissolve)                NEW v8
04 ProductWorlds      (emerald-black, per-range horizontal packshot rails, boxed)    NEW v8
   HalalConfidence    (emerald-deep, editorial statement + serif definition list)    NEW v8
   ExportCTA          (char-900, bold CTA + inline process flow)                     NEW v8
   TrustArtifacts     (emerald-black, certs as pale inspection-record cards)          NEW v8
   Footer             (emerald-deep)                                                  legacy, rebuild as brutalist
```

The whole homepage is now bespoke dark scenes except the Footer. Legacy `Process` was dropped (redundant with ProductionStory). `HalalPromise` → `HalalConfidence`, `DistributorCTA` → `ExportCTA`, `Certifications` → `TrustArtifacts` are homepage-only swaps; the shared legacy `HalalPromise`/`DistributorCTA`/`Certifications` components are untouched and still serve the About + products pages with their bone/wave behaviour.

---

## 3. What's complete (homepage)

- [x] Hero with MP4 video, transparent floating header, fades to opaque on scroll
- [x] Animated marquee with brand keywords
- [x] Categories with real product images per card
- [x] Featured products grid pulled from content collection
- [x] Halal Promise (flat emerald-deep, no edge gradients)
- [x] Process section with quick-stats and animated rule
- [x] Distributor CTA panel with 3-step list
- [x] Certifications with real badges (HALAL, BRC, IFS) + text seals (HACCP, ISO 22000)
- [x] Footer with proper logo proportions
- [x] Full-screen mobile menu (lives in Base layout, outside backdrop-filter)
- [x] All wave dividers tone-matched with bg-color wrappers
- [x] 46 product packshots downloaded and content files generated

---

## 4. What's complete (other pages)

These exist and return 200, but they were built before the v2+ design polish and **still use the older patterns**:

| Route | Built | Needs v2+ polish |
|---|---|---|
| `/products/` | ✅ v6 | catalog now uses real packshots, no em-dashes, no italic accents, alternating bone/cream bands with wave dividers, distributor CTA at bottom |
| `/products/[slug]/` | ✅ v6 | real packshots wired, 4-cell facts grid, related-products strip from same category, distributor CTA at bottom |
| `/distributors/` | ✅ | em-dashes in form copy, header offset works fine |
| `/samples/` | ✅ | em-dashes in copy |
| `/about/` | ✅ v7 | rebuilt: hero, Melek-way cards, Google Street View virtual tour, video block, facility gallery (duotone placeholders), reused halal/process/certs/CTA. Gallery photos + Street View location are dunya placeholders to swap. |
| `/contact/` | ✅ | em-dashes in body |
| `/legal/{privacy,cookies,terms}/` | ✅ (placeholder) | needs real legal copy from counsel |

**These pages are still the legacy bone/cream + Fraunces system and now need full v8 migration**, not just copy polish. Rebuild them into the dark cinematic system per `STYLEGUIDE.md §9`: dark scenes, Bodoni + Archivo, editorial primitives, brass accents, dark cuts (no wave dividers), uniform packshot tiles with spotlight, documentary copy, no scene numbers, no SKU counts. Order: products catalog → product detail → about → forms.

---

## 5. Open TODOs (priority order)

1. **Rebuild the Footer as a brutalist export terminal** (coordinates, shipping regions, batch/warehouse metadata, system feel) — the last non-bespoke piece of the homepage. It is global in `Base.astro`, so either make it homepage-aware or build a homepage-specific footer.
2. **Optional extra scenes** from the brief, if the owner wants more depth: appetite/texture intermission (needs macro food photography), retail-readiness, packaging + logistics system. The homepage already reads as a complete cinematic flow without them.
3. **Confirm remaining copy claims with the owner**: city is **Amsterdam** (owner confirmed, OK to name). Still open: is HACCP certified/auditable enough to state beyond a text seal? Any real traceability metric? Until confirmed, keep those generic.
4. ~~Replace `site.tagline`~~ — owner confirmed the current tagline is good; keep it.
5. **Source cinematic photography** the redesign wants but does not have: macro/appetite food close-ups, steam/sizzle b-roll, production-line video, a photographic film-grain overlay, real (non-dunya) facility imagery.
6. **Remaining internal pages polish** — apply v2+ typography and copy rules to `/distributors/`, `/samples/`, `/contact/`. Drop em-dashes, drop italic accents, remove eyebrow rules. (`/products/`, `/products/[slug]/` shipped in v6; `/about/` shipped in v7.)
2. **Real cert authority names** — user needs to confirm halal authority (HFCE? HQC? Halal Correct NL?) and any HACCP / IFS / BRC / ISO certificate dates so we can show them as named, dated trust marks.
4. **Real production-facility video** — user is replacing `/public/videos/hero.mp4` (currently dünya's aerial footage) with brand-owned footage. Just drop a same-name file in place.
5. **Dutch (NL) locale** — scaffold the `/nl/*` route tree. Copy is empty until user provides translations.
6. **Resend (or alternative) form delivery** — currently forms log + show a thank-you panel. Wire to a real inbox when the user provides credentials.
7. **Legal copy** — privacy / cookies / terms pages are draft placeholders. Counsel review needed before launch.
8. **Distributor / partner logos** — if the user can share logos of existing distributors, add a marquee or grid for credibility.
9. **Sitemap + robots** — Astro Sitemap integration is installed but not customised. Verify it builds correct URLs.
10. **OG image** — `/og-default.jpg` referenced but not yet created. Needs a brand OG card.

---

## 6. Assets the user is providing later

- Final hero video (replace `/public/videos/hero.mp4`)
- Real cert PDFs / images per authority (drop into `/public/images/certifications/`)
- Logo variants if needed (currently one PNG handles all surfaces)
- Distributor / retailer partner logos
- Any product photography updates

---

## 7. Versions / iteration history

See `CHANGELOG.md` for the full log. Short version:

| Version | Theme |
|---|---|
| v1 | Initial scaffold, all sections, default typography (Inter Tight + Fraunces italic) |
| v2 | Typography rebuild (Fraunces + Inter), em-dashes removed, eyebrow rule dropped, mobile menu rebuilt, real product images wired |
| v3 | Logo aspect fixed, wave divider directions corrected, footer separated from DCTA |
| v4 | Flat-color dark sections so wave dividers tone-match, Certifications moved between DCTA and Footer, marquee replaces trust strip |
| v5 | YouTube swapped for MP4, header switched from sticky to fixed with `has-dark-hero` body gate |
| v6 | `/products/` catalog and `/products/[slug]/` detail rebuilt to match v2+ rules (real packshots, no italic accents, no em-dashes, alternating bands, related-products strip, distributor CTA) |
| v7 | `/about/` rebuilt with Google Street View virtual tour, video block, facility gallery (emerald-duotone placeholders), Melek-way value cards, reused homepage sections |
| v8 | Anti-AI cinematic homepage, vertical slice. New faces (Bodoni Moda + Archivo), dark scene-theming system, scenes 01-04 rebuilt (hero, OperationalStrip, ProductionStory, ProductWorlds). Three old hard rules overridden; lower sections still legacy. |

---

## 8. How to resume

1. Start the dev server: `pnpm dev` (or it's already running).
2. Take a fresh screenshot pass: `node scripts/screenshot.mjs` (writes to `temporary_screenshots/v5/` by default; set `SHOTS_DIR` env var to bump version).
3. Read this file, `STYLEGUIDE.md`, and `ARCHITECTURE.md` before touching code.
4. Pick the highest-priority TODO from §5 unless the user directs otherwise.
5. After changes: re-screenshot, present to user, then update this file's §3/§4/§5 to reflect what shipped.

---

## 9. Conventions for picking up work

- One small testable change per turn, not five.
- After any visible change: screenshot before presenting.
- After every successful change: mark the relevant task `completed` and update this file's checklists.
- Never invent statistics (capacity, years, employee counts) — the user said no fabricated trust signals.
- Never add a third font family. Never reintroduce italic-serif accents inside heading sans.
- Never use em-dashes in body copy.
