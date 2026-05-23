# MelekHalalFood — Major Feature Round Planning

> **Status (2026-05-23):** Phases 0–6 done. Only blocker is Phase 5's **Resend API key + verified sender domain** (UI complete, mail can't actually send until secrets are set). Polish sweep done. Two post-Phase-6 refinements shipped (Sold Products redesign + price-list scoped order picker). No active workstream — see **Recent refinements** + **Current state** for what's live and what's deferred.

---

## ⏳ Phase 5 — Resend setup pending

The send-document-email edge function expects two secrets that aren't set yet:

1. **`RESEND_API_KEY`** — sign up at resend.com, create an API key, then in Supabase Studio → Edge Functions → `send-document-email` → Secrets, paste the key.
2. **`RESEND_FROM_ADDRESS`** — e.g. `documenten@melekhalalfood.com`. The sending domain must be verified in Resend (DNS records, ~10 min).

Until both are set, the UI works end-to-end (templates editable, Send modal opens, Outbox page exists, envelope icon on Orders list), but clicking Send fails with `RESEND_API_KEY secret is not set on this edge function`. No code change needed once the secrets are configured.

---

## 🆕 Recent refinements (2026-05-23)

Two post-Phase-6 improvements requested after testing:

1. **Sold Products grouped-sections redesign** (`0574e1b`) — the Group-by-City/Customer view was a per-card `<table>`; columns didn't line up across expanded cards and the Categorie column was redundant. Replaced with a CSS-grid `<ul>` using an identical fixed column template on every card (so qty/revenue align by construction), header totals as metric chips, no table chrome, revenue tucks under product name on mobile. Driver-routing PDF (`SoldProductsTemplate.tsx`) intentionally left unchanged. Done from a UI/UX-agent spec.

