# Melek — Changelog

One-line entries per ship. Most recent at the top. "v" is an iteration label, not a release version.

---

## v11 — Header "Inloggen" (customer portal link) (2026-06-28)

- **Replaced the "Become a distributor" header CTA with "Inloggen"** so existing wholesale customers can reach their portal login. Links to `site.portalUrl` (`https://app.melekhalalfood.nl/portal/login`, new field in `site.ts`). Updated `Header.astro` (desktop CTA) and `MobileMenu.astro` (mobile CTA); "Request samples" stays, the nav "Distributors" page link stays. (The portal itself — a separate admin app — got document downloads + a security fix the same day.)

---

## v10 — Packaging/Box categories + real contact info + go-live (2026-06-25)

Site moved into the **`MelekHalalFood` monorepo** at `apps/web` and went live on **melekhalalfood.nl** (+ www); admin app on `app.melekhalalfood.nl`. `site.ts` `indexable` is still `false` (noindex) — flip to `true` when ready for Google.

- **Products recategorized by format: Packaging (retail) / Box (bulk).** Replaces the visible meat categories (chicken/beef/snacks) in the header dropdown, catalogue (`/products/`), homepage "What we sell" rails, footer and product-detail breadcrumb. Meat type is kept **only as a hidden secondary sort**, so each grid clusters chicken → beef → snacks with no meat labels. New `format` field on products (`content.config.ts`, default `packaging`); 8 products tagged `box`. New shared `lib/products.ts` `getProductsByFormat()` (used by catalogue + homepage). Header gains a Products dropdown; mobile menu + footer updated.
- **Real contact info** (was an Amsterdam placeholder): **Weversbaan 8a, De Baanderij, 2352 BZ Leiden · 071 200 1287 · "Closes at 17:00 (CET)"**. Updated `site.ts`, footer, contact page (now shows phone + hours), mobile menu/CTAs, and the Organization JSON-LD (added `telephone`).
- **"HoReCa" → "Horeca"** everywhere (Dutch convention).

---

## v9 — Lighter, friendlier homepage + Clash Display (2026-05-26, IN PROGRESS)

Owner feedback after v8: the Bodoni headings read too formal/AI, and the all-dark site felt too heavy for a food brand. Two changes, homepage first so the owner can confirm before rollout.

- **9.15 ProductionStory → interactive walk-through (owner: the section felt "dead").** Replaced the scroll-pinned cross-dissolve with a click-driven tabbed sequence: a clickable step list (left, accent-rail active state) drives a cross-dissolving facility still (right); the active step auto-fills a thin emerald progress bar that hands over to the next step (autoplay), and click / arrow keys / Home-End all steer it. Pauses while hovered (pointer devices) or off-screen; reduced-motion drops autoplay + the zoom and keeps it fully clickable. Built as a proper `role="tablist"` with roving tabindex. No step numbers, no boxed panel, stays on the `light` scene palette + Simplicity Pro. (Adapted the idea from a 21st.dev `Features` component; rewritten from its React/framer-motion/Next into our Astro + vanilla-TS idiom and brand.)
- **9.13 Adopt the reference-site brand (colours + font + marquee).** Owner pointed to a built reference (lightyellow-penguin…hostingersite / melekhalalfood) and asked to use its colours, its font, and its under-hero marquee.
  - **Font → Simplicity Pro (Semplicita Pro), self-hosted.** Downloaded the woff2/woff/ttf from the reference into `/public/fonts`; `@font-face` (400 woff/ttf, 400 italic, 500, 600–800→Bold) in `global.css`. All font tokens (`--font-display/--font-sans/--font-grotesk-x`) point to it — **one face for headings and body**. Removed the Google Fonts (Manrope/Archivo) link + preconnects; added font preloads in `Base.astro`.
  - **Colours → reference palette.** `--color-emerald #0f5132 → #4f7f47` (medium green), `--color-emerald-deep / --color-emerald-black → #00300C` (forest green: headings on light, header/hero), `--color-emerald-soft → #588d4f`; `--color-snow → #FDFCF4` (warm cream, owner-chosen over pure white); added `--color-lime #A9DD72` and **remapped `--color-gold` + `--color-brass` to lime** so token-driven accents (header underline, hero bead, focus ring) follow the reference; sage panels/hairlines; `--scene-title` on light → forest green. Bulk-replaced the hardcoded old-emerald (`rgba(15,81,50)`) and brass tints across the rendered components to the new green/lime.
  - **Cert marquee.** New `CertMarquee.astro` — a medium-green band with cream uppercase labels + lime stars, scrolling **Halal · BRC · IFS · HACCP · ISO 22000** in a seamless loop (reduced-motion: static, centred). Placed directly under the hero on the homepage; **removed `TrustArtifacts`** (the cert section) from the homepage since the marquee carries it. (About still has `TrustArtifacts` for now.)
