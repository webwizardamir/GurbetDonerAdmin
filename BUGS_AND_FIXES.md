# Bugs and Fixes Log

This document tracks bugs encountered during development and their solutions for future reference.

---

## Phase 1: Customers Module

### Bug 1: Missing Helper Functions in Database

**Error:**
```
ERROR: function is_admin_user() does not exist (SQLSTATE 42883)
```

**Cause:**
The Phase 1 migration (`00005_phase1_customers.sql`) referenced helper functions (`is_admin_user()`, `is_owner()`) that were supposed to be created in Phase 0, but weren't applied to the database.

**Solution:**
Created a fix migration (`00006_fix_customers_rls.sql`) that:
1. Creates the missing helper functions with `CREATE OR REPLACE`
2. Sets up RLS policies for the customers table

**Prevention:**
- Always verify that dependent migrations have been applied before creating new ones
- Use `CREATE OR REPLACE FUNCTION` for helper functions to make migrations idempotent

---

### Bug 2: Column Does Not Exist - billing_city

**Error:**
```
column customers.billing_city does not exist
```

**Cause:**
Migration file was created but not pushed to the Supabase database.

**Solution:**
Run `npx supabase db push` to apply pending migrations.

**Prevention:**
- After creating migration files, always run `npx supabase db push`
- Check `npx supabase db push --dry-run` to see pending migrations

---

### Bug 3: NOT NULL Constraint Violation on Import

**Error:**
```
null value in column "contact_person" of relation "customers" violates not-null constraint
```

**Cause:**
The original schema (`00001_initial_schema.sql`) defined `contact_name TEXT NOT NULL`. When renamed to `contact_person`, the NOT NULL constraint remained. The CSV import didn't provide values for this column.

**Solution:**
Created migration (`00008_fix_contact_person_nullable.sql`):
```sql
ALTER TABLE customers ALTER COLUMN contact_person DROP NOT NULL;
```

**Prevention:**
- When designing schemas, consider which fields are truly required vs optional
- For B2B systems, contact_person should be optional (some companies may not have a specific contact)
- Review column constraints when planning import features

---

## Phase 2: Products Module

### Bug 4: Table Already Exists Conflict

**Error:**
```
NOTICE (42P07): relation "products" already exists, skipping
ERROR: column "category_id" does not exist (SQLSTATE 42703)
```

**Cause:**
The initial schema (`00001_initial_schema.sql`) already created a `products` table with a simpler structure. The Phase 2 migration tried to create the table again with `CREATE TABLE IF NOT EXISTS`, which was skipped. Then the subsequent `CREATE INDEX` on `category_id` failed because that column didn't exist.

**Solution:**
1. Mark the failed migration as applied: `npx supabase migration repair 00009 --status applied`
2. Create a new fix migration (`00010_fix_phase2_products.sql`) that uses `ALTER TABLE` to add new columns instead of creating the table
3. Use `ADD COLUMN IF NOT EXISTS` for idempotent column additions

**Prevention:**
- Before creating migrations, check if tables already exist in the schema
- Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` when extending existing tables
- Review the initial schema before designing new features

---

### Bug 5: Missing Audit Function

**Error:**
```
ERROR: function audit_log_changes() does not exist (SQLSTATE 42883)
```

**Cause:**
The migration tried to create audit triggers referencing `audit_log_changes()` function, but this function wasn't available in the database.

**Solution:**
Wrapped the audit trigger creation in a conditional check:
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_changes') THEN
    CREATE TRIGGER audit_categories_changes...
  END IF;
END $$;
```

**Prevention:**
- Make optional features (like audit logging) conditional
- Check for dependencies before using them in migrations

---

## Common Supabase Migration Issues

### Issue: Migration Partially Applied

**Symptom:**
Migration fails mid-way, some changes applied, others not.

**Solution:**
1. Create a new fix migration with the remaining changes
2. Modify the original migration to remove the parts that were already applied
3. Push again with `npx supabase db push`

### Issue: RLS Blocking Operations

**Symptom:**
Operations fail silently or return empty results.

**Solution:**
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'table_name'`
2. Verify user has correct role in profiles table
3. Test with `is_admin_user()` function directly

---

## Useful Commands

```bash
# Check pending migrations
npx supabase db push --dry-run

# Apply migrations
npx supabase db push

# Check Supabase CLI version
npx supabase --version

# View migration history (in Supabase Dashboard)
# Go to Database > Migrations
```

---

## Schema Design Lessons Learned

1. **Optional Fields**: For B2B systems, most contact/address fields should be nullable
2. **Soft Delete**: Decided against `is_active` for customers - simpler to just delete
3. **Helper Functions**: Create reusable permission-check functions (`is_owner()`, `is_admin_user()`) early
4. **RLS Policies**: Always create RLS policies when creating tables with sensitive data

---

## Production Runtime Bugs

### Bug: Invoice/Document Preview blocked by CSP

**Symptom:**
Previewing a generated invoice PDF showed "This content is blocked. Contact the site owner to fix the issue." Console reported multiple Content Security Policy violations:
- `connect-src` blocked `data:application/octet-stream;base64,...` (WASM binary for PDF rendering)
- `frame-src` (falling back to `default-src 'self'`) blocked `blob:` iframe
- Permissions policy also blocked the camera for the barcode scanner

**Cause:**
`vercel.json` had a very strict CSP + `Permissions-Policy: camera=()`. The PDF renderer (@react-pdf/renderer) loads its WASM and fonts via `data:` URLs and renders into a `blob:` iframe — both disallowed. The html5-qrcode scanner requires camera access.

**Solution:**
Relaxed the CSP just enough to allow PDF rendering and camera:
- `connect-src` + `data:` `blob:` (for WASM `fetch()`)
- `frame-src 'self' blob:` (for PDF preview iframe)
- `worker-src 'self' blob:` (for PDF worker)
- `script-src` + `blob:` (some PDF workers ship as blob scripts)
- `media-src 'self' blob:` (scanner video track)
- Changed `X-Frame-Options` from `DENY` to `SAMEORIGIN` so same-origin iframes work (PDF preview). Cross-origin framing is still blocked by `frame-ancestors 'none'`.
- Changed `Permissions-Policy: camera=()` → `camera=(self)` so html5-qrcode can access the camera on our own origin.

**Files changed:** `vercel.json`

**Prevention:**
When introducing libraries that load content via `data:` / `blob:` (PDF, image editors, WASM-heavy code), test the CSP in production (Vercel preview) not just local dev. Local `npm run dev` doesn't serve the Vercel headers.

---

### Bug: Analytics "Top Customers" click navigates to broken URL

**Symptom:**
Clicking a row in Analytics → Top Customers produced `/customers/Krijgsman%20Food%20&%20Service` → "Failed to load customer data". Supabase returned 400 because it tried `id=eq.Krijgsman+Food+...` against the `uuid` PK.

**Cause:**
`src/services/analyticsCustomers.ts` built each row's `id` from the RPC response with `String(row.customer_id || row.customer_name || '')`. The `get_top_customers` RPC in the live database only returns `customer_name`, so `id` silently fell back to the name.

**Solution:**
Kept the fallback logic but backfilled the missing customer IDs client-side in one batched query: collect distinct company_names that lack an `rpcId`, run `customers.in('company_name', names)`, map name → id. Also guarded the navigation in `OverviewTab` so an empty id doesn't navigate.

A cleaner long-term fix is to update the `get_top_customers` RPC to return `customer_id`. That RPC wasn't in our migrations when this was written.

**Files changed:** `src/services/analyticsCustomers.ts`, `src/components/analytics/tabs/OverviewTab.tsx`

**Prevention:**
- When an RPC returns data destined for a URL, validate the shape in dev tools against what the client expects, even if the type says `string`.
- Prefer IDs over names for any user-navigable link.

---

### Bug: Order form customer/product pickers only show first 50 rows

**Symptom:**
In "New Order" → customer search, anything alphabetically after "Cafeteria Frankie" (e.g. Jacks Corner, Ramsis) was invisible. Same happened for products past the first 50.

**Cause:**
`useCustomers` and `useProducts` both hard-coded a `PAGE_SIZE = 50` and the form uses a single in-memory list for client-side filtering. With 226 customers / 177 products, only the first alphabetical page was available to the picker.

**Solution:**
Both hooks now accept a `pageSize` parameter (default 50, unchanged for the list pages). `OrderForm` passes `5000` so the picker receives the full catalogue.

**Files changed:** `src/hooks/useCustomers.ts`, `src/hooks/useProducts.ts`, `src/components/orders/OrderForm.tsx`

**Prevention:**
Any UI that filters in memory must either fetch all rows OR switch to server-side search. Prefer server-side search once a table exceeds ~1000 rows.

---

### Bug: Analytics → Products tab empty for "Today" while sibling tabs show the same order

**Symptom:**
After creating an order on date D and switching the Analytics date range to "Vandaag", the Overview/Customers/Orders/Financial tabs all reflect the new order but **Products** shows zero rows in every section.

**Cause:**
The product-side RPCs created in the live database — `get_product_performance`, `get_top_products`, `get_revenue_by_category` — filtered `o.status = 'completed'`. Sibling RPCs (`get_order_performance`, `get_customer_performance`, `get_top_customers`, `get_dashboard_revenue`) use `status NOT IN ('cancelled', 'refunded')`. Because new orders default to `pending`, they were excluded from the Products tab only.

**Solution:**
Migration `00041_product_analytics_include_pending.sql` rewrites the three product RPCs to use the same status filter as their siblings. Runs as `CREATE OR REPLACE FUNCTION` after `DROP FUNCTION IF EXISTS` (return-type signatures preserved to match what the frontend reads).

**Files changed:** `supabase/migrations/00041_product_analytics_include_pending.sql`

**Prevention:**
When a user-visible "today" number disagrees between two analytics tabs, compare their RPCs' status filters first — every analytics RPC in this project should align with `get_dashboard_revenue` (status NOT IN cancelled/refunded). Repo-tracked migrations make this trivial to grep; functions edited only in the Supabase UI hide regressions like this.

---

### Bug: Per-line invoice "Notitie" not editable, then disappears after save

**Symptom:**
On the order form a per-line note (`order_items.notes`) could be filled in, was saved, and **rendered correctly on the invoice PDF**. But reopening the order in Edit mode showed the field empty, so the note was un-clearable: the only way to remove it was a manual SQL update.

**Cause:**
Two layers:
1. `InvoiceTemplate.tsx` rendered the Notitie column as a hardcoded empty `<Text>`. The `notes` column existed on `order_items` since migration 00017 but was never wired to the document.
2. The Orders **list** query (`fetchOrders`) explicitly listed `order_items` columns and didn't include `notes`. The list rows were passed straight into `OrderForm` as `editOrder`, so the form saw `item.notes = undefined` and the round-trip looked broken (display invoice ✓, edit form ✗).

**Solution:**
- Added a per-line note input to `OrderItemsList` and threaded `notes` through `OrderForm` → `services/orders.ts` (create / updateWithItems / addOrderItem) → `services/documents.ts` (`InvoiceData.items[].note`) → `InvoiceTemplate.tsx`.
- Added `notes` to the column list in `fetchOrders`. `fetchOrderById` already used `select('*')` so it was unaffected.

**Files changed:** `src/components/orders/OrderItemsList.tsx`, `src/components/orders/OrderForm.tsx`, `src/services/orders.ts`, `src/services/documents.ts`, `src/components/documents/InvoiceTemplate.tsx`, `src/i18n/locales/{nl,en}.json`

**Prevention:**
When adding a new column that round-trips through a list page → edit form, audit every `select(...)` that touches the table — not just the single-row fetch. PostgREST silently drops columns from the response when they aren't in the projection, so the bug shows up only at the next edit, not at the next save.

---

### Bug: Order line price input fights you when editing decimals

**Symptom:**
On the order form, clicking into the per-line unit-price field, selecting all and typing `6.75` over `6.50` produced behaviour like: stays as `6`, then `67.00`, then `670.00`. Or arrow keys / scroll wheel quietly stepped the price by `0.01`.

**Cause:**
The input was `<input type="number" step="0.01" value={(unit_price/100).toFixed(2)} onChange={...immediately calls setItems...}>`. Every keystroke was forced through `parseFloat → cents → /100 → toFixed(2)` and pushed back into `value`, so the displayed string was rewritten mid-edit and the cursor landed in the wrong place. `step="0.01"` plus `type="number"` also let the browser hijack arrow-up/down and mouse-wheel.

**Solution:**
Extracted a small `PriceInput` component in `OrderItemsList.tsx` that:
- holds a local string buffer (`draft`) while focused, free of any reformatting
- only commits the parsed cents back to the parent on blur / Enter
- accepts `,` as a decimal separator (Dutch keyboards)
- uses `type="text" inputMode="decimal"` so the browser never steps the value

**Files changed:** `src/components/orders/OrderItemsList.tsx`

**Prevention:**
For any controlled numeric input that needs cents-or-decimal precision, prefer a local string buffer + commit-on-blur over `type="number"` + on-every-keystroke parsing. `type="number"` is actively hostile to currency editing in most browsers (locale-sensitive separator parsing, scroll-wheel stepping, partial-input rejection).

---

### Bug: Per-day profit diverged from WooCommerce by ~2× after migration

**Symptom:**
Dashboard revenue matched WC, order count matched, but profit was roughly double. Example 2026-04-20: WC €703.32 vs SB €1426.

**Cause:**
`order_items.cost_cents` was set at import time from the SB product catalogue's cost. The Phase E import of post-migration orders ran BEFORE `sync-products-from-wc.mjs` populated costs on matched products. Many items landed with `cost_cents = 0`, so profit = revenue (no COGS).

**Solution:**
Added `scripts/wc-reconcile/sync-order-item-costs.mjs` that updates every `order_items.cost_cents` from the current `products.cost_cents`. This matches WooCommerce analytics, which multiplies *current* product COG × historical quantity.

After the sync: 7,013 rows updated across 74 products. 2026-04-20 profit now reads €703.32 exactly.

**Files changed:** `scripts/wc-reconcile/sync-order-item-costs.mjs`

**Prevention:**
Any import that snapshots data from products (cost, tax_rate, name, sku) must run AFTER those fields are known-good on the products table. Otherwise the import captures zeros/stale values that then live forever on line_items.

---

## Phase 1-4 Review Round (2026-05-19 / 2026-05-20)

Four-agent review (security, performance, UI/UX, code quality) after Phase 1-4 shipped. 13 issues fixed across 13 commits. See **PLANNING-QUESTIONS.md → Current state** for the full table; key learnings captured below.

### HIGH: `total_profit` was leakable to Shop Manager via direct RPC call

**Symptom:**
`get_customer_items_summary` was created `SECURITY DEFINER` with `GRANT EXECUTE … TO authenticated`. The UI hid the profit column for `!isOwner`, but a Shop Manager could call `supabase.rpc('get_customer_items_summary', …)` from DevTools and read profit straight from the returned rows. Same RPC also had no caller authorization — any `authenticated` role (including future customer-portal accounts) could enumerate revenue/profit per customer.

**Solution:**
Migration `00047_secure_phase34_rpcs.sql` converts both new RPCs (`get_customer_items_summary`, `get_sold_products_breakdown`) from `LANGUAGE sql` to `plpgsql` so we can guard them:

```sql
IF NOT is_admin_user() THEN
  RAISE EXCEPTION 'forbidden: admin access required';
