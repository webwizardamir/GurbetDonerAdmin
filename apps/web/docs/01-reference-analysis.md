# Reference Site Analysis — dunyaholding.com

> Source for inspiration only. We will not copy branding, assets, copy, or exact visuals.
> Captured: 2026-05-19 via textual crawl (WebFetch). Visual screenshot capture deferred until after stack scaffolding so Puppeteer runs against the same project install.

---

## 1. Company Snapshot (Reference)

| Attribute | Value |
|---|---|
| Sector | Halal frozen poultry & döner kebab manufacturing |
| Model | B2B distributor / private-label exporter |
| HQ Production | Zduny, Poland (ul. Przemysłowa, 23,000+ m² facility) |
| Distribution Hub | Hannover, Germany |
| Operating since | ~27 years experience |
| Capacity | 275 tons / day across chicken, turkey, veal, beef |
| Workforce | 500+ |
| Reach | Europe + worldwide, present at Anuga / SIAL / München trade fairs |
| Certifications | HACCP, Halal, Turkish Food Codex, veterinary control |
| Owned brands | Dünya (flagship), **Melek**, Sahara |

> Strategic note: "Melek" is already a product line within Dünya Holding's portfolio. Our brief is for the standalone Melek brand site, which means our positioning needs to **differentiate Melek as its own premium identity** rather than mirror Dünya's wholesale-catalogue tone.

---

## 2. Sitemap (Reference)

```
/                       Homepage — product spotlights + offer + catalog + about + news
/meet-us/               About — heritage, capacity, certifications, mission/vision
/gallery/               Facility & product gallery
/download/              Catalogs, spec sheets, certificates
/news/                  Trade-show news & corporate posts
/contact/               Two-branch contact (Poland HQ + Germany distribution)
/packaging/             Packaging-format product index (paginated, 8 pages, ~12/page)
/product/<slug>/        Individual product page (×80+)
/our-little-guests/     CSR / community / kids initiative
/tax-strategy-2023/     Governance disclosure (UK-style)
```

Total nav depth is flat (5 top items, max 1 dropdown level). Friction is low — but the IA also feels generic and undifferentiated.

---

## 3. Section-by-Section Homepage Breakdown

| # | Section | Purpose | Pattern Used | Notes |
|---|---|---|---|---|
| 1 | Header | Navigation | Simple horizontal bar w/ logo | No sticky scroll behavior described, no language switch visible on first paint |
| 2 | Featured Product #1 — Chicken Kebab | Spotlight a hero SKU | Split image-left / copy-right | Reads more like a catalog tile than a hero |
| 3 | Featured Product #2 — Chicken Nuggets | Spotlight #2 | Same pattern alternated | Repetition without rhythm shift |
| 4 | Featured Product #3 — Crispy Tenders Hot | Spotlight #3 | Same pattern alternated | Three near-identical sections in a row — flat hierarchy |
| 5 | "Our Offer" | Category selector | 3-column card grid: Packaging / Box / Big | Cards are by **packaging format**, not by use-case or audience — confusing for buyers |
| 6 | Products Grid | Catalog tease | 4×2 product grid, name + weight only | No price (B2B), no badge, no filter |
| 7 | "Global Exporter / Dünya Holding" | Trust & scale | Text + image | Where the heritage story finally appears — too late in the page |
| 8 | Certifications | Trust seals | 4 cert badge images, horizontal | Static — no hover, no detail |
| 9 | News | Activity proof | 2 news cards | "Our Little Guests" + "Tax Strategy 2023" — mismatched in tone |
| 10 | Footer | Contact + nav | Multi-column with PL HQ contact | Single address only — DE branch hidden until /contact/ |

### What works
- Clear product-first orientation.
- Trust signals (capacity, certifications, trade-fair logos) exist on the site.
- Two-language operational reality (PL + DE) signals legitimate European reach.

### What's weak — opportunity for us to outperform
1. **No hero moment.** The site opens with three near-identical product splits. There is no cinematic brand statement.
2. **IA is packaging-led, not customer-led.** Buyers want to filter by "Chicken / Beef / Snacks / HoReCa portion size," not by "Packaging / Box / Big."
3. **Trust signals are scattered and visually flat.** Stats (275 t/day, 23,000 m², 500 staff, 27 yrs) are buried in body copy. Numbers like this are the strongest conversion levers in B2B food and deserve a dedicated animated stat strip.
4. **No clear B2B conversion path.** No "Become a distributor," "Request a quote," "Download catalog" sticky CTA.
5. **Mixed brand voice.** Dünya / Melek / Sahara products co-exist in one grid with no brand framing — a Melek-dedicated site can win simply by being focused.
6. **Typography & rhythm feel templated.** Same section pattern repeated; no scale variance, no editorial moments.
7. **Animations basic.** No scroll-driven storytelling, no parallax, no kinetic typography. Easy to leapfrog with modest GSAP usage.
8. **Mobile experience appears to be a literal stack** of desktop sections; no thumb-zone CTAs, no mobile-first reordering signaled.
9. **News mixes CSR + tax disclosures** — looks unmaintained and erodes credibility.
10. **No language switcher on homepage** despite serving PL/DE/EN/TR markets — large missed SEO/UX opportunity.

