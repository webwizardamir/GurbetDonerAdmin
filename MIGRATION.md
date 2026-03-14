# WooCommerce → MelekHalalFood Migration Plan

## Overview

Migrate ~6000 orders, all customers, and all products from WooCommerce to the new Supabase-based system. Two years of business data. Analytics must be 100% correct — historical prices preserved exactly as sold.

---

## Source: WooCommerce Exports Needed

### 1. `customers.csv` (WooCommerce → Customers → Export)

| WooCommerce Field | Maps To | Required |
|---|---|---|
| Customer ID | `woo_customer_id` (mapping key) | Yes |
| Company | `company_name` | Yes |
| First Name + Last Name | `contact_person` | |
| Email | `email` | |
| Phone | `phone` | |
| Billing Address 1 | `billing_street` | |
| Billing City | `billing_city` | |
| Billing Postcode | `billing_postal_code` | |
| Billing Country | `billing_country` (default NL) | |
| Shipping Address 1 | `shipping_street` | |
| Shipping City | `shipping_city` | |
| Shipping Postcode | `shipping_postal_code` | |
| Shipping Country | `shipping_country` | |
| VAT Number | `vat_number` | |

### 2. `products.csv` (Products → All Products → Export)

| WooCommerce Field | Maps To | Required |
|---|---|---|
| ID | `woo_product_id` (mapping key) | Yes |
| Name | `name` | Yes |
| SKU | `sku` | |
| Categories | `category_id` (lookup/create) | |
| Regular Price | `base_price` (convert EUR → cents) | Yes |
| Tax Class | `tax_rate` (default 9% BTW) | |
| Stock | `stock_quantity` | |
| Type | Determines `unit_type` | |

### 3. `orders.csv` (Advanced Order Export plugin)

| WooCommerce Field | Maps To | Required |
|---|---|---|
| Order ID | `woo_order_id` (mapping key) | Yes |
| Order Date | `order_date` + `created_at` | Yes |
| Order Status | `status` (mapped, see below) | Yes |
| Customer ID | `customer_id` (via mapping table) | Yes |
| Payment Method | `payment_method` | |
| Cart Subtotal | `subtotal` (EUR → cents) | Yes |
| Cart Discount | `discount_amount` (EUR → cents) | |
| Tax Total | `tax_amount` (EUR → cents) | |
| Shipping Total | `delivery_fee` (EUR → cents) | |
| Order Total | `total` (EUR → cents) | Yes |
| Customer Note | `delivery_notes` | |

### 4. `order_items.csv` (included in Advanced Order Export)

| WooCommerce Field | Maps To | Required |
|---|---|---|
| Order ID | `order_id` (via mapping table) | Yes |
| Product ID | `product_id` (via mapping table) | Yes |
| Product Name | `product_name` (snapshot, immutable) | Yes |
| SKU | `product_sku` (snapshot) | |
| Quantity | `quantity` (DECIMAL, can be fractional for kg) | Yes |
| Item Cost | `unit_price` (EUR → cents, **PRICE AT TIME OF SALE**) | Yes |
| Line Total | `line_total` (EUR → cents) | Yes |
| Tax Rate | `tax_rate` | |
| Unit Type | `unit_type` (kg/piece/zak/doos) | |

---

## Target: Database Schema Summary