END IF;
```

For `get_customer_items_summary` the profit column is wrapped in a per-row case:

```sql
CASE WHEN is_owner()
     THEN (revenue - cogs - refunds)::bigint
     ELSE NULL::bigint
END
```

so even an admin Shop Manager calling the RPC directly sees NULL profit.

**Prevention:**
Every new `SECURITY DEFINER` RPC must (a) start with an `is_admin_user()` (or stricter) guard, and (b) gate any sensitive column with `is_owner()` server-side — UI hiding alone is not enough.

---

### HIGH: `upsertProductsFromImport` was ~12 minutes wall-clock for 6000 rows

**Symptom:**
Each row in the Excel import did one `UPDATE` or `INSERT` then one `product_unit_prices.upsert` — sequentially awaited. The `BATCH_SIZE = 50` outer loop was a no-op because the inner loop didn't parallelize. At ~60 ms/round-trip × 12000 calls = ~12 minutes for a 6000-row sheet. Users assumed the app had hung.

**Solution:**
Partition rows into updates (matched by `product_code`) and inserts, then:

```ts
await Promise.all([
  supabase.from('products').upsert(updates,  { onConflict: 'id' }),
  supabase.from('products').insert(inserts).select('id'),
])
// then one bulk product_unit_prices.upsert for both groups,
// zipping inserted IDs by input order
```

Three round-trips total. ~3 seconds for the same 6000-row sheet. `upsertPriceListItems` already used this pattern.

**Prevention:**
Any per-row Supabase mutation in a hot import path needs a bulk-upsert plan from the start. Sequential N+1 with `await` in a for-loop is the canonical bad-import bug.

---

### MED: Excel formula-injection on imported text cells

**Symptom:**
Cell values starting with `=`, `+`, `-`, `@`, tab, or carriage return are interpreted as formulas in Excel and Google Sheets. An admin who imported a sheet with such values, then re-downloaded the product list later, would open a sheet that could execute `=cmd|'/c calc'!A1` or display a `=HYPERLINK(...)` phishing link.

**Solution:**
`sanitizeCellValue(v)` in `src/utils/excelImport.ts` prefixes any string starting with those characters with a single quote (the standard Excel escape — Sheets and Excel hide the quote and render the rest literally). Wired into the `trimOrNull` helper in both ProductImport and PriceListImport so every string field landing in the DB passes through the guard.

**Prevention:**
Any feature that imports user-provided text into the DB and later re-exports it via .xlsx/.csv must sanitize on the way in. The output side (export.ts) doesn't need separate logic because the prefix-quote is preserved end-to-end.

---

### MED: Inactive `price_lists` still resolved at order time

**Symptom:**
Setting a price list `is_active = false` in the UI was decorative — `OrderForm` still pulled the list's items as long as `customer.price_list_id` pointed to it.

**Solution:**
The OrderForm pricing-context preload now skips the `price_list_items` query when `selectedCustomer.price_list?.is_active === false`. Pricing falls through to `product_unit_prices` / `base_price`. Historical orders are unaffected — the immutable `unit_price` snapshot on `order_items` is the source of truth for analytics.

**Prevention:**
Any "active/inactive" toggle on a join target should be honored at the resolver layer, not just hidden from the UI dropdown.

---

### MED: Stale-closure in `CustomerProductsTab.toggleExpand`

**Symptom:**
```ts
setExpanded(prev => { /* toggle key */ })
if (!expanded.has(key) && !orderCache.has(key)) { /* fetch */ }
```

The fetch guard read `expanded` (the closure-captured pre-update value), not the new state. Accidentally correct today because the truth-table came out right — but the code reads the *opposite* of intent.

**Solution:**
Compute `const willOpen = !expanded.has(key)` once at the top, use it for both the `setExpanded` and the fetch branch:

```ts
const willOpen = !expanded.has(key)
setExpanded(prev => { /* uses willOpen */ })
if (willOpen && !orderCache.has(key)) { /* fetch */ }
```

**Prevention:**
Any `useState` toggle that also triggers a conditional side-effect must compute the "next state" boolean before the `setState(prev => …)` callback, then use the same boolean for the side-effect — never read the still-captured pre-update state in the same function body.

---

### LOW reference: branded `ConfirmDialog` component

The price-list pages used to call `window.confirm()` and `window.alert()` for destructive actions — those break dark mode and look unbranded. New component `src/components/ui/ConfirmDialog.tsx` (open boolean + title/message/onConfirm/onCancel + `'default'`/`'danger'` variant) is the replacement. Going forward, prefer it everywhere over native `confirm()`/`alert()`.

---

## In-app refunds

### Gotcha: refund stock restore vs. the order status trigger (double-restore)

**Context:**
`handle_order_status_change` (originally migration `00017`) restored the **full** stock of an order whenever its status entered `('cancelled','refunded')`. When the in-app refund feature (`create_order_refund`, migration `00050`) was added, it restored stock **per refunded unit**. If a full refund then also set the status to `refunded`, both mechanisms fired → stock restored twice.

**Wrong first cut (00050):**
Avoided the conflict by *not* changing status on refund and deriving "fully refunded" from `refund_amount`. Correct for stock/analytics, but the Orders list/filters never showed the order as refunded — confusing for the user.

**Fix (migration `00051`):**
- The refund RPC flips status to `refunded` only on a **full** refund (partial keeps status + a UI badge).
- `handle_order_status_change` was rewritten to **ignore the `refunded` transition entirely** (refunds own their stock), and to restore only the **not-yet-refunded** units on `cancelled` (so a partially-refunded order that is later cancelled doesn't over-restore). A one-time backfill marked already-fully-refunded orders as `refunded`.

**Prevention:**
There must be exactly **one** owner of stock for any state change. Refunds own per-unit restoration; the status trigger owns whole-order cancel. Never re-add a `refunded` branch to the status trigger, and if you add another refund/return path, route its stock through `create_order_refund` rather than a second trigger.

### Reference: profit must be gated in the RPC, not the UI

The customer detail **profit card** (owner-only) sums `get_customer_items_summary`, which returns `NULL` profit for non-owners server-side (see the Phase 3-4 hardening above). The card is also hidden in the UI for non-owners, but the server gate is what actually protects the data — a Shop Manager calling the RPC directly still gets no profit. Apply this to any new surface that shows cost/profit.

---

## Editing notes on closed orders

### Gotcha: never run the full order editor on a cancelled/refunded order

**Context:**
Users asked to edit the per-product note ("notitie") and order notes *after* an order is created — in any status, including `completed`/`cancelled`/`refunded`. The obvious fix (show the Orders-table **Edit** icon for those statuses and send them to the full `OrderForm` editor) is a **stock-corruption trap**.

**Why it corrupts stock:**
The full editor saves via `updateOrderWithItems`, which **deletes every `order_items` row and re-inserts them**. Stock is driven by two `order_items` triggers — `BEFORE DELETE` restores `+qty`, `AFTER INSERT` deducts `-qty`. On an *open* order those net out. But a **cancelled/refunded** order already had its stock restored (by `handle_order_status_change` / `create_order_refund`), and its `order_items` rows still hold the original quantities. Re-saving them runs the delete-restore again on top of the already-restored stock → over/under-count (off by the changed qty).

**Fix:**
- Added `updateOrderNotes(orderId, orderNotes, itemNotes)` — a **notes-only** path that issues plain `UPDATE`s on `orders` and `order_items.notes`. `UPDATE` fires no stock trigger (only INSERT/DELETE do), so it is safe in every status.
- New `OrderNotesModal` edits the per-line product notes + order delivery/internal notes. It's reachable from the order detail panel's **"Notities bewerken"** button (any status) and from the Orders-table Edit icon.
- Edit-icon routing: `cancelled`/`refunded` → `OrderNotesModal` (notes-only); all other statuses → full `OrderForm` editor.

**Prevention:**
Anything that needs to mutate a cancelled/refunded order must avoid touching the `order_items` row set. Route note/metadata edits through `updateOrderNotes` (or another UPDATE-only path), never through `updateOrderWithItems`. The stock invariant from the refunds section still holds: exactly one owner of stock per state change, and a no-op edit must stay a no-op for stock.

---

## Orders search & export scope

### Gotcha: substring search can't isolate a customer whose name is a prefix of another

**Context:**
Searching Orders for `Sohbet` returns both *Sohbet* and *Sohbet BBQ cafe*. Adding a trailing space (`Sohbet `) dropped the plain *Sohbet* — and no text term can ever isolate the shorter name, because "Sohbet BBQ cafe" literally **contains** "Sohbet". With ~70 orders each, hand-picking to export one customer wasn't viable.

**Two parts to the fix:**
1. **Whitespace / multi-word search** — `buildSearchOr` (`services/orders.ts`) now `trim()`s and tokenises the term. A trailing space collapses to one token (so `Sohbet ` still matches), and a real multi-word term narrows by **AND**-ing tokens across `company_name`/`contact_person` (chained `.or()` per token AND-combines in PostgREST). The instant client-side filter in `Orders.tsx` mirrors this so it stays a superset of the server match.
2. **Exact customer filter** — substring search is the wrong tool for "only this customer". Added `components/orders/CustomerFilterSelect.tsx`, a searchable dropdown that sets the existing `customerId` filter (exact `customer_id` eq, already handled by `fetchOrders`/`fetchOrderCount`). Pick the exact customer, then export **Alle resultaten** to get precisely their orders.

**Prevention:**
For "rows belonging to entity X" use an exact id filter, not a name `ilike`. Reserve free-text search for fuzzy discovery. When adding such a filter, make sure **both** `fetchX` *and* `fetchXCount` apply it, or the list and the paginator/total disagree.

### Note: export "all matching" vs the visible page

`ExportMenu` exports per the chosen scope. "Huidige pagina" / "Geselecteerde rijen" use rows already in memory; "Alle resultaten" calls `getAllData()`, which must re-fetch the **full filtered set** (e.g. `fetchOrders({ ...filters, limit: 100000, offset: 0 })`) — not the 50-row page. Any column whose value isn't on the entity row (e.g. the app invoice number from `fetchDocumentInfoByOrder`) must be attached to the rows inside `getAllData` too, or it exports blank for the all-matching scope. See `exportGetAllData` / `withInvoiceNumber` in `Orders.tsx`.

---

## Known Security Follow-ups (NOT yet applied — need a DB migration)

Surfaced by the security review during the June 2026 Price-List Usability work. Both are **pre-existing database-layer gaps** (not introduced by that feature), but the new in-app price-list flows make them more relevant. Both require SQL pasted into Supabase Studio (no CLI in this project), so they were deliberately deferred. Track and apply when convenient.

### Flag 1 — `cost_cents` is gated only in the UI/route, not in RLS

**Issue:** `products.cost_cents` and `product_unit_prices.cost_cents` are SELECT-able by **any** `is_admin_user()` (which includes Shop Manager). RLS is row-level and cannot hide a column, and `fetchProducts` selects `*`. Today cost is protected only because cost-bearing screens (Products cost editor, the price-list product picker with its cost/margin column) sit behind owner-only routes — but a Shop Manager could call `fetchProducts()` directly and receive `cost_cents` in the JSON. This violates the stated invariant "Shop Manager must NEVER see COGS/cost/margin — gate it in the RPC, not just the UI" (see the Profit Visibility rule in CLAUDE.md).

**Severity:** High (defense-in-depth / role-boundary), but **no live leak in the current UI** (cost screens are owner-only).

**Proper fix:** expose products to non-owners through a `SECURITY DEFINER` RPC / view that returns `cost_cents = NULL` unless `is_owner()` (same pattern as `get_customer_items_summary`), and point `fetchProducts` at it. Stop-gap: strip `cost_cents` server-side for non-owners — but prefer the RPC/view (don't trust the client).

### Flag 2 — legacy `"Customers can update own data"` policy has no `WITH CHECK`

**Issue:** Migration `00002_rls_policies.sql` created:
```sql
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (user_id = auth.uid());
```
It was never dropped in a later migration, has **no `WITH CHECK`** and **no column restriction**, and `customers.user_id` still exists. If any portal/customer auth user has `customers.user_id = auth.uid()` populated, they could `UPDATE customers SET price_list_id = <any list> WHERE id = <own row>` and **self-assign a cheaper price list** (price-list selection drives order pricing). The modern portal links users via the `customer_accounts` join table, so `user_id` may be NULL for portal users — exploitability depends on production data.

**Severity:** Medium (pricing-integrity / privilege), data-state dependent.

**Proper fix (one-liner migration):**
```sql
DROP POLICY IF EXISTS "Customers can update own data" ON customers;
```
If self-service customer edits are ever needed, re-add with a strict `WITH CHECK` pinning immutable fields (at minimum `price_list_id`, `user_id`, and pricing columns unchanged). Before applying, audit live policies: `SELECT polname FROM pg_policies WHERE tablename='customers';` (migration-in-repo ≠ migration-applied).

### Related hardening already applied (June 2026)

The PostgREST `.or()` filter in `fetchProducts`/`fetchProductCount` (`services/products.ts`) was interpolating the raw search term unquoted (a filter-injection footgun). It now quotes each value and strips `"`/`\`, matching the safe `buildSearchOr`/`escapeForOrValue` pattern in `services/orders.ts`. Consider extracting that escape into a shared `services/searchFilter.ts` so the orders/customers/products search paths can't drift.

