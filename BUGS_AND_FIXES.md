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