- **9.14 Marquee icons, sell-not-make, tighter spacing.**
  - **Marquee = icon chips.** Each cert is now a white circular **icon chip** (real badge logo for Halal/BRC/IFS, a check icon for HACCP/ISO 22000) + label, so the logos read on the green band (they're mixed green/white-bg and would otherwise clash/blend).
  - **Sell, not make.** Melek **sells/supplies**, it does not manufacture. "What we make" → "What we sell"; the about hero/manifesto reworded to sell/supply; ProductionStory reframed from "How it's made" (Sourcing/Making/Checks/Delivery) to **"From source to freezer"** (Sourced/Selected/Checked/Delivered). Recorded the rule in STYLEGUIDE §7 + CLAUDE.md.
  - **Less white space.** Cut the per-section vertical padding roughly in half — `--section-y` `clamp(56px,8vw,104px)→clamp(40px,5.5vw,76px)` (+ `-sm`), and the big per-component `--scene-pad`s (about manifesto/principles/tour/gallery, ExportCTA, TrustArtifacts, ProductWorlds, ProductionStory, cat-range) down to ~`clamp(2rem,4vw,3.25rem)`. Tightens desktop and mobile.

- **9.12 Content simplification + factual fix (owner pass).** Copy was too harsh / hard / AI-ish, too much of it, and over-insisting on being good and certified.
  - **Food is not made in the Netherlands** → removed every "made / produced / frozen in the Netherlands" and "Amsterdam" production claim (Hero, ProductionStory, ProductWorlds, products catalog/detail, about, footer copyright, site description). NL stays only as the company base + contact address; "shipped across Europe" kept. (`OperationalStrip`, `Marquee` still hold the old NL line but are now unused/unrendered.)
  - **Plainer, shorter copy, no insisting** across the site (hero lede, ProductionStory → "How it's made" with 4 plain steps, ProductWorlds → "What we make", TrustArtifacts → "Certifications." + "Certificates are available on request.", ExportCTA → "Want to stock Melek?", about hero/manifesto/principles, product copy, footer intro, category descriptions).
  - **Leaner homepage**: removed `OperationalStrip` (the "46 SKU" proof band) and `HalalConfidence` (the cert-commitments block) from the homepage; reordered to Hero → ProductionStory → ProductWorlds → TrustArtifacts → ExportCTA; fixed the hero scroll cue target (`#proof` → `#story`). Removed `HalalConfidence` from About too (now fully unused) since certs are covered by the principles + the minimal TrustArtifacts row.
  - **Nav**: added **Home** to `site.nav` (deduped the mobile menu's manual prepend).
  - **Footer**: removed the "Halal frozen food, made in the Netherlands. Shipped across Europe." masthead statement; de-claimed the intro and the © line.
  - **Docs**: rewrote the STYLEGUIDE §1 voice + §7 writing rules and the CLAUDE.md writing rules — plain/friendly voice, do-not-insist, no production-location claim, expanded banned-phrasing list.

- **9.11 Owner polish pass (font, white, header, hero, story).**
  - **Heading font → Manrope.** Replaced Clash Display with **Manrope** (owner's pick) via a single Google Fonts request (`Archivo` + `Manrope`); removed the Fontshare link/preconnect. `--font-display` → Manrope. Body stays Archivo.
  - **Pure white canvas.** `--color-snow` `#f7f6f3` → `#ffffff` (owner: the warm off-white still read beige). The emerald glow + weave keep light scenes from feeling clinical; emerald-tinted panels/footer and white cards still read against it.
  - **No green flash on load.** `theme-color` was `#0f5132` then briefly `#051a10` (which itself was the dark-green load flash); set to `#ffffff`. Also moved the base `body` background off bone → snow so unclassed pages don't flash beige.
  - **Greeny header everywhere.** Extended the homepage's emerald-black header to all `body.page-light` pages (greeny bar at all scroll positions, light contents), so the header is consistent site-wide instead of bone on inner pages. Legal pages put on `page-light` too.
  - **Hero re-centred.** With the kicker/coords/ledger gone, the headline block is now vertically centred and the scroll cue is a centred bottom indicator (dropped the lonely full-width divider).
  - **ProductionStory reworked.** Kept the sticky cross-dissolve but removed the `01/02` step numbers, killed the half-screen dead space, dimmed inactive beats so the active one lights up with an emerald rail, added a dynamic step label + progress bar on the image and a lede beside the heading, and brightened the footage.

- **9.9 Strip the eyebrow kickers + hero fact ledgers (site-wide, owner request).** Removed the floating `.op-label`/`.eyebrow` pre-headings that sat above section headings on every page (Hero, OperationalStrip, ProductionStory, ProductWorlds, HalalConfidence, ExportCTA, TrustArtifacts, about ×5, products, contact, distributors, samples, product detail, legal ×3) and the footer "Made in the Netherlands / Shipped EU-wide / Halal·BRC·IFS" ops chips and the mobile-menu "Menu" label. **Kept** functional labels (breadcrumbs, product-tile meta, photo/cert captions, contact-method labels, the hero "Scroll" cue, "Get in touch"). Removed the hero **fact ledgers** on the homepage (Origin/Distribution/Certified/Range — which also surfaced "46 SKU", a rule violation) and the about hero facts grid (kept the lede); dropped the now-unused `ledger`/`facts` consts. **Open:** the OperationalStrip still shows the "46 / SKU across three ranges" band (same SKU-count info) and the `/products/` catalog hero still has its facts aside — both left as-is pending owner confirmation since they were out of the stated scope.
- **9.10 Mobile carousel scroll affordance.** With the scrollbar hidden until interaction, the rails didn't read as scrollable. Added a right-edge **fade mask** on mobile to the homepage ProductWorlds rails, the `/products/` + related `.cat-grid`, and the about facility strip, plus a one-time **swipe-nudge** animation on the homepage rails (reduced-motion gated) so the motion signals swipeability.

- **9.1 Headings → Clash Display.** Replaced Bodoni Moda with **Clash Display** (Fontshare CDN in `Base.astro`); Archivo kept for body. `--font-display` updated; type helpers retuned for a grotesk (tighter tracking, weights 600/700, dropped the Bodoni `opsz` settings). Applied site-wide.
- **9.2 Light-dominant homepage.** Added `--color-snow #f7f6f3` (clean near-white, not beige) + `--color-line-soft`, and a `data-scene="light"` theme (emerald `--scene-title`, soft emerald/brass radial glow + faint diagonal weave `::before`). Gave the scene components a `scene` prop so the page controls theme per instance. Homepage `index.astro` passes `scene="light"` to OperationalStrip / ProductionStory / ProductWorlds / HalalConfidence; Hero + ExportCTA + TrustArtifacts + Footer stay dark as punctuation. Emerald headings on light, white product tiles (`.worlds[data-scene="light"]`), tightened scene padding so the light sections no longer feel marooned. Reference: dunyaholding's warm off-white + coloured headings + faint watermark.
- **Hero headline** changed earlier this pass to "Everybody loves / Melek Halal Food." (two fixed lines).
- **9.3 Lower sections reworked light, one boxed.** Kept the body light and reworked the bottom of the homepage (dunya products-block reference) so the scroll stays varied. Added `--color-panel #e9efe9` / `--color-panel-deep #e0e8e1` (soft emerald tints, not grey) and a reusable `.scene-panel` primitive in `global.css`: tinted bg, padding, `--radius-xl` corners, a layered decorative shape (two emerald blobs + a thin brass arc) anchored top-right behind content, soft lift shadow; the light body shows in the gutters around it. **ExportCTA** flipped from dark (`char`) to `data-scene="light"` and is the **single** boxed section (`.scene-panel--deep`), with emerald heading, `btn-secondary`, `grain--dark`.
- **9.3a Owner refinement.** "One box is enough" for variety, so **TrustArtifacts** is un-boxed: plain light scene, same body as the scenes above. Rebuilt it **minimalist** — kept the "Verification" eyebrow + "Every claim has a document behind it." headline + the right-side aside, then a single hairline-separated **row of certification marks** (logo, or emerald text seal for HACCP/ISO 22000, with a short caption), fitting one line on desktop; dropped the per-cert record cards / refs / stamps. With certs un-boxed, the tinted **footer** becomes the distinct "special" ending. Footer lightened to the `--color-panel` tint with dark ink, **gated on `body.has-dark-hero`** so still-dark inner pages keep the dark footer; `logo.png` is full-colour on transparency, no swap.
- **9.3b Continuous weave.** The diagonal weave watermark restarted at every section, so the lines didn't meet across seams. Switched `.scene[data-scene="light"]::before` to `background-attachment: fixed` so the tile is anchored to the viewport and stays continuous across section boundaries (mobile browsers that ignore fixed keep the old per-section behaviour).
- **9.4 Mobile menu → light.** Owner approved the bottom-of-page rework, then asked to bring the mobile menu in line. `MobileMenu.astro` flipped from the flat emerald-black overlay to the light system: snow bg with the same emerald/brass radial glow, `.grain--dark` tooth, **Clash Display** nav labels in charcoal with emerald hover + emerald arrows, light hairlines, `.btn-secondary` for the secondary CTA. Header needs no change — it sits at `z-index:50` under the menu's `z-index:70`, so the open menu fully covers it and uses its own close button.
- **9.5 Docs.** Rewrote `docs/STYLEGUIDE.md` to the v9 light-dominant system (light canvas/ink + emerald + dark-as-punctuation, Clash Display, `data-scene="light"` + `--scene-title`, the `.scene-panel` boxed motif + one-box rule, minimalist cert row, light footer/menu, continuous weave, light migration steps). Corrected the stale hard rules in `CLAUDE.md` (Bodoni→Clash, dark-cinematic→light-dominant, palette, boxed-panel rule).
- **9.6 Products catalog + single-product → light.** Migrated both `/products/` pages off the dark v8 build into the light system. Added `body.page-light { background: --color-snow }` and switched both pages from `has-dark-hero` to `page-light` (so they use the default opaque-bone header + the standard `main` header offset, instead of a transparent header over a now-absent dark hero); dropped the manual `calc(--header-h + …)` hero padding accordingly. All scenes flipped to `data-scene="light"`, `grain--dark`, emerald headings (`--scene-title`) on the catalog H1 / range names / product title / related title, and `btn-secondary` instead of `-light`. Product packshot tiles (catalog grid, single-product hero media, related rail) repainted from the dark `char-900` + brass-spotlight tile to the homepage's **white tile + faint emerald wash + soft lift**; the single-product hero packshot shadow softened from heavy black to a light tint. The shared `ExportCTA` at the bottom of each page is already the light boxed CTA, so it serves as each page's single `.scene-panel` box. Other pages return 200; catalog + two detail pages verified.
  - **Footer fix:** the light footer + the hidden bone wave curve were gated only on `body.has-dark-hero`, so the new `page-light` product pages fell back to the dark footer with the curve. Broadened every footer rule to cover both page types. **Astro scoping gotcha:** `:is(body.has-dark-hero, body.page-light) …` compiles to `[data-astro-cid]:is(…)`, which requires `<body>` to carry the component scope attribute (it never does), so the rule silently never matches. Write it as **`body:is(.has-dark-hero, .page-light) …`** — Astro recognises the leading `body` as a root element and leaves it unscoped, so it matches. Light inner pages now get the matching light footer + clean cut; legacy bone pages keep the dark footer + wave until migrated.
- **9.7 About page → light + a lighter hero experiment.** Migrated `/about/` off the dark v8 build: `body.page-light`, every scene (hero, manifesto, principles, virtual tour, facility gallery, video) flipped to `data-scene="light"` with `grain--dark`, emerald headings (`--scene-title`), light frame backgrounds (`--color-panel`) on the tour/video/iframe, and the facility-gallery duotone softened (`brightness 0.72 → 0.92`) so the placeholders don't read murky on snow. `HalalConfidence` now gets `scene="light"`; `TrustArtifacts` + `ExportCTA` were already light. Footer is light via the `page-light` gate.
  - **New hero treatment (for review).** Owner: the dark video hero felt heavy on the lighter site and the about + homepage heroes looked identical. The about hero is now a **light editorial hero** — eyebrow + emerald `text-mega` headline + lede + facts on snow, with the brand film in a **wide rounded feature window** (16:7, soft emerald lift shadow) instead of a full-bleed dark video under a heavy veil. New video downloaded to `/public/videos/about-hero.mp4` (the lower "Inside Melek" block still uses `hero.mp4`). The **homepage hero is unchanged** pending the owner's call on whether to roll this lighter treatment there too.
- **9.7a About gallery contained.** Owner flagged the "Where it comes together" facility film-strip as full-bleed while everything else is contained. Wrapped the carousel in `.container-x` (and dropped its own gutter padding) so it boxes to the standard 1280 width like the product rails.
- **9.8 Form pages → light (distributors, samples, contact).** Migrated the last three content pages off the legacy bone/Fraunces build into the light system: `body.page-light`, each wrapped in a `.scene` `data-scene="light"` (snow + glow + weave + `grain--dark`), `.op-label` eyebrows, emerald `.text-display` headings. **Removed the italic-serif `<em>` accents** (a hard-rule violation; `--font-serif` no longer exists) by folding them into single emerald headlines. Forms now sit in **white cards** (line-soft border + soft emerald lift shadow). Updated the shared input primitives in `global.css`: `.input/.textarea/.select` → white bg + `--color-line-soft` border + slate placeholder (emerald focus ring already present). Footer is light via the `page-light` gate. Copy cleanup: dropped the banned "curated assortment"/"curated sample box" phrasing and the em-dash in the distributor lede. Whole site (home, products, detail, about, distributors, samples, contact) is now on the light system; only the placeholder `/legal/*` pages remain on the legacy bone build.
- **NEXT:** the whole site is on the light system (Manrope, pure-white, greeny header). Open/flagged: OperationalStrip still shows the "46 SKU" band; legal pages still have placeholder copy (await counsel). Optional: lighter feature-window hero on the homepage (owner deferred). See `PLANNER.md`.

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