---

## Phase: Go-live features (June 2026)

### Bug: `trash_order` rejected normal orders with a 400

**Error:** `POST /rest/v1/rpc/trash_order → 400` ("Only draft / pending / on-hold orders can be trashed") when deleting a normal order.

**Cause:** The `order_status` enum contains a live `pending` value (the default for new app-created orders), but the `trash_order` guard only allowed `draft`/`pending_payment`/`on_hold`. The UI delete button already allowed `pending`, so the two drifted.

**Solution:** Aligned the RPC guard with the UI deletable set: `draft`/`pending`/`pending_payment`/`on_hold` (migration 00065).

**Prevention:** When guarding by status in an RPC, dump the real enum (`SELECT unnest(enum_range(NULL::order_status))`) — it has more values (`pending`, `processing`, `delivered`) than the original migration 00015 listed. Keep RPC status guards and UI status lists in sync.

### Bug: Customer portal login stuck in a login → logout loop

**Cause:** The admin `AuthContext` (which wraps the whole app, including `/portal/*`) signed out with the **default global scope** when a non-staff account authenticated. A global sign-out revokes the user's refresh tokens everywhere, killing the separate portal session. Compounded by the new `manage-portal-account` `classify()` initially treating *any* `profiles` row as "admin" — but the `handle_new_user` trigger gives **every** auth user a `profiles` row (role `customer`).

**Solution:** Admin reject-sign-outs now use `scope: 'local'`; `classify()` checks the staff **role**, not row existence.

**Prevention:** With two GoTrue clients (admin + portal) on one auth.users table, never use global sign-out on a reject path. Any "has a profile = admin" check is wrong here — always check the role.

### Bug: Order line showed €0 line total in the customer portal

**Cause:** `order_items` carried three line-amount columns from early churn (`total`, `line_total`, `line_total_cents`). The app writes/reads `total`; the admin UI's `line_total` is an alias sourced from `total`, but the **portal** query read the dead DB `line_total` column (always 0 for app-created orders).

**Solution:** Repointed the portal query to `total` and dropped the dead `line_total`/`line_total_cents` columns (migration 00063). `total` is the single canonical per-line amount.

### Note: clipped row-action dropdowns

Table row menus positioned with `absolute` get clipped by the table wrapper's `overflow-hidden`/`overflow-x-auto`. Use `components/ui/DropdownMenu.tsx` (React-portal to `document.body` + `position: fixed` from the trigger rect, flips up near the viewport bottom). This is the standard fix for any future table action menu.

---

## Monorepo + go-live era (2026-06-24/25)

### Bug: Logout did not take effect until a page reload
**Cause:** `AuthContext`'s `onAuthStateChange` handler, on *any* `SIGNED_OUT` event, first tries to recover the session via a token refresh (a mitigation for backgrounded tabs that miss their refresh window). It couldn't tell a deliberate logout from an incidental `SIGNED_OUT`, so clicking Logout was immediately undone by the recovery refresh.
**Solution:** Added a `signingOutRef` flag set in `signOut()`; the `SIGNED_OUT` handler skips recovery and clears state when the flag is set, then resets it. Logout is immediate.
**Prevention:** Any "keep the session alive across `SIGNED_OUT`" logic must exempt deliberate sign-outs via an explicit flag.

### Bug: Abandoning a password reset left the user signed in
**Cause:** Clicking a Supabase recovery link establishes a real (recovery) session. `ResetPassword.tsx`'s "Back to sign in" was a plain `<Link to="/login">`, so leaving without setting a password dropped the user into the app already authenticated (and the old password still worked).
**Solution:** "Back to sign in" now calls `supabase.auth.signOut({ scope: 'local' })` before navigating, dropping the recovery session.
**Prevention:** Treat the recovery session as provisional — any exit from the reset page that isn't a successful password update must sign out (local scope).

### Bug: Overdue-invoice row menu clipped to just the snooze item
**Cause:** `OverdueInvoices.tsx` used a hand-rolled `absolute z-20` dropdown that got clipped by the table's stacking/overflow.
**Solution:** Switched to the portal-based `ui/DropdownMenu` (the standard fix noted above), matching `CustomerActionMenu`. Mobile cards already use inline buttons, so they were unaffected.

### Bug: App selling prices didn't match WooCommerce for 5 products
**Cause:** `products` has two price columns — `base_price` (what the pricing engine charges, via the resolution chain) and a legacy `price` mirror. The WC import sets both equal, but the app's product editor (`ProductForm` → `updateProduct`) writes **only** `base_price`. A prior in-app price import wrote wrong values into `base_price` while the correct WC values survived in `price`.
**Solution:** For the 5 drifted products, set `base_price = price` (verified against live WC via the REST API). 0/162 mismatched afterwards.
**Prevention:** The legacy `price` column is vestigial and can silently drift from `base_price`. Long-term: retire it, or keep it in sync on edit. Don't trust `price` for anything live — the app reads `base_price`.

### Bug: Editing an order whose product is missing dropped the cost snapshot
**Cause:** `OrderForm` reconstructs a placeholder product for edit-loaded lines whose live product isn't found, hardcoding `cost_cents: 0` — losing the immutable `order_items.cost_cents` snapshot.
**Solution:** Reconstruct with `cost_cents: item.cost_cents ?? 0`. (Found while adding the owner-only per-line COG display.)

---

## Per-price-list COG override era (2026-06-27)

### Bug (caught in review): re-adding a product could silently wipe a cost override
**Cause:** When per-list `cost_cents` overrides were added, `upsertPriceListItems` decided whether to write the `cost_cents` column with a **batch-level** flag (`rows.some(r => cost defined)`). PostgREST takes the union of keys across an upsert batch and nulls the missing ones, so any batch that contained *one* cost-bearing row would write `cost_cents = null` for every cost-blank row — wiping an override set earlier in `ProductUnitsEditor` whenever a product was re-added via `PriceListProductPicker` (or added alongside another product that had a typed cost). The exact negotiated-cost loss the feature exists to prevent, and invisible (the picker shows cost blank).
**Solution:** Make cost inclusion **per-row**: the picker omits the `cost_cents` key entirely when blank, and `upsertPriceListItems` splits rows into cost-managed (key present) vs cost-agnostic (key absent) and upserts them in **separate** calls. The editor always sends `cost_cents` (value or explicit null) so it still fully controls clearing.
**Prevention:** Never decide a per-row column's presence with a batch-level flag in a PostgREST upsert — split the batch by which columns each row manages. A price-only Excel re-import (no cost key) must leave existing overrides untouched.

