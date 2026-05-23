# Melek — Brief & Recommended Stack

## 1. Finalized Brief

| Item | Decision |
|---|---|
| Brand | **Melek** — standalone halal food brand (no parent group co-branding) |
| HQ / Origin | Netherlands |
| Shipping reach | All of Europe |
| Primary audience | B2B distributors / importers |
| Product categories | Chicken (kebab, nuggets, tenders, wings, schnitzel) · Beef (kebab, cevapcici, köfte, burgers) · Snacks (mozzarella sticks, kipcorn, jalapeño) |
| Languages | EN at launch · NL later (i18n-ready from day one) |
| Visual tone | Same family as dunyaholding.com but **cleaner, more sophisticated, more premium** — food-industry conventions executed at a higher level, not luxury-cold |
| Motion | Tasteful & subtle (scroll reveals, animated stat counters, marquee partners, soft hovers) |
| B2B features | Distributor application form · Sample request flow · Per-product detail pages |
| Trust signals | Halal certification + named authority · Food safety certs (HACCP / IFS / BRC / ISO). **No fabricated capacity numbers.** |
| Content store | File-based (Markdown/MDX in repo, populated from `/content/products/*.md`) |
| Hosting | Vercel (EU edge) |
| Brand assets | User provides logo. Palette proposed and approved before applied. |

## 2. Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 5** | Content-led, static-first, ships zero JS by default → Lighthouse 95+ out of the box. Built-in Content Collections perfectly match a `/content/products/*.md` model. Native i18n routing. Vercel adapter ships in one line. Server endpoints (Astro Actions) handle the distributor + sample forms without a separate backend. |
| Styling | **Tailwind CSS 4** | Industry-standard utility CSS, fast to iterate, easy to maintain a design system via CSS variables. Pairs cleanly with Astro. |
| Interactive islands | **React 19** (only where needed) | For the contact/sample forms, language switcher, mobile menu. Astro lets us keep the rest of the site as zero-JS HTML. |
| Motion | **GSAP + ScrollTrigger** for hero/process scene · CSS + `@media (prefers-reduced-motion)` for the rest | One small GSAP bundle, used surgically. No Framer Motion needed at this motion level. |
| Forms | **Astro Actions → Resend API** | Submissions hit a server endpoint, validated with Zod, emailed to sales via Resend. No third-party form lock-in. Add reCAPTCHA v3 / Cloudflare Turnstile if spam appears. |
| Images | **Astro `<Image>` + Sharp** (build-time) | Automatic AVIF/WebP, lazy-loading, responsive `srcset`. No runtime image service required. |
| Icons | **Lucide** (tree-shaken SVG) | Clean, neutral, consistent. |
| Type system | **TypeScript strict** throughout | Catch broken product frontmatter at build, type-safe routing. |
| Content authoring | **Markdown + MDX** | Plain `.md` for product specs; `.mdx` if you ever want richer editorial pages (recipes, case studies). |
| SEO | Native Astro: sitemap, RSS, structured data, OG images, robots.txt | Built-in plugins; nothing extra to maintain. |
| Hosting | **Vercel (EU regions)** | First-class Astro support, EU edge for NL/EU latency, preview deploys per branch, serverless functions for the forms. |
| CI / DX | Prettier · ESLint · `tsc --noEmit` · Lighthouse CI on PR (optional) | Standard guardrails. |

### Why Astro over Next.js for this project

- The site is **>90% content + product catalog**, ~10% interactive (forms, menu). Next.js's server-component model is overkill — Astro ships almost no JS for static parts, which directly beats Next on Lighthouse and Core Web Vitals for this use case.
- Content Collections (typed markdown) is a perfect match for a product list. In Next we'd hand-roll equivalents or add Contentlayer.
- Build is a static deploy → infinitely cacheable on Vercel's edge.
- If we ever need full SSR personalization (e.g., per-distributor pricing portal), Astro supports SSR + adapters too — but we don't pay for it today.

### Why not a CMS yet

Decision was already made (file-based). The right time to add a CMS is when 2+ non-developers are editing weekly. Until then, markdown in a repo is faster, free, and version-controlled.

## 3. Site Architecture (Proposed)

```
/                          Homepage
/products/                 Catalog landing (filter by category)
/products/chicken/         Category page
/products/beef/
/products/snacks/
/products/[slug]/          Product detail (one per markdown file)
/about/                    Heritage + halal promise + certifications
/distributors/             Become a distributor — application form
/samples/                  Request samples (form)
/contact/                  Office + general inquiry
/news/                     (optional, can defer to v2)
/legal/privacy/
/legal/cookies/
```

i18n-ready: routes will live under `/en/*` and `/nl/*` with `/` → `/en/` redirect; English-only at launch, NL stays empty until copy is provided.

## 4. Folder Layout (Planned)

```
/
├─ src/
│  ├─ pages/                    # Astro routes
│  ├─ layouts/                  # Page shells
│  ├─ components/
│  │  ├─ sections/              # Hero, Stats, ProductRail, Halal, …
│  │  ├─ ui/                    # Button, Card, Badge, Input, …
│  │  └─ react/                 # Interactive islands (forms, menu)
│  ├─ content/
│  │  ├─ config.ts              # Zod schemas for product + page collections
│  │  └─ products/              # one .md per product
│  ├─ styles/
│  │  └─ tokens.css             # CSS variables (colors, type, spacing)
│  ├─ lib/
│  └─ i18n/                     # locale strings
├─ public/
│  └─ images/products/          # source product photos
├─ brand_assets/                # logo, fonts, source files (already created)
├─ temporary_screenshots/       # iteration screenshots (already created)
├─ docs/                        # this folder
└─ astro.config.mjs
```

## 5. Performance / Quality Targets

- Lighthouse: **Performance 95+, Accessibility 100, Best Practices 100, SEO 100** on mobile + desktop
- Largest Contentful Paint: **< 1.5s** on cable
- Total page weight (homepage): **< 250 KB** transferred (excluding hero image)
- Zero hydration cost on static sections
- WCAG 2.2 AA color contrast across the palette before any visual sign-off

## 6. Out of Scope (v1)

- E-commerce / checkout (this is B2B, no online ordering)
- User accounts / login
- News section (deferred — empty for now, easy to add later)
- Multi-region pricing portal
- Headless CMS — file-based until volume justifies it

## 7. What I'll Do Next (After Your Approval)

1. **Phase 4 prep:** invoke the `frontend-design` skill to produce a design system (palette, type scale, spacing, component primitives) before any markup.
2. **Scaffold:** initialize the Astro project with TypeScript, Tailwind, React island support, Content Collections, sitemap, Vercel adapter.
3. **Wire content schema:** Zod-typed product collection so a `.md` file with the right frontmatter becomes a typed, validated product.
4. **Build the homepage v1:** hero → stats strip (cert-led, not capacity) → category rail → featured products → halal promise → certifications → distributor CTA → footer.
5. **Run screenshot iteration loop** with Puppeteer at `/temporary_screenshots/v1/`, compare against the reference, refine.
6. **Build remaining routes** in order: product detail template → category pages → about → distributors form → samples form → contact.
7. **Polish pass:** motion, accessibility audit, Lighthouse, OG images, sitemap, robots.
8. **Wait for your sign-off** before any deploy or push.