2. **Price-list scoped order product picker** (`17b2ff4`) — when the selected customer is on an **active** price list, the OrderForm product search now only shows products that are on that list (the list = that customer's catalog). No list / inactive list → all products, as before. Purple scope note under the search box explains it. Reuses the already-preloaded `listItems` map. `ProductSearch` gained `allowedProductIds` + `scopeNote` props.

---

## ✅ Current state

### Shipped
| Phase | What | Status |
|---|---|---|
| 0 | Quick wins (Euro sweep, clickable customer names, unified ExportMenu) | ✅ |
| 1 | Product IDs (`MHF-NNNNN`) + Excel product import (template + bulk upsert) | ✅ |
| 2 | Country/customer price lists (CRUD, items, customer assignment, OrderForm wiring) | ✅ |
| 3 | Customer Products tab (filters, footer SUMs, export, expandable orders drill-down) | ✅ |
| 4 | Sold Products filters + Group-by-City driver-routing PDF | ✅ |
| 5 | Email send system + Outbox (UI complete; awaits Resend API key) | 🟡 awaiting Resend |
| 6 | Sortable columns on every table (`useTableSort` + `SortableTh`) | ✅ |

### Post-Phase-4 review (4 agents: security, performance, UI/UX, code quality)
| Severity | What was fixed | Commits |
|---|---|---|
| HIGH | Admin guard + role-aware profit on new RPCs (migration 00047) | `d54c29f` |
| HIGH | Bulk `upsertProductsFromImport` (~12 min → ~3 sec for 6000 rows) | `a6a306d` |
| HIGH | `overflow-x-auto` on mobile-broken tables | `8b1a0fb` |
| HIGH | Delete dead `getSoldProducts` | `26d0ff5` |
| HIGH | Stale-closure in `CustomerProductsTab.toggleExpand` | `4a152c6` |
| MED  | Session-expired guard on imports + creates | `519cd8c` |
| MED  | Inactive price lists no longer resolve at order time | `21d1ed1` |
| MED  | Excel formula-injection guard (`=`/`+`/`-`/`@`/tab/CR prefix) | `68dab84` |
| MED  | `useSoldProducts` hook cleanup (nested fn + useEffect deps) | `f0a0a7d` |
| MED  | Canonical `customers.price_list` join shape | `a75d3b2` |
| MED  | Touch-friendly inline errors in import preview | `433da8b` |
| MED  | Branded `ConfirmDialog` replaces browser `confirm()`/`alert()` on price-list pages | `ff2f496` |
| MED  | `productByCode` preload-failure surfacing in PriceListImport | `e91332e` |

### Migrations (paste into Supabase Studio)
- 00042 — `product_code` column + trigger — ✅ applied
- 00043 — backfill product_code for legacy WC-imported rows — ✅ applied
- 00044 — `price_lists` + `price_list_items` + `customers.price_list_id` — ✅ applied
- 00045 — `get_customer_items_summary` RPC — ✅ applied
- 00046 — `get_sold_products_breakdown` RPC — ✅ applied
- 00047 — admin guard + role-aware profit on 00045/00046 — ✅ applied
- 00048 — `document_sends` + email columns on `document_settings` (Phase 5) — ✅ applied
- 00049 — indexes for Phase 3-4 RPC all-time queries — ⏳ **not yet applied** (cheap, recommended)

### Edge function to deploy (Phase 5)
- `supabase/functions/send-document-email/` — deploy via Studio or CLI; set secrets `RESEND_API_KEY` + `RESEND_FROM_ADDRESS` once Resend account is ready.

### Polish sweep (completed 2026-05-21)
| Item | Status |
|---|---|
| Drop priceListTemplate alias re-exports | ✅ `300bf3e` |
| i18n: hardcoded English in SoldProducts (to / Apply / mobile labels) | ✅ `a92e097` |
| Bump SoldProducts touch targets to 44px (py-2.5) | ✅ `a0d1b8e` |
| "Using price list" → pill with Tags icon | ✅ `df1283f` |
| Customers Tags-column shows name on lg+ | ✅ `32d88d2` |
| BTW select: separate "inherit" with em-dashes | ✅ `1ebed75` |
| Card containers: rounded-xl → rounded-2xl (design system) | ✅ `b4721a2` |
| Indexes for Phase 3-4 RPCs (migration 00049) | ✅ `d3a3f83` |

### Deferred (intentionally)
- **Backfill 00043 sequence-gap risk** — migration already ran clean once; "interrupted retry" risk is moot in practice
- **Naming inconsistency `base_price` vs `price_cents`** — `base_price` is a DB column name (not just a TS field), so a rename would mean a non-trivial migration on a 6000-row table for purely cosmetic gain. New code consistently uses `_cents` suffix; legacy columns grandfathered
- **Extract shared `<ExcelImportShell>`** — meaningful refactor of two ~400-line components. Big-bang risk vs polish-sweep size. Worth doing as its own dedicated feature commit if/when the import flows diverge in a way that hurts maintenance

### Found during Phase 5 testing (fixed below)
- ✅ DocumentGenerator modal footer overflowed on smaller widths after adding the Email button — Download button got cut off (fix pending in this commit batch)
- ✅ DocumentGenerator opened with a fresh invoice number every time, so "generate today, send 2 days later" would double-number — fix reuses any existing document of the same type on the order (fix pending in this commit batch)

### What's next
- **Phase 5** — Email/send system + Outbox page (needs Q7 answers; biggest item)
- **Phase 6** — Sortable columns on every table (deferred earlier)
- **LOW polish sweep** — can roll into either phase

---

## 📋 TL;DR — What I'm proposing

After mapping the codebase (products, pricing, customer page, exports, PDFs, settings, orders perf), I'm re-ordering your 8 items so that **shared foundations land first** and feature work can plug into them without rework. New order:

| Phase | What | Why first |
|---|---|---|
| **0** | Euro sweep (#4), clickable customer names (#5), **unified export selector** (#6) | Quick wins + a shared component reused by #3 and #8 |
| **1** | **Product IDs** (#1) + Excel import for products | Identity foundation for all later imports (price lists, etc.) |
| **2** | **Country price lists** (#2) | Big new entity; depends on #1 for SKU-matched imports |
| **3** | **Customer "Products" tab** (#3) | Uses #6 export + new RPC |
| **4** | **Sold-products city/customer filters** (#8) | Uses #6 export + extends an existing RPC |
| **5** | **Email/document send system** (#7) | Largest, most infrastructure — last so it can ride on stable foundations |

Each phase = its own commit (or 2–3 small ones). I will use Plan Mode for each phase and run the **performance, security, ui-ux, code-review** agents before any commit. Orders-page perf gets a dedicated mini-pass during Phase 5 because that's when we add the "sent" indicator that risks regressions there.

---

## 🧭 Codebase ground truth (what I confirmed)

So you know my answers are based on real state, not assumptions:

- **Products** already have `sku` (UNIQUE), `barcode` (UNIQUE), `woo_product_id` (UNIQUE), multi-unit pricing via `product_unit_prices`, and per-product `cost_cents`. No human-friendly "Product ID" displayed today.
- **Customer pricing** is `customer_prices` table, resolved by `get_effective_price()` and `getEffectivePrice()` in `src/services/pricing.ts`. Fallback chain today: customer-custom → product-unit → base.
- **Exports** are already consolidated in `src/utils/export.ts` + `excelExport.ts` (green branded headers, Dutch locale CSV) and `csvExport.ts`. **No PDF export option exists yet** outside of the document templates.
- **Currency**: I grepped for `$` in JSX — **the codebase already uses €** consistently via `formatPrice()` from `src/utils/format.ts`. There are no literal `$` signs in user-facing UI. ⚠️ See Q4 below.
- **Customer detail page** has 2 tabs (Orders, Details). Adding a "Products" tab fits the existing pattern in `CustomerDetail.tsx:445`.
- **Analytics > Customers** renders names as plain text at `src/components/analytics/tabs/CustomersTab.tsx:228`. Trivial to make clickable.
- **Sold products page** (`src/pages/SoldProducts.tsx`) calls RPC `get_sold_products(p_start_date, p_end_date)` — it returns **product-level totals only, no customer/city breakdown**. Needs RPC extension.
- **Email infrastructure**: **none exists**. No Resend/Postmark/SMTP/nodemailer anywhere in package.json or edge functions. Only one edge function (`create-user`). `documents` table has no `sent_at` column.
- **Settings**: `document_settings` table (single row, ~85 columns). Already has a "Labels" tab for editable text — email templates would fit the same pattern.
- **Orders page perf** ⚠️: today every order row fetches `order_items(*)` and `order_refunds(*)`. With 50 orders × ~10 items = 500+ joined rows per page. No React Query. Filter re-runs server queries. Adding a "sent" indicator on its own is cheap; adding a "products by customer" lookup naively would be expensive. I have a plan for both.

---

## ❓ Questions for you (please answer inline or in chat)

### Q1 — Product IDs (item #1)

**My recommendation:** Repurpose the existing **`sku`** column as the public-facing "Product ID". Reasons: it's already UNIQUE, already searchable in `search_products()`, already shown on Excel exports. Adding a *new* `product_code` column would create two competing IDs and cause confusion.

For products that have no SKU today, auto-generate one on save using the format **`MHF-00001`** (5-digit zero-padded, monotonic). Admin can override with their own value at any time (still enforced UNIQUE).

**Display:** Show "ID" as the first table column on the Products page (`MHF-00001`), bold + monospace. Keep barcode as a separate column.

**Q1a — Pick the format:**
- [ ] **A (recommended)** `MHF-00001` prefix + zero-padded sequential
- [ ] **B** Plain sequential integer (`1`, `2`, `3`) — short but easier to typo
- [ ] **C** Admin must always type the SKU themselves; no auto-generation
- [ ] **D** Other (specify): ________

**Q1b — Backfill for ~6000 existing imported products:**
Should I auto-assign IDs to existing products that have a blank SKU? (Recommended: yes, in a one-time migration.)
- [ ] Yes, auto-backfill
- [ ] No, leave blank — admin will fill in over time

---

### Q2 — Country price lists (item #2)

This is the biggest design decision in the round. Here's my proposed model — please confirm or push back on each bullet.

**Data model**
- New table `price_lists` (`id`, `name`, `description`, `currency`='EUR', `is_active`, `created_at`).
- New table `price_list_items` (`price_list_id`, `product_id`, `unit_type`, `price_cents`, `tax_rate` nullable).
  - **Per unit type** — because Italy might price kg, Belgium might price doos, for the same product.
  - **Partial coverage** — a price list only needs to override the products it cares about; others fall through.
- Customer link: `customers.price_list_id` (nullable, single price list per customer).

**Resolution priority (new):**
```
1. customer_prices (per-customer custom override)   ← highest
2. price_list_items (if customer is on a list)
3. product_unit_prices (product default per unit)
4. products.base_price                              ← lowest
```

**Excel format** (I'll provide a template button):
| Product ID | Product Name | Unit Type | Price (€) | Tax % (optional) |
|---|---|---|---|---|
| MHF-00023 | Burger X | kg | 8,50 | 9 |

- Product ID is the match key (not name → handles typos/renames).
- Unit type required (matches the same enum: kg / piece / zak / doos).
- Tax override optional — blank = inherit from product.
- Import returns a validation report (unknown SKUs, invalid units, etc.) before committing.

**Q2a — Single list per customer, or multiple?**
- [ ] **Recommended:** One list per customer (simpler UI, simpler resolution).
- [ ] Multiple lists with priority order (more flexible, more complex).

**Q2b — Should price lists also override `tax_rate`?**
- [ ] **Recommended:** Yes, optional column. Useful for non-NL where you sometimes want 0% BTW already baked into the list.
- [ ] No, tax always inherits from product.

**Q2c — Where lives the "Price Lists" admin UI?**
- [ ] **Recommended:** New sidebar item under Products → "Price Lists" (own page with list of lists, click into one to see/edit/import its items).
- [ ] Tab inside the Products page.
- [ ] Tab inside Settings.

**Q2d — Validation on import:**
Should an import that contains **unknown SKUs** (a) abort entirely, (b) import valid rows + show a report of skipped rows, or (c) auto-create missing products as drafts?
- [ ] **Recommended:** (b) — partial import + downloadable error report.

---

### Q3 — Customer "Products" tab (item #3)

**My recommendation:** New tab on `CustomerDetail` showing every product ever sold to this customer, as one row per (product, unit_type) pair.

**Columns:** Product ID · Name · Unit · Total Qty Sold · Times Ordered · Last Ordered · Avg Unit Price · Total Revenue · *(owner only)* Profit.

**Filters:** Date range, category, unit type, status (default = exclude cancelled).

**Footer row:** SUMs for Qty, Times Ordered, Revenue, Profit.

**Backend:** New RPC `get_customer_items_summary(customer_id, start_date, end_date)` — single aggregate query, no N+1. Loads once when tab is opened (lazy — does not slow the page on first load).

**Q3a — Do you want an expandable row to see the individual orders containing this product?**
- [ ] **Recommended:** Yes (click the row → expands to mini-list of order numbers + dates + qty in each).
- [ ] No, summary only.

**Q3b — Default date range:** Last 12 months? All time? You pick.
- [ ] **Recommended:** Last 12 months (faster; user can switch to "All time").
- [ ] All time.

---

### Q4 — Euro sign sweep (item #4)

⚠️ **Heads-up:** I grepped every `.tsx` file and **could not find a single `$` sign in user-facing UI**. Every KPI, table, chart tick, and tooltip already uses `formatPrice()` or a literal `€`.

**Q4 — Can you point me at one specific screen where you saw a `$`?** (A screenshot or page name is enough.) Most likely candidates I want to double-check:
- [ ] Recharts default tooltip (renders raw number, may look ambiguous)
- [ ] Some specific KPI card you noticed — which one?
- [ ] A new feature/page that I haven't mapped
- [ ] You actually meant "make sure none appear" — I'll add a lint rule

---

### Q5 — Clickable customer names in Analytics (item #5)

Zero questions — wrapping the cell in `<Link to={\`/customers/${row.customerId}\`}>` with hover style. Will do silently as part of Phase 0.

---

### Q6 — Unified export selector (item #6)

**My recommendation:** Replace today's single "Export" button on each page with a dropdown:

```
┌────────────┐
│ ⬇ Export ▾ │
└────┬───────┘
     ├─ 📊  Excel (.xlsx)   ← branded green header, alt rows, freeze top
     ├─ 📄  CSV (.csv)      ← Dutch locale, semicolon, BOM
     └─ 📕  PDF (.pdf)      ← compact ruleset, logo, brand color
```

The PDF will follow your existing compact ruleset (the one documented in `CLAUDE.md`): A4, padding 28, fontSize 8 base, row paddingVertical 3, ~15–16 items per page, brand color header bar, logo top-left.

One shared component: `<ExportMenu data={...} columns={...} filename="..." pdfTitle="..." brandColor="#16a34a" />`. All current pages (Orders, Products, Customers, Documents, Audit, Sold Products) refactored to use it.

**Q6a — PDF brand color:** Use green (`#16a34a`) for all data exports, or match the page (e.g., red on Payment Reminders page)?
- [ ] **Recommended:** Always green for data exports (consistent admin-facing look).
- [ ] Match the page context.

**Q6b — Should the PDF export auto-add a header block** with company name, logo, date generated, filter summary ("Sold products from 2026-05-01 to 2026-05-17, filtered by city: Leiden")?
- [ ] **Recommended:** Yes — makes printed reports self-documenting.
- [ ] No, just the table.

---

### Q7 — Email/document send system (item #7) ⚠️ Largest item

This needs the most decisions because **no email infrastructure exists today**. I'll lay out the architecture and ask 4 focused questions.

**Proposed architecture:**

```
[ Send button on order row ]
          │
          ▼
[ Modal: pick doc type + recipients + edit subject/body ]
          │
          ▼
[ Client generates PDF via @react-pdf/renderer ]
          │
          ▼
[ Upload PDF to Supabase Storage bucket 'sent-documents' ]
          │
          ▼
[ Edge function 'send-document-email' (Resend API) ]
          │
          ▼
[ Insert into 'document_sends' table (audit log) ]
          │
          ▼
[ Update documents.last_sent_at + UI badge ]
```

**Storage:** new bucket `sent-documents`, private, owner-only RLS.
**Tracking:** new table `document_sends` (document_id, recipient_email, subject, status, error, sent_at, sent_by). Full log, not just "last sent" — gives you an audit trail and complaint defense.
**Settings:** new "Email Templates" tab in DocumentSettings, one editable template per document type (subject + body, with `{{customer_name}}`, `{{invoice_number}}`, `{{total}}`, `{{due_date}}` placeholders). Plus SMTP/Resend API key field.

**UI for "has it been sent?":** I like your idea of a clickable icon-with-badge in the orders table. My design:
- Existing 📄 icon stays for "documents generated count".
- New ✉️ icon appears next to it with a green checkmark badge if sent, gray if never sent. Click → opens send log for that order.

**Dedicated page?** Yes, I'd add **"Outbox"** under sidebar (or under Documents). Shows all sends across all orders with status, recipient, date, retry button on failures. Separate from Orders so the Orders page doesn't get heavier.

**Q7a — Email provider:**
- [ ] **Resend (recommended)** — modern, clean API, EU + US regions, generous free tier, easiest Supabase integration.
- [ ] **Brevo (ex-Sendinblue)** — French, EU data residency, good if GDPR is a strong concern.
- [ ] **Postmark** — gold-standard deliverability, paid only.
- [ ] **Custom SMTP** — if you already have credentials for `melekhalalfood.com` mailbox (Gmail/Workspace/Outlook 365), tell me which.
- [ ] **Other:** ________

**Q7b — One template per document type, or one universal template?**
- [ ] **Recommended:** One per document type (invoice tone differs from payment reminder).
- [ ] One universal template.

**Q7c — Auto-send any documents on event, or always manual?**
- [ ] **Recommended (safe):** Always manual for now — admin clicks send. Optional auto-send can come in a later phase.
- [ ] Auto-send invoice when order is marked completed.
- [ ] Auto-send payment reminder X days after due (cron).

**Q7d — Default recipient:**
- [ ] **Recommended:** Pre-fill with `customer.email`, BCC the company's own email from settings.
- [ ] Pre-fill `customer.email` only, no BCC.
- [ ] Always prompt admin to type recipient.

---

### Q8 — Sold-products filters + driver routing (item #8)

**My recommendation:** Extend the `get_sold_products` RPC to also return aggregated customer + city info per product. Then add:

- **Filter row** at the top: City (multi-select), Customer (multi-select), Category, Unit type — in addition to existing date range.
- **"Group by" toggle**: None / City / Customer. Defaults to None.
  - When "Group by City" is selected: collapsible sections per city — Leiden, Den Haag, etc. — so you can hand one printout per driver.
- **Use the unified export selector (#6)** so each grouping prints clean per-city PDFs.

**City source:** `shipping_city` if set, else `billing_city`.

**Q8a — Confirm city source rule:**
- [ ] **Recommended:** Shipping city if present, else billing city.
- [ ] Always billing city.
- [ ] Always shipping city.

**Q8b — Driver-route printout:** Should the "Group by City" PDF export create **one PDF per city** (zipped) or **one PDF with city section headers** (one print job)?
- [ ] **Recommended:** One PDF with section headers + page break between cities (single print job, easier).
- [ ] One PDF per city (zipped download).

---

## 🛡️ Cross-cutting commitments I'll enforce on every phase

These don't need answers — just visibility.

| Area | What I'll do |
|---|---|
| **Performance** | No N+1 in new queries. New tabs/pages lazy-load. Heavy joins moved to RPCs. Orders page perf audit during Phase 5. |
| **Security** | RLS policies on every new table. Edge function validates user + checks customer ownership. Email template renders use whitelisted placeholders only (no arbitrary HTML from settings). |
| **UI/UX** | All new components dark-mode compatible. All new strings added to **both** `nl.json` and `en.json` (NL first). Mobile-friendly per CLAUDE.md spec. |
| **i18n** | All UI text via `useTranslation()`. PDFs stay Dutch-only per legal rule. |
| **Commits** | One concern per commit. Author = `Amir <webwizardamir@gmail.com>`. No Co-Authored-By trailer. |
| **Migrations** | Numbered SQL files. I'll write them and you paste into Supabase Studio (per your stored workflow). |

---

## 📦 Phase-by-phase rollout (what gets committed when)

Once you've answered the questions above, I'll formally enter Plan Mode and write the detailed plan. Provisional shape:

| # | Phase | Estimated commits | Risk |
|---|---|---|---|
| 0 | Quick wins + export selector | 2–3 | Low |
| 1 | Product IDs + product Excel import | 2 | Low–med |
| 2 | Country price lists | 4–5 | Med (new entity, resolution chain change) |
| 3 | Customer Products tab | 1–2 | Low |
| 4 | Sold-products filters + driver routing | 2 | Low |
| 5 | Email/send system + Outbox | 4–6 | High (new infra, secrets, sending = side effect) |
| 6 | Sortable columns on every table | 2 | Low |

---

## 🔮 Future / deferred

- **Sortable columns on every table.** Every data table (Customers, Products, Orders, Invoices, Audit Log, Sold Products, Price Lists, Customer Products tab, Price-list items, etc.) should accept a click on any column header to toggle ASC → DESC → unsorted. One shared `useTableSort` hook + a small `SortableTh` component should cover it; sort state lives in the URL so a sorted view can be shared. Defer until after Phase 5 lands so the new tables there get the same treatment for free.

---

## ✍️ How to respond

The fastest way: open this file, replace `[ ]` with `[x]` next to your picks, write any free-form notes inline, and tell me **"questions answered"**. Or just answer in chat referencing the question numbers (Q1a: A, Q2c: Recommended, etc.). I'll then enter Plan Mode and produce the detailed plan for Phase 0.

If anything I've recommended doesn't fit how your team actually works — push back. The above is my best read of the codebase, not the only path.