### Bug (caught in review): paged DB scan without a stable order can skip rows
**Cause:** `scripts/wc-reconcile/sync-order-item-costs.mjs`'s `pageAll` helper paginated with `.range(from, from+PAGE-1)` and **no `ORDER BY`**. Postgres/PostgREST don't guarantee a stable row order across separate requests, so rows on the large `order_items` scan could be skipped (a skipped item = stale cost = silent profit drift) or duplicated.
**Solution:** Add `.order('id', { ascending: true })` to every paged query.
**Prevention:** Any `.range()`-based pagination needs a deterministic `ORDER BY` (a unique column) or it can skip/duplicate rows.

### Note: COGS still readable by Shop Manager at the data layer (pre-existing, accepted)
`price_list_items.cost_cents` (like `products.cost_cents` / `product_unit_prices.cost_cents`) is selectable by any `is_admin_user()` role via RLS, and `OrderForm` reads it for all roles to write the snapshot. The UI hides cost behind `isOwner`, but a Shop Manager with DevTools/API access can read it. This is **pre-existing** (not introduced by 00068) and accepted for now (trusted-insider threat). The proper fix is holistic: a server-side `order_items.cost_cents` resolution trigger/RPC (also makes the snapshot non-forgeable) **plus** column-level `REVOKE SELECT (cost_cents)` from the shop_manager role across all three tables. Logged as debt.

---

## Profit-everywhere + granular analytics era (2026-06-27)

### Bug (caught in review): analytics RPCs leaked COGS/profit to anon + Shop Manager
**Cause:** The Analytics *route* is owner-only, but the analytics RPCs were not — they returned `total_cogs`/`profit`/`grossProfit` etc. to any caller. `get_product_performance` / `get_top_products` / `get_revenue_by_category` are `SECURITY DEFINER` **and** were granted to `anon`, so anyone holding the public anon key (shipped in the JS bundle) could read business-wide cost-of-goods and profit. The order-grained RPCs (`get_order_performance`, `get_kpis`, `get_financial_summary`, `get_customer_performance`, `get_revenue_by_day`, `get_top_customers`) returned profit to any authenticated Shop Manager. Gating was UI-only — exactly what the project rule forbids ("gate cost in the RPC, not just the UI").
**Solution (migration 00070):** Wrapped every cost/profit/margin column in `CASE WHEN is_owner() THEN … ELSE NULL END` (revenue/qty/count unchanged), and `REVOKE EXECUTE … FROM PUBLIC, anon` on the three SECURITY DEFINER RPCs (re-`GRANT … TO authenticated`). Gotcha caught in testing: a plain `REVOKE … FROM anon` did **nothing** because `CREATE FUNCTION` grants `EXECUTE` to `PUBLIC` by default — must also revoke from `PUBLIC`. Verified: anon can't call them; non-owner gets NULL profit with revenue intact; owner unaffected.
**Prevention:** Any RPC returning cost/profit must gate the columns with `is_owner()` and must not be granted to `anon`; remember the implicit `PUBLIC` EXECUTE grant when locking down a function.

### Bug (caught in review): customer summary strip mixed cancelled orders into revenue/margin
**Cause:** The new customer-page Orders-tab summary strip summed `o.total`/`o.subtotal` over *all* filtered orders (incl. cancelled/refunded, whose per-order profit is null → counted as 0), inflating revenue and diluting margin.
**Solution:** Exclude `cancelled`/`refunded` from the strip's sums (consistent with the per-order profit, which already drops them).

### Fix: tables clipped instead of scrolling on iPad/phone
**Cause:** Several tables had their `<table>`'s direct parent set to `overflow-hidden` (or no wrapper) and used bare `min-w-full`, so columns squeezed/clipped rather than scrolling — most visibly the new-order items table cut off after the "Korting" column on iPad. The interactive items table also swapped to mobile cards at `md`, so iPad portrait (768px) landed on the cramped desktop table.
**Solution:** Standardised every table: direct table parent is `overflow-x-auto` + a concrete `min-w-[Npx]` floor; interactive-row tables swap to cards at `lg`, not `md`. Fixed `OrderItemsList`, `PriceLists`, `CustomerProductsTab`, `ProductForm`, and the analytics tables.
**Prevention:** Never put `overflow-hidden` on a table's direct parent; never rely on `min-w-full` alone (it means "≥100% of parent", which squeezes instead of scrolling).

---

## Customer portal era (2026-06-28)

### Bug (P0, caught in review): cross-customer data leak via broad `USING(true)` RLS
**Cause:** `orders`, `order_items`, and `documents` each had a `FOR SELECT TO authenticated USING (true)` policy (named "Users can view orders" / "...order items" / "documents_select"). Portal customers authenticate as the `authenticated` role, so a logged-in customer could run `portalSupabase.from('orders').select('*')` (no filter) and read **every customer's** orders/items/documents — plus `order_items.cost_cents` (COGS) and `orders.internal_notes`. `products` likewise had a blanket `auth.role()='authenticated'` policy exposing product COGS. The portal-specific scoped policies were redundant next to these. (The first review missed it because it only inspected the portal-named policies; the `true` policies were the real hole.)
**Solution (migration 00071):** Portal customers now have **no direct SELECT** on those tables — they read via SECURITY DEFINER `get_portal_*` RPCs returning column-whitelisted JSON (no cost/internal), scoped to `get_portal_customer_id()` + `deleted_at IS NULL`. Dropped the `true` + portal SELECT policies and replaced them with `is_admin_user()`-only (admin unaffected — owner/shop_manager pass). `products` SELECT restricted to `is_admin_user()` (the public website uses a static product list, not Supabase).
**Prevention:** Never use `USING (true)` for SELECT on tables that hold cross-tenant or cost/internal data when non-staff users share the `authenticated` role. Per-column protection isn't possible via RLS when admin + customers are the same Postgres role, so portal reads must go through column-whitelisted SECURITY DEFINER RPCs/views, with base-table access locked to `is_admin_user()`.

### Bug: portal documents could not be downloaded (`pdf_url` always NULL)
**Cause:** PDFs are generated client-side on demand and **never persisted** — `DocumentGenerator` calls `createDocument(..., undefined /* pdf_url */, ...)` ("No storage URL for now"). The portal's download button only rendered when `doc.pdf_url` was set, so it never appeared.
**Solution:** The `documents` row already stores the full `snapshot` (the `InvoiceData` the admin renders from). The portal now re-renders the PDF on demand from the snapshot via the shared `getDocumentTemplate` + `@react-pdf` (lazy-loaded) — works for every existing document with no storage/backfill. Security-confirmed the snapshot has no cost/profit fields. Also fixed the listed amount to use the document's own `snapshot.grandTotal` (was showing the order total, wrong for credit notes).
**Prevention:** Don't gate a portal action on a column that's never populated; prefer rendering from the immutable snapshot the app already stores.

---

## Profit shown VAT-inclusive era (2026-06-28)

### Bug (reported by client): per-line + Dashboard profit overstated by the line's BTW
**Symptom:** Client flagged order 26, line CEVAPCICI (0.75kg): 360 × €7,30, 9% BTW, inkoop €6,50 × 360. App showed **winst €524,52 (18,3%)** but the real profit is `360 × (7,30 − 6,50) = €288,00`. The €236,52 overstatement was exactly the 9% BTW on the line (€2.628 × 0,09).
**Cause:** Profit subtracted an **ex-VAT** cost from a **VAT-inclusive** revenue. `order_items.total` (mapped to `line_total`) and `orders.total` **include BTW**, but `cost_cents` is ex-VAT, so `line_total − cost×qty` inflates profit by the line's BTW. Two surfaces had it (both added in the 2026-06-27 profit-everywhere work):
- `OrderDetail.tsx` per-line "Winst" badge used `item.line_total`.
- `get_today_stats` RPC (Dashboard "Winst vandaag" / "Omzet") summed `orders.total` (incl. BTW) and subtracted **gross** refunds (`order_refunds.amount`).
The misleading doc on the unused `lineProfit` helper ("…a line revenue base (e.g. line_total)") actively invited the mistake. It went unnoticed because a **0% BTW** order looks correct (line_total == ex-VAT), and the test order with a remembered price happened to be 0% BTW — so the remembered price was a red herring, not the cause.
**Solution (migration 00072, applied):** Use an **ex-VAT revenue base** everywhere. Per-line: `line_total − tax_amount`. `get_today_stats`: `SUM(orders.subtotal)` for revenue and ex-VAT refunds via `order_refund_items.amount` (mirrors the established refund-as-revenue-reduction convention in `get_customer_orders` / `get_order_performance`). The NL "Omzet" tile is now ex-BTW (was incorrectly incl. BTW). Verified against orders 26/27/28: e.g. order 26 CEVAPCICI now €288,00. Order-level `computeOrderProfit` and the customer/analytics RPCs were already ex-VAT and unchanged.
**Prevention:** Per-line profit revenue base is **`line_total − tax_amount`**, never `line_total`/`total` (both include BTW); order-level base is `orders.subtotal` (ex-VAT). Cost (`cost_cents`) is always ex-VAT — keep both sides of the subtraction ex-VAT. When a money figure is "incl. VAT" vs "ex-VAT", check the column comment (`discount.ts`: line `total` = "incl. VAT"; `finalBase` = ex-VAT).

---

## Print button dead on mobile era (2026-07-06)