### customers table
```
id              UUID PRIMARY KEY
company_name    TEXT NOT NULL
contact_person  TEXT
email           TEXT
phone           TEXT
billing_street  TEXT
billing_city    TEXT
billing_postal_code  TEXT
billing_country TEXT DEFAULT 'NL'
shipping_same_as_billing  BOOLEAN DEFAULT true
shipping_street TEXT
shipping_city   TEXT
shipping_postal_code  TEXT
shipping_country TEXT DEFAULT 'NL'
vat_number      TEXT
internal_notes  TEXT
created_by      UUID
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### categories table
```
id          UUID PRIMARY KEY
name        TEXT NOT NULL
slug        TEXT UNIQUE NOT NULL
description TEXT
sort_order  INTEGER DEFAULT 0
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### products table
```
id              UUID PRIMARY KEY
name            TEXT NOT NULL
sku             TEXT UNIQUE
barcode         TEXT UNIQUE
category_id     UUID REFERENCES categories(id)
unit_type       unit_type ENUM (kg/piece/zak/doos)
base_price      INTEGER NOT NULL DEFAULT 0  (cents)
cost_cents      INTEGER DEFAULT 0  (cents)
tax_rate        DECIMAL(5,2) DEFAULT 9.00
stock_quantity  INTEGER DEFAULT 0
track_stock     BOOLEAN DEFAULT true
description     TEXT
is_active       BOOLEAN DEFAULT true
created_by      UUID
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### product_unit_prices table
```
id          UUID PRIMARY KEY
product_id  UUID NOT NULL REFERENCES products(id)
unit_type   unit_type ENUM (kg/piece/zak/doos)
price       INTEGER  (cents, NULL = not available)
cost_cents  INTEGER  (cents)
is_default  BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
UNIQUE(product_id, unit_type)
```

### orders table
```
id              UUID PRIMARY KEY
order_number    TEXT UNIQUE NOT NULL  (format: ORD-YYYY-#####)
customer_id     UUID NOT NULL REFERENCES customers(id)
status          order_status ENUM (draft/pending_payment/on_hold/cancelled/refunded/completed)
payment_method  payment_method ENUM (bank/cash/none)
subtotal        INTEGER DEFAULT 0  (cents)
discount_amount INTEGER DEFAULT 0  (cents)
tax_amount      INTEGER DEFAULT 0  (cents)
delivery_fee    INTEGER DEFAULT 0  (cents)
total           INTEGER DEFAULT 0  (cents)
order_date      DATE
invoice_date    DATE
delivery_notes  TEXT
internal_notes  TEXT
created_by      UUID
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### order_items table
```
id              UUID PRIMARY KEY
order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id      UUID REFERENCES products(id)
product_name    TEXT NOT NULL  (snapshot at sale time)
product_sku     TEXT  (snapshot)
unit_type       TEXT DEFAULT 'piece'
quantity        DECIMAL(10,3) NOT NULL
unit_price      INTEGER NOT NULL  (cents, IMMUTABLE sold price)
cost_cents      INTEGER DEFAULT 0  (cents, cost at sale time)
discount_amount INTEGER DEFAULT 0
tax_rate        DECIMAL(5,2) DEFAULT 0
tax_amount      INTEGER
line_total      INTEGER
notes           TEXT
created_at      TIMESTAMPTZ
```

---

## Status Mapping

| WooCommerce Status | → | New System Status |
|---|---|---|
| `completed` | → | `completed` |
| `processing` | → | `pending_payment` |
| `on-hold` | → | `on_hold` |
| `cancelled` | → | `cancelled` |
| `refunded` | → | `refunded` |
| `pending` | → | `draft` |
| `failed` | → | `cancelled` |
| `paid-by-bank` | → | `completed` + `payment_method: bank` |
| `paid-by-cash` | → | `completed` + `payment_method: cash` |

---

## Price Conversion

All WooCommerce prices are in EUR with decimals (e.g. `12.50`).
All database prices are in INTEGER cents (e.g. `1250`).

```
Formula: Math.round(parseFloat(woo_price) * 100)
```

---

## Import Phases (Batches of ~1000 orders)

```
Phase 1: Categories + Products           → verify counts, names, prices
Phase 2: Customers                        → verify counts, company names, addresses
Phase 3: Orders 1-1000 + their items      → verify totals, customer links, dates
Phase 4: Orders 1001-2000 + their items   → verify
Phase 5: Orders 2001-3000 + their items   → verify
Phase 6: Orders 3001-4000 + their items   → verify
Phase 7: Orders 4001-5000 + their items   → verify
Phase 8: Orders 5001-6000 + their items   → verify
Phase 9: Final validation
```

### Per-Batch Verification Queries

After each batch, run:
1. **Count check:** `SELECT COUNT(*) FROM orders` — matches expected cumulative total
2. **Customer links:** `SELECT COUNT(*) FROM orders WHERE customer_id IS NULL` — must be 0
3. **Product links:** `SELECT COUNT(*) FROM order_items WHERE product_id IS NULL` — flag orphans
4. **Date range:** `SELECT MIN(order_date), MAX(order_date) FROM orders` — matches WooCommerce range
5. **Revenue check:** `SELECT SUM(total) FROM orders WHERE status = 'completed'` — matches WooCommerce total revenue
6. **Price integrity:** `SELECT COUNT(*) FROM order_items WHERE unit_price = 0` — flag zero-price items
7. **Line total check:** Spot-check 10 random orders, compare line totals with WooCommerce

### Final Validation (Phase 9)

1. Total orders count matches WooCommerce
2. Total revenue (completed orders) matches WooCommerce
3. Orders per customer counts match
4. Products per order match
5. Date distribution (orders per month) matches WooCommerce
6. Status distribution matches
7. Top 10 customers by revenue match
8. Top 10 products by quantity sold match

---

## Mapping Table (Temporary)

Created during import to link WooCommerce IDs → new UUIDs:

```sql
CREATE TABLE IF NOT EXISTS woo_migration_map (
  entity_type TEXT NOT NULL,        -- 'customer', 'product', 'order'
  woo_id INTEGER NOT NULL,          -- WooCommerce ID
  new_id UUID NOT NULL,             -- New system UUID
  UNIQUE(entity_type, woo_id)
);
```

This table is kept after migration for reference, can be dropped later.

---

## Order Number Generation

WooCommerce order IDs (e.g. `#12345`) will be converted to the new format:

```
WooCommerce: #12345
New system:  ORD-2024-00001  (based on order_date year + sequential)
```

The `woo_migration_map` table preserves the original WooCommerce order ID for reference.

---

## Critical Rules

1. **NEVER recalculate prices** — use the exact `unit_price` from WooCommerce order items
2. **Preserve exact dates** — `order_date` and `created_at` must match WooCommerce
3. **Customer linking is mandatory** — every order must link to a customer
4. **Product linking is best-effort** — if a WooCommerce product was deleted, store name/SKU in snapshot fields
5. **Stock is NOT adjusted** — migration does not deduct stock (historical orders already fulfilled)
6. **Audit log is NOT triggered** — migration inserts bypass audit triggers to avoid noise
7. **Document sequences are NOT affected** — invoice numbers start fresh in the new system

---

## WooCommerce Export Instructions

### Plugin: Advanced Order Export For WooCommerce

1. **Date range:** Leave empty (all orders)
2. **Format:** CSV
3. **Order statuses:** Select ALL
4. **Setup Fields:** Include Order ID, Order Date, Status, Customer ID, Payment Method, Subtotal, Discount, Tax, Shipping, Total, Customer Note, and all line item fields (Product ID, Name, SKU, Quantity, Item Cost, Line Total, Tax Rate)

### Built-in WooCommerce Exports

- **Customers:** WooCommerce → Customers → Export (CSV)
- **Products:** Products → All Products → Export (CSV)

---

## Rollback Strategy

Each batch is a separate SQL migration file. If a batch fails validation:
1. Delete all orders/items from that batch using the mapping table
2. Fix the data or mapping
3. Re-run the batch
4. Re-verify

No batch affects previous batches. Safe to retry any individual phase.