---

## 4. Visual & Brand Language (Reference)

- Palette: red/black/white food-industry default — appetizing but unowned, uses common quick-service-restaurant cues.
- Typography: utilitarian sans-serif, no editorial display face.
- Photography: studio product cut-outs on plain backgrounds — clean but not crave-inducing.
- Iconography: certification badges as raster images, not vectorized; can't scale crisply.
- Animation: minimal; static hover on cards.

### Opportunities for Melek's identity
- Shift from "factory red" to a **considered halal-premium palette**: deep charcoal + warm off-white + a single signature accent (champagne gold, saffron, or olive — to be chosen with the user).
- Use **editorial typography** (serif display + clean sans body) to read more like a heritage food brand than a wholesale catalogue.
- Replace stock cut-outs with **steam-rising, ingredient-led, dimly-lit photography** (or AI-direction art if no shoot budget).
- Introduce **subtle GSAP/Framer motion**: marquee of partner logos, scroll-triggered stat counters, sticky section pinning for the "Process" / "Halal Standards" story.

---

## 5. Conversion & CTA Strategy (Reference)

| Surface | CTA | Weight |
|---|---|---|
| Featured products | "SEE PRODUKT" / "SEE PRODUCT" (inconsistent spelling) | Low — informational only |
| Offer cards | "SEE PRODUCT" | Low |
| About strip | "ABOUT US" | Low — leads to a soft page |
| News | "SEE MORE" | Low |
| Header | — | None |
| Sticky / floating | — | None |

**There is no commercial CTA.** No "Request a sample," no "Get pricing," no "Distributor application," no "Download spec sheet." For a B2B brand this is the single biggest missed lever.

**Our site must have**, at minimum:
- Persistent header CTA → "Request a quote" or "Become a distributor"
- Per-product CTA → "Download spec sheet" + "Request sample"
- Footer CTA strip → newsletter + sales contact
- Optional floating WhatsApp/Email button for export buyers in different timezones

---

## 6. Component Inventory We'll Need

- **Header**: logo, primary nav (5 items max), language switcher, primary CTA button, mobile drawer.
- **Hero**: full-bleed editorial moment with kinetic headline, supporting tagline, dual CTA (primary + secondary), scroll cue.
- **Stat strip**: animated counters for tonnage, facility size, markets served, years.
- **Process / "From farm to fork" storytelling**: scroll-pinned section.
- **Product category cards** (Chicken / Beef / Snacks / Foodservice) — replace the "Packaging / Box / Big" IA.
- **Product grid** with filter by category, weight, certification, format.
- **Product detail template** with hero image, nutrition table, certifications, packaging variants, related products, sample-request form.
- **Halal & certifications**: interactive trust panel with each cert's authority.
- **Heritage / About strip**: editorial photo + numbers.
- **Press / News**: editorial grid with categories.
- **Testimonial / partner logo marquee** (chains, distributors, retailers).
- **Contact**: two-office split, embedded map, export inquiry form, downloadable B2B pack.
- **Footer**: deep links, social, certifications, legal, address blocks per office, newsletter.

---

## 7. Opportunities to Outperform — Top 10

1. Open with a **cinematic brand statement** ("Halal, perfected. Crafted in Europe, served worldwide.") instead of a product tile.
2. Replace packaging IA with **buyer-intent IA** (Retail / HoReCa / Distribution / Private label).
3. Front-load **trust numbers** in a single animated strip.
4. Add a dedicated **Halal Promise** section that names the certifying authority, audit cadence, and traceability.
5. Build a **proper product page template** with downloadable spec sheets, packaging variants, and pallet-load info — what B2B buyers actually need.
6. Implement **multilingual SEO** out of the gate (EN / DE / PL / TR / FR / AR all reasonable).
7. Convert certifications from static badges to **named, dated, click-through credibility cards**.
8. Add a **distributor / private-label application flow** (lead form with country + volume).
9. Use **scroll-driven motion sparingly but distinctly** (e.g., one signature kinetic moment on the hero, one pinned process scene) — enough to feel premium, not so much it feels showy.
10. **Performance budget**: Lighthouse 95+ across the board. Reference site appears unoptimized; an Astro/Next-Image stack will beat it on its own merits.

---

## 8. Risks to Avoid in Our Build

- Don't over-animate. The reference is under-animated; the temptation will be to overcorrect.
- Don't go luxury-cold. Food still needs to feel warm and crave-worthy. Premium ≠ minimalist-to-the-point-of-clinical.
- Don't over-IA. Reference has too few categories; we shouldn't swing to 12. Aim for 4–6 strong groupings.
- Don't ship a generic green/gold "halal" palette. Choose intentionally.
- Don't forget Arabic / RTL support if Middle East is a target market — this is a structural decision that costs more to retrofit.