### Bug (reported by client): document "Print" button did nothing on his phone
**Symptom:** From an order the client tapped **Print** (next to Download) on his phone and nothing happened — no PDF, no print option. Download worked, so his workaround was to download first, then open and print. Desktop was fine.
**Cause:** `handlePrint` in `DocumentGenerator.tsx` `await`ed the PDF generation (`pdf(...).toBlob()`) **before** calling `window.open(url, '_blank')`. Mobile browsers only allow `window.open()` to run synchronously inside the tap handler; after the `await` the user-activation is spent, so the new tab is treated as a programmatic popup and **silently blocked**. Download was unaffected because it uses an anchor `link.click()`, which browsers allow after async. It also tried `printWindow.print()` on load, which mobile PDF viewers ignore anyway. Desktop worked because it has no such popup-blocker rule.
**Solution (committed `89cced5`):** Open the tab **synchronously on tap** (`window.open('', '_blank')`) *before* generating the PDF, then set `printWindow.location.href = url` once the blob is ready. Desktop still auto-opens the print dialog via `onload → print()` (wrapped in `try/catch` so mobile's unsupported `print()` no-ops). Added a same-tab fallback (`window.location.href = url`) if the popup is still blocked. No true one-tap print is possible for a PDF on a phone — iOS/Android require the user to tap the viewer's own print/share control (option B, an HTML print template, was declined as too costly to maintain a second legal layout).
**Prevention:** Anything that calls `window.open()` from a user action must open the window **before** any `await`, or the popup is blocked on mobile. Don't rely on `window.print()` for PDFs on mobile — it's a desktop-only nicety; the phone flow ends at the native viewer.

---

## Doos Eenheidprijs ignored negotiated price era (2026-07-07)

### Bug (reported by client): box dual-price "Eenheidprijs" showed the catalog price, not the sold price
**Symptom:** Order 10591, line `Excellence Patat 9/9` (unit_type `doos`) sold at a remembered/customer price of **€14,80** (catalog default €15,00). The invoice printed **Doosprijs €14,80** (correct) but **Eenheidprijs €15,00** (wrong) — both should read €14,80.
**Cause:** In `buildInvoiceData` (`apps/admin/src/services/documents.ts`), the Doosprijs column uses `item.unitPrice` = the immutable `order_items.unit_price` snapshot (correct), but the Eenheidprijs column used `item.piecePrice`, a **live catalog lookup** of `product_unit_prices` (unit_type='piece'). That lookup never reads the sold price, so any negotiated / remembered / price-list price was invisible in the per-single-unit column.
**Solution (committed `951612f`):** Derive Eenheidprijs from the actual sold box price scaled by the catalog piece:doos ratio — `Eenheidprijs = round(soldUnitPrice × defaultPiece / defaultDoos)` (= sold box price ÷ piecesPerBox). `buildInvoiceData` now fetches BOTH the piece and doos catalog defaults (`.in('unit_type', ['piece','doos'])`) and falls back to the catalog piece price only when the doos default is missing. For 1:1 products (piece==doos, e.g. patat) both columns match; for multi-piece boxes (75 of 101 box products) the negotiated discount scales correctly to the piece level. Fixes all four templates (Invoice/Proforma/CreditNote/OrderConfirmation) via the shared builder. Admin regenerates PDFs live, so re-printing shows the fix immediately.
**Analytics unaffected:** revenue/profit read the immutable `order_items` snapshot (`unit_price`/`total`/`cost_cents` — €14,80 here); the piece-price lookup was PDF-cosmetic only and touches no analytics RPC.
**Prevention:** Any price a document shows for a `doos` line must trace back to the immutable sold snapshot, never a fresh `product_unit_prices` catalog lookup — catalog reads ignore negotiated/remembered/price-list pricing (see the pricing resolution chain). Don't revert to a flat `.eq('unit_type','piece')` lookup.

---

## Document numbering: Day Close "generate" hangs then does nothing — duplicate-key 409 (2026-07-08)

**Symptom:** Sold Products → Dagafsluiting → download PDF: the Generate button spins a few seconds, then nothing downloads. Console: `POST /rest/v1/documents 409 (Conflict)`. Postgres logs: repeated `duplicate key value violates unique constraint "documents_document_type_document_number_key"` over ~70 minutes. (The `charts … width(-1)/height(-1)` warning in the same console is unrelated Recharts noise.)
**Cause:** `getNextDocumentNumber` (`apps/admin/src/services/documents.ts`) assigned the next number by reading the stored counter `document_settings.<type>_next_number` and incrementing it client-side — with **no atomicity and no reference to the numbers actually used**. Whenever that counter drifted **behind** the real max used number (an end-of-month numbering resync, a manual edit, a WC import, or a previously-aborted batch), every generate handed out an already-used number → the `UNIQUE(document_type, document_number)` constraint rejected the insert (409). `generateBatchInvoices` aborts the whole loop on the first throw, so the Day Close batch produced nothing. Each failed insert still bumped the counter, so it slowly "walked" past the max — burning numbers and leaving gaps in a legal invoice sequence (visible as FC-08319→FC-08321, FC-08299→FC-08304). It eventually self-heals once the counter exceeds the max (which is why the counter later read 8324 vs max 8323 and later attempts succeeded), but the operator experiences a silent failure until then.
**Solution (migration `00079_atomic_document_number.sql`, applied live):** New SECURITY DEFINER RPC `get_next_document_number_atomic(p_doc_type)` — guarded by `is_admin_user()` (owner + shop_manager + admin, matching the "shop manager may generate documents" rule) — that, under a `FOR UPDATE` row lock on the `document_settings` singleton, computes `next = GREATEST(stored_counter, max_used_for_type + 1)` and persists `counter = next + 1`. `max_used` is `MAX(substring(document_number FROM '(\d+)$')::int)` for that type. This can **never** issue a colliding number and **self-heals drift instantly** (no walking, no burned numbers); the row lock also removes the read-then-write race between concurrent callers. `getNextDocumentNumber` now just calls the RPC; `batchInvoices.ts` stays sequential only to keep invoice order deterministic (numbering no longer depends on it).
**Prevention:** Never assign a sequential legal number by a bare client-side read-increment of a stored counter — derive it from `GREATEST(counter, MAX(used)+1)` under a lock, server-side. Do not resurrect the old `get_next_document_number` DB function (migration 00018) either; it has the same drift bug and is unused.

---

## Print button: leaked blob URL + popup-blocked hijack (2026-07-08, follow-up to mobile print fix)

**Symptom (minor):** Two cleanups found during a review of the mobile-print fix (commit `89cced5`). (1) Every **Print** created an object URL via `URL.createObjectURL(blob)` that was never revoked — one leaked blob URL per print for the tab's lifetime. (2) When the browser blocked the print popup, the fallback ran `window.location.href = url`, navigating the **current admin tab** to the blob PDF and dropping the user out of the SPA (back-button required to return).
**Cause:** `handlePrint` (`apps/admin/src/components/documents/DocumentGenerator.tsx`) opens the print tab synchronously (inside the tap, so mobile doesn't block it), then loads the generated PDF — but it never released the URL, and its blocked-popup branch replaced the app tab instead of offering the file.
**Solution (commit `fdce868`):** Revoke the URL on the print tab's `unload` event, plus a 60s fallback `setTimeout` in case `unload` never fires (revoking after load doesn't blank an already-open PDF — it only invalidates re-fetches). The blocked-popup branch now triggers a normal download of `<documentNumber>.pdf` (same anchor pattern as the Download button) so the app tab stays put.
**Prevention:** Any `URL.createObjectURL` needs a matching `revokeObjectURL`; never use `window.location.href` on the SPA tab as a fallback — download or open a new tab instead.

---

## Same document rendered differently from Invoices page vs Orders page (2026-07-08)

**Symptom (reported by client):** Proforma PRO-00003 downloaded from **Invoices → Download** came out **Dutch** with an extra **"Maher Commission"** line (6 items); the *same* proforma downloaded from **Orders → open order → Download** came out **English** with **5 items**. The English/5-item version was correct (customer `billing_country = DE`; the commission line had been removed from the order after the proforma was first generated).
**Cause:** A document renders from two different sources depending on the surface. The **Orders page** (`DocumentGenerator`) always rebuilds **live** via `buildInvoiceData(orderId)` (reusing only the existing document *number*), while the **Invoices list page** (`Invoices.tsx` `generatePdfBlob`) and the **customer portal** render the frozen `documents.snapshot`. The snapshot is written once at first generation and **never updated**, so any later edit to the order (customer/country change → language, added/removed lines, price edits, new template features like the box dual-price columns) makes the frozen copy diverge from live. PRO-00003's snapshot predated the bilingual + box features (`lang`/`unitType`/`piecePrice` all null) and still contained the since-removed commission line. Not a remembered/box-price bug — that was a red herring.
**Solution (commit `615aa8b`):**
- `refreshOrderDocumentSnapshots(orderId)` (`services/documents.ts`) rebuilds every document of an order and rewrites its `snapshot`, **preserving the existing number** (`buildInvoiceData` returns `documentNumber: ''` — never allocates one). Parallel (`Promise.allSettled`) + best-effort (never throws). Called **fire-and-forget** (`void`) after `updateOrderWithItems` / `updateOrderNotes` so it never delays a save.
- `Invoices.tsx` download now rebuilds **live** like the Orders page (falls back to the stored snapshot only if the order is gone) and **writes the fresh snapshot back**, so the portal (which renders the snapshot) heals on next open — and legacy stale docs self-heal without needing an order edit.
- **Migration 00080** — the `documents` table had **no RLS UPDATE policy** (only INSERT/SELECT/DELETE), so every snapshot write was silently denied by RLS; added `documents_update` = `is_admin_user()`.
- **Migration 00081** — rescoped that policy `TO authenticated` and added a `BEFORE UPDATE` trigger `enforce_document_snapshot_only_update` so only `snapshot` is writable (`document_number`/`document_type`/`order_id`/`generated_at`/`generated_by` immutable; `order_id → NULL` still allowed so `purge_order`'s FK `ON DELETE SET NULL` isn't blocked). This keeps the broad UPDATE grant from being used to renumber or repoint an issued invoice — RLS can't express column-level immutability.
**Product note:** this refreshes **all** doc types incl. issued invoices/credit-notes (deliberate — chosen so every surface matches). The number stays immutable and the `audit_documents` trigger logs every snapshot change, so it's traceable.
**Prevention:** any surface that renders `documents.snapshot` must be treated as *eventually* stale unless the snapshot is kept in sync with the order. Keep the fire-and-forget refresh on the order-mutation paths; keep snapshot writes snapshot-only (the trigger enforces it). Verified live: a `document_number` UPDATE is rejected; snapshot-only + `order_id → NULL` pass.

## Remembered price not applied when adding a product before pricing context loaded (2026-07-10)

**Symptom (reported by client):** Order 10629 (customer *Ramses*), added *Premium Patat 9/9* but its remembered price didn't apply — showed the €14,50 catalog default. Re-editing the line to €13,50 and saving made a remembered price stick; client asked whether that would persist.
**Investigation — two separate things:**
1. **The actual cause was NOT a bug (unit-type mismatch, working as designed).** Remembered prices (`customer_prices`) are keyed `(customer_id, product_id, unit_type)`. Ramses had €13,50 remembered for *Premium Patat* under **piece** (from a 3 July order), but order 10629 added it as a **doos** line (doos is the product's default unit). No remembered price existed for doos → catalog default €14,50 showed. Saving €13,50 created the **doos** row; both piece+doos are now remembered at €13,50. **Remembered prices never expire** — no TTL/cron removes them; they persist until the forget × (`clearCustomerPrice`) or a manual price edit overwrites them. This answered the client's durability question (yes, forever, per unit type).
2. **A real latent race was found and fixed while investigating.** `OrderForm.tsx` fetches the customer's pricing context (`customer_prices` + `price_list_items`) **asynchronously** on customer-select, but `loadingPrices` was hardcoded `false`, so the "add product" button was never disabled during that window. Adding a product before the fetch resolved made `resolveEffectivePrice` read an empty `customerPrices` map and return the default/list price instead of the remembered one. In **edit mode** it never self-heals: the reprice effect skips loaded orders (`repriceArmedRef.current === false`, since sold prices are immutable), so the wrong price sticks on the freshly-added line until it's removed and re-added.
**Solution (commit `25976e6`):** Wired the already-plumbed `loadingPrices` flag to the real fetch — `true` while the context loads, `false` when ready. `ProductSearch` already disables the add button on `loadingPrices` (added a `disabled:opacity-50 disabled:cursor-wait` affordance). The button is now blocked until the remembered-price context is available, so a product can't be added with a stale price.
**Prevention:** Any price resolution that depends on an async-fetched context (`customerPrices`/`listItems`) must gate the action that consumes it — don't let a product be added before the context loads, especially in edit mode where the reprice effect won't correct it. When "a remembered price didn't apply," first check the **unit type** of the line vs the unit the price was remembered under — different unit = different `customer_prices` row (expected), not a durability bug.

---

## Orders list: future-dated order appears on the wrong page (2026-07-13)

**Symptom (reported by client):** Order #10581 (Slagerij Atas) appeared when searching by name/number but was missing from the normal Orders list; sorting by date, it showed among 9-Jul orders on page 2 (top), even though its date is 13 Jul.
**Cause:** `fetchOrders` (`services/orders.ts`) paginated + sorted **server-side by `created_at DESC`**, while the UI displays, filters and client-sorts by **`order_date`**. #10581 was *created* 6 Jul but given `order_date` 13 Jul (future delivery), so it landed in the 6-Jul `created_at` page; the per-page client sort (`useTableSort` default `order_date desc`) then floated it to the top of that page — so it read as "13 Jul among 9 Jul" and was absent from page 1. Search worked because search ignores the paginated sort.
**Solution (commit `37cf857`):** `fetchOrders` now orders by `order_date DESC, created_at DESC` (created_at only as a stable-pagination tiebreaker), so pagination matches the date the UI shows/filters. All `fetchOrders` consumers group by `order_date`, so the change is correct everywhere.
**Prevention:** the server-side pagination/sort key MUST match the field the UI displays and filters on; a per-page client sort only reorders the rows already fetched, it can't move a row onto the right page.

## Customer portal self-service OTP login — code-review fixes (2026-07-13)

**Context:** the new public `portal-request-code` edge fn (passwordless email-OTP login) passed an adversarial security review during design, but a post-implementation high-effort review found real defects. Fixed in commit `72ec039` + migration `00083`:
- **Rate-limit DoS (critical):** the global daily send cap was consumed **before** the customer-existence check, so an unauthenticated attacker POSTing ~500 distinct random emails could trip it and lock every real customer out of login. Fix: split the limiter — `portal_login_can_send` does per-email caps up front; new `portal_login_consume_global` (cap 2000) is consumed **only on a real send** in the background, so probes never touch it.
- **Custom-portal-email regression:** the flow keyed on `customers.email`, but customers onboarded with a portal auth-email that differs from `customers.email` (via `manage-portal-account`) could no longer log in. Fix: new atomic `portal_login_resolve` RPC resolves the ACTIVE `customer_accounts` link keyed on the auth user's **own** email first, then the unique `customers.email`; it also folds in the staff guard + auth-user lookup (replacing an `ilike` LIKE-injection, an O(n) `listUsers` scan, and inline classify).
- **Session downgrade:** flipping the portal "remember me" default to session-first silently logged out already-persisted customers on the next token refresh. Fix: a one-time migration in `services/supabase.ts` marks pre-existing localStorage sessions as remembered.
- **Minor:** `customer_accounts` INSERT now sets the `email` column (owner reset/relink read it); a rate-limited resend now returns a `rateLimited` flag so the UI stops falsely claiming "code sent".
**Non-issues (verified):** `verifyOtp({type:'email'})` works for a `generateLink('magiclink')` OTP (tested end-to-end); duplicate customer emails are impossible (`UNIQUE(lower(email))`, migration 00030).
**Prevention:** on a public unauthenticated endpoint, never let cheap probes consume a shared/global budget; resolve identity in one atomic, indexed, injection-safe query rather than app-side loops; when changing a storage default, migrate existing state so live sessions aren't dropped.

---

## Error screen after deploy — stale Vite chunk / "MIME type text/html" (2026-07-18)

**Symptom (reported by client):** after a redeploy (often right after a push), an already-open admin tab shows the ErrorBoundary "Something went wrong" screen on navigation/login. Console: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"` and `Failed to fetch dynamically imported module .../assets/<Chunk>-<hash>.js`.
**Cause:** Vite content-hashes chunks; a new deploy emits new hashes and deletes the old files. The SPA rewrite in `apps/admin/vercel.json` (`/(.*) → /`) serves `index.html` for any missing path, so a request for a dead `/assets/<old-hash>.js` returns `index.html` (MIME `text/html`) → the dynamic import fails. The app already had a two-layer recovery (`utils/lazyWithReload.ts` + `ErrorBoundary.componentDidCatch`, a single guarded `window.location.reload()` via `reloadOnceForChunkError`), **but `index.html` had NO `Cache-Control` header**, so the browser *heuristic-cached* it — the recovery reload re-fetched the same stale index (still pointing at the dead chunks), failed again, the 10s `chunk-reload-ts` guard blocked a second reload, and the error surfaced.
**Solution (commit `8594e31`):** added cache headers to `apps/admin/vercel.json` — the broad `/(.*)` block now sets `Cache-Control: no-cache` (HTML always revalidates, so a reload gets the index that references the current chunk hashes), and a new `/assets/(.*)` block (listed AFTER, so it wins for asset paths — Vercel applies the last matching source for a duplicate header) sets `Cache-Control: public, max-age=31536000, immutable` (Vite files are content-hashed, safe to cache forever). Kept the runtime reload code — it's correct; the missing half was the caching. Immediate workaround for a stuck tab: hard refresh (Ctrl+Shift+R).
**Gotchas:** Vercel header objects accept only `key`/`value` (no `comment`; vercel.json is strict JSON with no comments) or the config fails validation. Only `apps/admin/vercel.json` exists — a `_headers` file is a Netlify/Cloudflare convention that Vercel ignores. The fix only helps deploys made *after* it deploys, so the very deploy that ships it still needs one hard refresh.
**Prevention:** an SPA's `index.html` must be served `no-cache`/revalidated and its content-hashed assets `immutable`; otherwise a redeploy strands open tabs on a stale index and no amount of auto-reload can recover.

---

## App frozen on the loading spinner until a manual refresh — Supabase auth-lock deadlock (2026-07-24)

**Symptom (reported by owner):** after the laptop had been asleep / a tab left alone for a long time, coming back to the admin app left every page spinning forever — no error, no timeout. A manual browser refresh loaded the same page instantly. Also seen as "slow/inconsistent right after logging in" and "stuck loading after switching tabs".

**Cause:** a **circular wait on the Supabase auth lock**, triggered by `await`-ing a Supabase auth call *inside* an `onAuthStateChange` callback — `AuthContext.tsx` did `await tryRefreshSession()` in its `SIGNED_OUT` branch, and `PortalAuthContext.tsx` did the same plus `await getPortalUser()` on `SIGNED_IN`. Verified against `@supabase/auth-js@2.86.2`:
1. Tab becomes visible → auth-js's own `_onVisibilityChanged` takes the Web Lock `lock:sb-<storageKey>` and runs `_recoverAndRefresh()`.
2. The token is past its expiry margin and the refresh fails non-retryably → `_removeSession()` → `_notifyAllSubscribers('SIGNED_OUT')`, which **awaits every subscriber callback**.
3. Our callback awaits `refreshSession()`; `_acquireLock` sees the lock already held, takes its re-entrancy branch and awaits the *outer* operation — which is itself blocked waiting for our callback. Neither can finish, so the lock is **never released**.
4. `supabase-js` calls `auth.getSession()` on **every** PostgREST/RPC request (`SupabaseClient._getAccessToken`), and `getSession()` takes that same lock. From that moment every query in the app hangs forever — and because Web Locks are origin-scoped, so does every other tab on the origin. Reloading destroys the document, releases the lock, and everything works again.

The recovery being attempted was futile anyway: `_removeSession()` wipes storage *before* emitting `SIGNED_OUT`, and `refreshSession()` with no argument reads the refresh token *from* storage — it could only ever fail. Two aggravating factors: the app also ran its **own** `visibilitychange` refresh, duplicating and racing auth-js's (a losing racer presents a just-rotated token → 400 → `SIGNED_OUT` → the deadlock); and the login reject paths called `signOut({scope:'local'})` without the `signingOutRef` guard, so entering non-staff credentials on the admin login hit the same deadlock — the "inconsistent behaviour right after logging in".

**Solution:** the `onAuthStateChange` callbacks in `context/AuthContext.tsx` and `context/PortalAuthContext.tsx` are now **synchronous and do nothing but `setState`**. The `SIGNED_OUT` recovery-refresh is deleted from both (session gone = signed out), the portal's `SIGNED_IN` follow-up is deferred with `setTimeout(fn, 0)` so it runs after the lock is released, and both custom `visibilitychange` refreshes are deleted — auth-js already recovers the session on tab return. `signingOutRef` became dead and was removed. Belt-and-braces: `AuthContext`'s init now races a 10s watchdog that always releases the `loading` gate, so a stalled handshake can never leave the full-screen spinner up. Separately, `detectSessionInUrl: false` on `portalSupabase` — both clients are constructed at module import, so on `/reset-password#access_token=...` the portal client raced the admin client for the hash and could persist a **staff** token under `sb-portal-auth-token`.

**Prevention:** **NEVER `await` a Supabase call inside `onAuthStateChange` — and never make that callback `async`.** This includes `refreshSession()`, `getSession()`, `getUser()` *and* any `.from()`/`.rpc()` query (those fetch the access token via `getSession()` too). Supabase's docs say this outright; the failure mode is invisible in review and catastrophic at runtime. Defer any async follow-up with `setTimeout(fn, 0)`. Equally: do not hand-roll session recovery on `visibilitychange` — auth-js does it, and a second implementation just races the first.

---

## List pages lost their page + filters on back-navigation (2026-07-24)

**Symptom (reported by owner):** on Customers page 2, opening a customer and pressing the back arrow returned to page 1 with filters cleared. Same on every list page — most painfully on Orders, where editing an order is a full route change to `/orders/:id/edit`.
**Cause:** ordinary React. `page`/filters lived in `useState` inside the list component; React Router **unmounts** it on navigation, so returning mounted a fresh component and every `useState(1)` started over. Compounded by the back buttons doing a forward `navigate('/customers')` / `navigate('/orders')` rather than a real back, which pushed a bare URL even if state had been preserved.
**Solution:** new `hooks/useUrlListState.ts` parks the view state in the query string (`/customers?page=2&type=horeca`), wired into Customers, Orders, Products, Invoices and Outbox; plus `useBackTo(fallback)` for detail/editor back buttons (`navigate(-1)`, falling back to the list route when `location.key === 'default'`, i.e. a deep link with no history behind it). Side benefit: a filtered list is now a shareable link.
**Prevention:** the mirroring is deliberately **one-directional** — the URL is parsed **once** on mount to seed state, and written back **only from event handlers** (or from effects that skip their initial run). Never write it from a mount-time effect: an inbound link like `/orders?status=pending_payment` would be stripped by our own write before the page read it. Any effect that resets to page 1 on a filter change must also skip its first run, or it clobbers the page just restored from the URL.

---

## Hidden-orders RLS: a child-table gate that did the exact opposite (2026-07-26)

**Symptom:** caught by my own impersonation test, not in review. With `orders.hidden_from_managers` set, a `shop_manager` correctly could not see the order row — but `SELECT count(*) FROM order_items WHERE order_id = <hidden>` returned 1, and so did its `documents` row. Line prices, COGS and the invoice PDF were all reachable.
**Cause:** the child tables were gated with `NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.hidden_from_managers)`. **That inner SELECT is itself subject to `orders` RLS.** The manager cannot see the hidden `orders` row, so the subquery matches nothing, `NOT EXISTS` is TRUE, and the child row passes. The policy reads as obviously correct and does the opposite of what it says — and it fails *open*.
**Solution (migration `00095`):** two SECURITY DEFINER helpers, `order_is_hidden(uuid)` and `refund_is_hidden(uuid)`, which see the real row regardless of the caller. Every child policy is `(SELECT is_owner()) OR NOT order_is_hidden(<fk>)`, owner first so it short-circuits. Also replaced the **entire** policy set per table rather than patching by name — Melek had a legacy permissive `orders_all` (`FOR ALL`, which also grants SELECT) that would have OR'd the whole feature away.
**Prevention:** **an RLS policy on a child table can never reach its parent with a plain subquery.** Any cross-table predicate in RLS must go through a SECURITY DEFINER function, or it silently inherits the very filter it is trying to test. Test every gate by impersonating a real role in a rolled-back transaction — reading the policy is not enough, because this one looks right.

---

## `get_customer_items_summary` broke in production on a `sql` to `plpgsql` conversion (2026-07-26)

**Symptom:** the customer detail page threw `42804 structure of query does not match function result type` immediately after migration 00095 — one column at a time, so fixing one revealed the next.
**Cause:** the function was `LANGUAGE sql`, which applies **implicit assignment casts** to output columns; `plpgsql`'s `RETURN QUERY` type-checks **strictly**. Two columns had always been mistyped and it had never mattered: `unit_type` is an enum declared as `text`, and `last_ordered` is `MAX(order_date)` (a `date`) declared as `timestamptz`. The error only fires when a row is actually returned, so a customer with no items looked fine.
**Solution:** explicit `s.unit_type::text` and `s.last_ordered::timestamptz`, folded back into 00095.
**Prevention:** when converting a `LANGUAGE sql` function to `plpgsql` (e.g. to add a guard clause), **re-check every output column's type against the declared `RETURNS TABLE`** — the sql version silently papered over mismatches. Exercise the function against a row-returning input before calling it done.

---

## 372 rows of product cost were readable by `anon` (2026-07-26)

**Symptom:** found by a review at the end of the session, not by a user. `product_unit_prices_select_all` was `FOR SELECT TO public USING (true)`.
**Cause:** a pre-00035 policy. `public` includes `anon`, and the anon key ships in the client bundle — so anyone on the internet could read every product's `cost_cents`. `customer_prices` was the same shape for `authenticated`, which includes **portal customers**: any logged-in customer could read all 42 rows of other customers' negotiated pricing.
**Solution (migration `00097`):** both replaced with `FOR SELECT TO authenticated USING (is_admin_user())`. Write policies left alone — they already required `is_admin_user()`, and `product_unit_prices`' set encodes the "shop_manager may only write `cost_cents IS NULL`" rule from 00033.
**Gotcha worth remembering:** **the two tenants were exposed in opposite directions.** Gurbet, rebuilt from the repo migrations, already had the correct 00035-lineage policies and was never vulnerable; Melek, which never ran 00035, kept the old ones. The usual "apply everything twice" reflex would have found nothing on Gurbet and concluded the audit was done.
**Prevention:** `USING (true)` is never acceptable on a table holding cost, pricing or order data. Audit `pg_policies` on **each** database separately — a migration existing in the repo says nothing about which database ran it.

---

## The inline theme script was blocked by CSP in production (2026-07-27)

**Symptom (reported by owner, from the console):** `Executing inline script violates the following Content Security Policy directive 'script-src 'self' 'wasm-unsafe-eval' blob:'`.
**Cause:** a pre-paint dark-mode bootstrap had been added to `index.html` earlier the same session; `script-src` correctly has no `'unsafe-inline'`. Impact was cosmetic — `Header.tsx` still applies the theme in a `useEffect` — but that is exactly what the script existed to prevent, so dark-mode users silently got the white flash back.
**Solution (commit `1cc3152`):** whitelisted the script's `sha256` in `apps/admin/vercel.json`. **Not** `'unsafe-inline'`, which would disable inline-script XSS protection app-wide to accommodate one script we wrote; and not an external file, because a `<script src>` costs a render-blocking request on every load and a module script is deferred — both let the paint happen first. Added `scripts/check-csp.mjs` to `npm run build`: it hashes every inline script in **dist/index.html** and fails with the correct hash to paste.
**Gotcha:** `vercel.json` header entries accept only `key`/`value`; an explanatory `_comment` key fails Vercel's schema validation and breaks the deploy. The note lives in `index.html` beside the script instead.
**Prevention:** a CSP hash is a two-file invariant that drifts **silently** — the page keeps working, so the only symptom is a console line nobody reads. Assert it in the build rather than leaving a comment asking someone to remember.

---

## A stale selection could silently re-deduct stock (2026-07-26)

**Symptom:** found in review. Tick a `pending_payment` order in the Orders list, open it and cancel it from the detail panel (stock restored), then use bulk "mark completed" — the order was still in `completableSelected`, so `cancelled -> completed` was written and `handle_order_status_change` **re-deducted its stock**, with no confirmation.
**Cause:** selection now survives paging and refreshes (a deliberate improvement), which turns each stored row into a **snapshot**. Bulk eligibility was computed from `.status` on that snapshot, which no longer reflected the DB.
**Solution (commit `7cefe92`):** `Orders.tsx` re-derives the selected rows from the live list before computing eligibility, and `bulkUpdateOrderStatus` additionally constrains the UPDATE with `.in('status', legalFrom[target])` so an off-page stale row is skipped server-side rather than written.
**Prevention:** once a selection outlives the data that produced it, **never read a mutable field off the stored row** — re-derive from current data, and enforce the transition server-side as well, because a row selected on another page may not be in memory at all. The same class of bug hit `SelectionBar`, whose "all selected" was a count comparison: 50 selected on page 1 and 50 rows on page 2 rendered the box checked on a page where nothing was selected.

---

## Finalising a Concept order kept the date the draft was started (2026-07-27)

**Symptom (asked by owner):** "I work on a draft for days, then set it live — what is the order date?" It kept the draft's original date.
**Cause:** none of the three finalisation paths touches `order_date` — `updateOrderStatus` and `bulkUpdateOrderStatus` write `status` only, and `OrderForm` re-sends whatever the (stale) field holds.
**Impact, which is larger than a wrong date:** the order lands in the wrong day's route and day-close, books revenue into an already-reported period, and — because the 24h invoice auto-send window has an `order_date >= 3 days ago` floor — **its invoice email is never sent at all**. `invoice_due_date`, derived from `order_date`, is already in the past, so the dunning cron would mail the customer a reminder on day one. Live example: draft 10703 sat on 15 Jul with a due date of 22 Jul.
**Solution (migration `00098`):** re-stamp `order_date` to today when a draft leaves `draft` for a live status. Implemented **inside `set_invoice_due_and_paid`** rather than as its own trigger, because that function recomputes `invoice_due_date` from `order_date` and **BEFORE triggers fire in alphabetical name order** — a separate trigger would depend on an invisible naming coincidence to run first, and losing that race leaves the due date anchored to the old draft date. Two guards: only when the caller did not set `order_date` in the same statement (`IS NOT DISTINCT FROM OLD`), so a date typed while unticking Concept wins; and only when the stored date is in the **past**, so a future-dated planned delivery is never pulled backwards.
**Prevention:** when adding a BEFORE trigger to a table that already has one, check whether the existing one derives anything from the column you are writing — and prefer extending that function over adding a second trigger whose correctness depends on its name.

---

## A trashed order's status was editable, and Concept was missing from a cancelled order (2026-07-27)

**Symptom (reported by owner):** a cancelled order offered every status except Concept.
**Cause:** `canMarkDraft` in `OrderDetail.tsx` omitted `cancelled`. Nothing else blocked it — the stock trigger's "leaving cancelled" branch re-deducts regardless of target (and drafts do hold stock), and the revive confirmation already covered the path. The exclusion had it backwards: `cancelled -> completed` was one tap while `cancelled -> Concept`, the safest revive available (no invoice issued, stays out of analytics), was unreachable.
**Found alongside:** the Prullenbak's eye icon opens the same panel, and a trashed order is stored as `status='cancelled' + deleted_at` — so it rendered the full status picker. Changing status there re-deducted stock for an order sitting in the bin, and `restore_order` then overwrote the status from `pre_trash_status`, so the change silently vanished on restore. Harmful *and* pointless.
**Solution (commit `8045912`):** `cancelled` added to `canMarkDraft` (completed/refunded stay excluded — un-finalising a paid order should take the deliberate two steps); trashed orders render a plain `StatusBadge` showing the status they will return to. Refunds were already blocked there (`canRefund` excludes `cancelled`).
**Still open, deliberately:** document generation is reachable from a trashed order, and issuing a *new* invoice number for one burns a number from the legal sequence. Re-downloading an existing document is harmless, so splitting the two is a product decision, not a bug fix.

---

## The finalised Concept then sorted to the *bottom* of its day (2026-07-27)

**Symptom (reported by owner, the morning after `00098` shipped):** "I had a draft order, slagerij Atas. I changed its status and it didn't come to the top of the orders — I miss the order and look for it a lot, unless I remember the order number." Live example: order **10767**, started 20 Jul, finalised 27 Jul.
**Cause:** `00098` worked — 10767's `order_date` *was* re-stamped to 27 Jul. But `fetchOrders` sorts `order_date DESC, **created_at DESC**`, and a draft's `created_at` is the day the **scratchpad was opened**. So the order joined the correct day and then sank below everything entered that morning: position **25 of 25**. Fixing the primary sort key moved it from one hiding place to another.
**Solution (migration `00099`):** a second timestamp, `orders.activated_at` — *the moment the order became live* — stamped in the same draft-goes-live block, with `fetchOrders` tiebreaking on it. `created_at` could not be reused: for a draft, "row written" and "order became live" are genuinely two different moments, and `created_at` must keep answering the first (it is audit data **and** a visible sortable column). For any order that was never a draft `activated_at` equals `created_at` and never moves, so nothing else in the list reorders — that equality is what makes the change safe. Being `now()`, it also gives the owner's actual request: top of the day *until genuinely newer work arrives*.
**Design detail that matters:** the draft-goes-live **test is split from `00098`'s two date guards**. `activated_at` is stamped on every finalisation; the `IS NOT DISTINCT FROM` / `< today` guards stay nested inside, governing only the date. Folding it back under them re-breaks the same-day case — a draft opened at 08:00 and finalised at 17:00 already has `order_date = today`, skips the date branch entirely, and would still sort below the whole morning.
**Gotcha (nearly a much worse bug):** backfilling `activated_at = created_at` must **disable `orders_updated_at` and `audit_orders` first**. The former is `BEFORE UPDATE FOR EACH ROW`, so a bare `UPDATE orders SET ...` stamps `updated_at = now()` on **every order in the system** and destroys the real edit history; the latter writes ~6k junk rows into the audit log. The status triggers are `AFTER UPDATE **OF status**` and cannot fire on a backfill.
**Prevention:** **fixing a sort key is only half a fix — check what the tiebreaker does with the row you just moved.** And when a column has to answer a new question, ask whether it is still answering its old one; if both matter, that is a second column, not a redefinition. Verify trigger behaviour with a `DO` block that performs the writes and then `RAISE EXCEPTION` with the results interpolated — you get the values back *and* an automatic rollback in one call.

---

## `order_is_hidden(NULL)` let Shop Managers read statement mails (2026-07-31)

**Symptom:** none reported — found while wiring the new Betaaloverzicht, by asking what a Shop Manager would see in `/outbox` for a document type that has no order.
**Cause:** migration `00095` gates `document_sends` with `is_admin_user() AND (is_owner() OR NOT order_is_hidden(order_id))`, and `order_is_hidden()` `COALESCE`s a missing row to `false` — sensible for an order that was purged, wrong for a row that never had an order. A `payment_overview` send carries `order_id = NULL` **by design** (a statement of account spans many orders and belongs to none), so `NOT order_is_hidden(NULL)` evaluated to `true` and the row was visible to every admin.
**Impact:** the row's stored `body` states the customer's **total outstanding**, and that total includes orders flagged `hidden_from_managers`. A manager already sees every non-hidden order amount in the Orders list, so the hidden amount was one subtraction away — precisely the disclosure `00095` exists to prevent. Everything else about the feature (the tab, both RPCs, the `payment_overviews` table) was already owner-only; this was the single surface left open, and it was open because the gate was written per-order while the new row is per-customer.
**Solution (migration `00104`):** the **whole** SELECT policy is replaced (never add a second — RLS policies are OR'd, so a leftover permissive one defeats the new predicate entirely) with an explicit type term: `is_owner() OR (document_type <> 'payment_overview' AND NOT order_is_hidden(order_id))`.
**Verified** by impersonating a real `shop_manager` and a real `owner` in rolled-back `DO` blocks: manager sees 0 statement rows and still sees all 303 invoice mails; owner sees the statement.
**Prevention:** a NULL foreign key does not mean "not sensitive" — it means the per-parent gate does not apply, so the row needs a gate of its own. **Any future `document_sends` row with a NULL `order_id` inherits this hole.** When adding a row shape to a table whose RLS derives from a parent, check what the derivation returns when the parent is absent.

---

## Profit was computed from a PRE-DISCOUNT revenue base (2026-08-01)

**Symptom:** none reported — found while adding an owner-only Inkoopwaarde + Winst block to the order totals. Putting cost and profit side by side forced them to reconcile with the per-line badges printed directly above, and they did not.
**Cause:** `orders.subtotal` is persisted from `computeOrderTotals().subtotal`, which sums `lineGross = unit_price × quantity` **before** line and order discounts. `computeOrderProfit` and **every analytics RPC** used it as the revenue base, so profit was overstated by exactly the discount. The convention was even documented as "ex-VAT, post-discount" — it is ex-VAT, but it is *not* post-discount.
**Impact:** order 10528 (€75,00 discount, €62,50 cost, €0,00 actually charged) reported **+€12,50 profit instead of a €62,50 loss**. Order 10717 reported €55,65 instead of €36,70. Small in aggregate — €141,90 of discounts on €154.159,78 across 408 orders (0,07%) — but it inverts the sign on a fully-discounted order, and grows with discounting.
**Found alongside, and more visible:** `get_financial_summary` returned `'netRevenue', COALESCE(cur.net, 0)` — the **same expression** as `grossRevenue`. The Financial tab therefore rendered a waterfall that did not add up: *Bruto omzet 154.159,78 − Kortingen 108,45 = Netto omzet 154.159,78*.
**Solution:** client side (`5f93719`) — revenue is `Σ(line.total − line.tax_amount)`, ex-VAT and net of both discount levels, the same base `lineProfit()` already used, so the order figure is now the sum of the per-line figures. SQL side (migration `00109`) — 16 RPCs; order level `o.subtotal - COALESCE(o.discount,0)`, line level `oi.total - oi.tax_amount`.
**Deliberately NOT changed:** `orders.subtotal` itself (correct as a *gross* figure; the invoice and portal breakdowns depend on it), `get_portal_*` (customer-facing, emits subtotal beside discount), and `get_order_performance`'s `subtotal` column (an invoice-style display beside `discount_amount` — only its profit/margin moved).
**Technique, and why it changed mid-flight:** the plan called for hand-written `CREATE OR REPLACE` throughout. Reading all 16 live bodies showed that was wrong — `get_monthly_comparison` and `get_revenue_by_payment_method` **diverge between the two databases**, so pasting one body into both would silently overwrite one project's version. 14 were edited by a targeted replace over each project's **own live body** (the `00089` precedent); only two were hand-written. **Every replace asserts** — a missing target `RAISE`s, so a silent miss on money is impossible.
**Verified:** Melek gross unchanged at 15490978, netRevenue and KPI revenue each down by **exactly 10845** (the discount total); Gurbet has no discounts so net equals gross. Zero SECURITY DEFINER functions readable by `anon` on either; `is_owner()`, `hidden_from_managers`, the `'draft'` exclusion and the filter params all survived. The undiscounted case is unchanged, so the other 409 orders did not move.
**Rollback:** every pre-edit body is in `public.rpc_backup_pre_00109` on both projects — execute its `def` column verbatim. **Do not drop that table.**
**Prevention:** when a column name and its documented meaning disagree, believe the code that writes it. And **a figure is only trustworthy once it is shown beside the figure it must reconcile with** — this survived months of dashboards and only surfaced when cost and profit were put in the same box.

---

## The Betaaloverzicht chased money that was not owed yet (2026-08-01)

**Symptom (reported by owner):** "Luiten food, invoice FC-08394, already in the list — and the due date in the same table shows 12-08-2026."
**Cause:** `get_payment_overview_orders` had **no due-date filter**. It was built as a full statement of account — every unpaid billed order, due or not — so a customer entirely within terms still received one, and a mixed customer's statement listed invoices they did not owe yet. `days_overdue` correctly read 0; the row was simply there.
**Impact if the toggle had been on:** 21 of 97 candidates had **nothing** overdue. Luiten Food's statement would have been a single €56.854,40 line not due for another 12 days.
**Solution, in two passes because the first was incomplete:** `5ba24d7` gated **sending** on `overdue_count > 0` (no migration needed — the RPC already returned it). The owner then reported still seeing not-yet-due invoices *inside* the statements, so migration `00107` added `p_overdue_only` and gated the **contents** too: document builders pass TRUE, the admin tab passes FALSE so the owner keeps the full picture. Follow-on: *Totaal openstaand* → *Totaal te betalen*, the "Waarvan verlopen" row dropped, the Status column removed.
**Also fixed, from the same report:** the tab still listed everyone, so it looked unchanged. Filtering on "has overdue" turned out **not** to be the same set as "will be mailed" — **71 of 97 customers have no email address**. One `dispatchOf()` helper now mirrors the cron's gates in the same order and drives the stat tile, a filter and a per-row badge; only **20 of 97** are actually reachable.
**Caught before any customer saw it** — `payment_overviews` was empty, no `payment_overview` sends existed, and `monthly_overview_enabled` was still unset.
**Prevention:** a document's *purpose* decides its contents; "statement of account" and "dunning letter" are different documents with different rules, and the label on a toggle is not the specification. When a screen lists candidates for an automated action it must apply **the same gates in the same order** as the automation, or it quietly promises something the cron will not do.

---

## `payment_method` could be set once and never corrected (2026-08-01)

**Symptom (reported by owner):** an order was completed as Contant, the customer then asked to pay by bank, and there was no way to change it. Setting the status back to pending and completing again did not help.
**Cause:** `orders.payment_method` had exactly **one** writer — the `→ completed` transition — and that transition cannot be re-run on an already-completed order: `OrderStatusPicker` swallows a click on the current status, and `handleStatusChange` returns early when the status is unchanged. The payment modal was reachable only on the way *into* completed. The full order editor never carried the field, and `updateOrderWithItems` silently **dropped** it, so `CreateOrderData.payment_method` was a dead declaration.
**Why the workaround is not one:** leaving `completed` makes `set_invoice_due_and_paid` clear `invoice_paid_at`, and re-completing stamps `NOW()` — the original payment date is lost.
**Solution (`f922c10`):** the payment badge in `OrderDetail` is now itself the picker, opening `PaymentMethodModal` in a new `mode="edit"` (preselected, "Opslaan", disabled until the value changes), available in every live status and showing a neutral "Geen betaalmethode" chip when unset. Writes go through a new **`updateOrderPaymentMethod`** rather than relaxing the guard in `updateOrderStatus`: touching only `payment_method` fires neither the stock trigger nor the paid-date trigger, and `audit_orders` still records the correction.
**Prevention:** a field only ever written as a side effect of a state transition cannot be corrected once that transition is spent. Ask "how is this undone?" when wiring a value into a one-way flow.

---

## Refunds were subtracted once per unit type (2026-07-31)

**Symptom:** none — found while auditing unit-type handling across exports.
**Cause:** in `get_sold_products_breakdown` and `get_customer_items_summary` the `sold` CTE groups by `unit_type` but the `refunded` CTE did **not**, joining on `product_id` (+ customer, city) only. A product sold in N unit types had its full refund subtracted from **every one of those N rows**, and in the breakdown the over-subtraction also fed `WHERE (qty_gross - qty_refunded) > 0`, so a legitimate unit row could vanish from the report entirely.
**Impact:** latent at the time — no order had both a refund and a multi-unit product — but 76 (customer, product) pairs were already sold in more than one unit, so the first such refund would have corrupted both reports.
**Solution (migration `00105`):** `unit_type` added to the `refunded` CTE. It is **not** stored on `order_refund_items`, so it comes from the refunded `order_items` row — and that FK is `ON DELETE SET NULL` while `updateOrderWithItems` deletes-and-reinserts line items on every edit, so the link can break on an order edited after being refunded. A `LATERAL` fallback recovers the unit from another line of the same order for the same product; without it an orphaned refund matches no sold row and is silently dropped, overstating revenue instead of understating it.
**Prevention:** when one side of a join is grouped more finely than the other, the coarser side fans out. Check that both CTEs in a `sold`/`refunded` pair group by the **same** key set.

---

## Gurbet's product catalogue was readable by `anon` (2026-07-31)

**Symptom:** none — found during a security pass while adding export columns.
**Cause:** Gurbet carried a policy named `Authenticated users can view active products` which was actually `TO public` with `USING ((is_active = true) OR is_admin())`. `TO public` includes `anon`, `anon` holds the table SELECT grant, and the `is_active = true` disjunct needs no authentication at all — so every active product row, `cost_cents` included, was readable unauthenticated. Melek never had this policy.
**Why it had not leaked:** the only thing in the way was that `anon` lacks EXECUTE on `is_admin()`, so evaluating the second disjunct raised a permission error. That is an **accidental barrier, not a deny** — it depends on the planner reaching a function it may not call, and one stray GRANT (exactly what Supabase default privileges hand out when a SECURITY DEFINER function is recreated) removes it.
**Solution (migration `00106`):** policy dropped, Gurbet only. `products_select_admin` (`TO authenticated`, `is_admin_user()`) remains and is what the app uses. Verified: `anon` now reads 0 rows, the owner still reads all 6.
**Prevention:** read the `roles` column, not the policy name — and treat "it errors today" as unproven rather than safe. This is the third time the two databases have been found exposed in **opposite** directions; always check `pg_policies` on each.

---

## `npm run lint` had silently done nothing for months (2026-07-31)

**Symptom:** `npm run lint` exited 2 with "ESLint couldn't find an eslint.config.js file".
**Cause:** ESLint 9 and all its plugins were installed, but no config existed in either format — so every run failed at startup. Because the failure looked like a broken toolchain rather than a failing lint, nobody noticed the linter had stopped saying anything.
**Solution (`c463603`):** added a flat `eslint.config.js` close to the Vite react-ts template, dropped the removed `--ext` flag, and fixed all **21 errors** it then reported: two ternaries evaluated purely for side effects, two needlessly escaped `-` inside character classes, real `any`s typed, and three stale `eslint-disable` directives. Type-aware rules are deliberately off — they roughly triple lint time and `tsc --noEmit` already covers what they would catch.
**Immediately earned its keep:** it caught a live bug in that same session's code — `ExportMenu`'s `effColumns` built a new array every render, defeating the three `useMemo`s below it.
**Left as warnings, deliberately:** 19 pre-existing `exhaustive-deps` / `react-refresh` reports on intentional mount-only effects. `--max-warnings 0` was **not** restored: mass-editing effect dependencies in this codebase is exactly how the auth-lock deadlock was introduced.
**Prevention:** a command that exits non-zero for a *configuration* reason is indistinguishable from one that exits non-zero for a *code* reason. Verify a linter actually reports on a known-bad file before trusting a clean run.
