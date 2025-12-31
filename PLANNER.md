# MelekHalalFood - Build Plan & Agent Definitions

## Build Phases Overview

| Phase | Module | Priority | Complexity |
|-------|--------|----------|------------|
| 0 | Core Platform (Auth, Roles, Audit) | Critical | High |
| 1 | Customers | Critical | Medium |
| 2 | Products & Categories | Critical | Medium |
| 3 | Inventory & Batch/Expiry | Critical | High |
| 4 | Pricing (Base + Customer-specific) | Critical | Medium |
| 5 | Orders | Critical | High |
| 6 | Documents (PDF) | Critical | High |
| 7 | Analytics & Reports | Important | Medium |
| 8 | Exports & Workflows | Important | Low |
| 9 | Migration Tools | Critical | High |
| 10 | Customer Portal | Phase 2 | Medium |

---

## Phase 0: Core Platform

### 0.1 Authentication System

**Database Schema:**
```sql
-- Uses Supabase auth.users as base
-- profiles table extends auth.users

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'shop_manager',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('owner', 'shop_manager');
```

**Features:**
- [x] Admin login (email + password)
- [x] Password reset flow
- [x] Session management
- [ ] Auto-logout after inactivity (configurable)
- [ ] Rate limiting on login attempts
- [x] Secure HTTP-only cookies
- [ ] Remember me option

**Components:**
- `LoginPage.tsx` - Login form
- `ForgotPasswordPage.tsx` - Password reset request
- `ResetPasswordPage.tsx` - New password form
- `AuthProvider.tsx` - Auth context with session management

---

### 0.2 Roles & Permissions

**Database Schema:**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  UNIQUE(role, resource, action)
);

-- Resources: customers, products, orders, documents, inventory, analytics, settings, audit_log
-- Actions: view, create, edit, delete, view_cost, view_profit
```

**Permission Matrix:**

| Resource | Action | Owner | Shop Manager |
|----------|--------|-------|--------------|
| customers | view | ✓ | ✓ |
| customers | create | ✓ | ✓ |
| customers | edit | ✓ | ✓ |
| customers | delete | ✓ | ✗ |
| products | view | ✓ | ✓ |
| products | create | ✓ | ✓ |
| products | edit | ✓ | ✓ |
| products | view_cost | ✓ | ✗ |
| orders | view | ✓ | ✓ |
| orders | create | ✓ | ✓ |
| orders | edit | ✓ | ✓ |
| orders | refund | ✓ | ✓ |
| documents | generate | ✓ | ✓ |
| documents | download | ✓ | ✓ |
| inventory | view | ✓ | ✓ |
| inventory | adjust | ✓ | ✓ |
| inventory | view_cost | ✓ | ✗ |
| analytics | view | ✓ | ✗ |
| settings | view | ✓ | ✗ |
| settings | edit | ✓ | ✗ |
| audit_log | view | ✓ | ✗ |
| audit_log | export | ✓ | ✗ |

**Components:**
- `usePermission.ts` - Hook to check permissions
- `PermissionGate.tsx` - Component wrapper for permission checks
- `RoleGuard.tsx` - Route protection by role

---

### 0.3 Audit Log System

**Database Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT NOT NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');

-- Make table append-only (no UPDATE/DELETE allowed)
-- Use database triggers to auto-log changes
```

**Features:**
- [x] Auto-log all create/update/delete on tracked tables
- [x] Store old and new values as JSONB
- [x] Include user info, IP, timestamp
- [x] Append-only (immutable)
- [x] Searchable by entity, user, date range
- [x] Export to CSV

**Tracked Entities:**
- customers
- products
- product_batches
- customer_prices
- orders
- order_items
- invoices
- settings

**Components:**
- `AuditLogPage.tsx` - View audit logs (Owner only)
- `AuditLogTable.tsx` - Filterable/searchable table
- `AuditLogDetail.tsx` - Show old vs new values
- `useAuditLog.ts` - Query hook

---

## Phase 1: Customers ✅ COMPLETED

**Database Schema:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  vat_number TEXT,

  -- Billing address
  billing_street TEXT,
  billing_city TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'NL',

  -- Shipping address
  shipping_same_as_billing BOOLEAN DEFAULT true,
  shipping_street TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'NL',

  internal_notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** Removed `is_active` column - simpler to just delete customers when needed.

**Features:**
- [x] Customer list with search and filters
- [x] Create/edit customer form
- [x] Billing + shipping address management
- [x] VAT number field (validation optional)
- [x] Delete customer functionality
- [x] CSV Import from WooCommerce
- [ ] Customer order history (Phase 5)
- [ ] Quick reorder from last order (Phase 5)

**Components:**
- `CustomersPage.tsx` - List page with table (desktop) / cards (mobile)
- `CustomerForm.tsx` - Create/edit modal form
- `CustomerImport.tsx` - CSV import modal for WooCommerce data
- `useCustomers.ts` - CRUD hooks

---

## Phase 2: Products & Categories ✅ COMPLETED

**Database Schema:**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE unit_type AS ENUM ('kg', 'piece', 'package');

-- Products table extended with new columns
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;
ALTER TABLE products ADD COLUMN unit_type unit_type DEFAULT 'package';
ALTER TABLE products ADD COLUMN base_price INTEGER DEFAULT 0; -- cents
ALTER TABLE products ADD COLUMN cost_cents INTEGER DEFAULT 0; -- COGS in cents (Owner only)
ALTER TABLE products ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 9.00;
ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN track_stock BOOLEAN DEFAULT true;
```

**Note:** Simplified implementation:
- Flat categories (no nesting) - user creates Supermarkt, Horeca, etc.
- Barcode input only (no generation - barcodes already on product boxes)
- No image upload needed
- Unit types: package/box, piece, kg (standard food wholesale)
- No active/inactive system - products are simply deleted when not needed
- Cost of Goods (COGS) visible only to Owner role
- Track stock toggle to enable/disable stock management per product

**Features:**
- [x] Product list with search and category filter
- [x] Create/edit product form
- [x] Barcode input field
- [x] Category management (simple CRUD)
- [x] Unit type selection (package, piece, kg)
- [x] Tax rate per product (9% BTW default)
- [x] Stock quantity field
- [x] Cost of Goods (COGS) - Owner only can view/edit
- [x] Track stock checkbox (enable/disable stock management)
- [x] Margin column in products list (Owner only)
- [ ] Image upload (skipped - not needed)

**Components:**
- `Products.tsx` - List with table (desktop) / cards (mobile), Cost/Margin columns for Owner
- `ProductForm.tsx` - Create/edit modal form with COGS and track_stock
- `CategoryManager.tsx` - Category CRUD modal
- `useProducts.ts` - Products CRUD hooks
- `useCategories.ts` - Categories CRUD hooks

---

## Phase 3: Inventory & Batch/Expiry System ⏸️ POSTPONED

> **Note:** Phase 3 postponed to prioritize Orders functionality. Current implementation uses simple stock tracking via `stock_quantity` and `track_stock` on products table. Batch/expiry tracking will be added later when needed. Profit calculations use product-level `cost_cents` instead of per-batch costs.

**Database Schema:**
```sql
CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),

  quantity_received DECIMAL(10,3) NOT NULL,
  quantity_remaining DECIMAL(10,3) NOT NULL,
  unit_cost INTEGER NOT NULL, -- cents (Owner only)

  lot_number TEXT,
  expiry_date DATE NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES product_batches(id),

  quantity_change DECIMAL(10,3) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE low_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) UNIQUE,
  threshold DECIMAL(10,3) NOT NULL DEFAULT 10
);
```

**Features:**
- [ ] Receive stock (create batch)
- [ ] View stock levels per product
- [ ] Batch list with expiry dates
- [ ] Expiry alerts (7/14/30 days)
- [ ] Expired stock list
- [ ] Manual stock adjustments (with reason)
- [ ] Low stock threshold per product
- [ ] Low stock alerts view
- [ ] FIFO/FEFO consumption setting
- [ ] Batch traceability (which orders used which batch)

**Components:**
- `InventoryPage.tsx` - Stock overview
- `ReceiveStockForm.tsx` - Batch receiving
- `BatchList.tsx` - View batches per product
- `ExpiryAlerts.tsx` - Expiring soon list
- `StockAdjustmentForm.tsx` - Manual adjustment
- `LowStockPage.tsx` - Low stock items
- `useInventory.ts` - Stock hooks

---

## Phase 4: Pricing System

**Database Schema:**
```sql
CREATE TABLE customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),

  custom_price INTEGER NOT NULL, -- cents

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, product_id, variant_id)
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_price_id UUID REFERENCES customer_prices(id),
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- [ ] View base prices per product
- [ ] Set customer-specific price per product
- [ ] Price history tracking
- [ ] Bulk price update
- [ ] Price comparison view (base vs customer)

**Components:**
- `CustomerPricing.tsx` - Set prices for customer
- `PriceHistoryModal.tsx` - View price changes
- `BulkPriceEditor.tsx` - Mass update prices
- `usePricing.ts` - Pricing hooks

---

## Phase 5: Orders

**Database Schema:**
```sql
CREATE TYPE order_status AS ENUM (
  'draft',
  'pending_payment',
  'on_hold',
  'cancelled',
  'refunded',
  'completed'
);

CREATE TYPE payment_method AS ENUM ('bank', 'cash', 'none');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),

  status order_status NOT NULL DEFAULT 'draft',
  payment_method payment_method,

  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,

  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_date DATE,
  delivery_notes TEXT,
  internal_notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),

  -- Immutable snapshot at time of sale
  product_name TEXT NOT NULL,
  product_sku TEXT,
  unit_type unit_type NOT NULL,

  quantity DECIMAL(10,3) NOT NULL,
  unit_price INTEGER NOT NULL, -- cents (price at sale)
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount INTEGER NOT NULL,
  line_total INTEGER NOT NULL,

  notes TEXT,
  meta JSONB, -- custom fields

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES product_batches(id),
  quantity_used DECIMAL(10,3) NOT NULL,
  unit_cost INTEGER NOT NULL -- for profit calculation
);

CREATE TABLE order_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed_cart', 'fixed_product'
  description TEXT,
  amount INTEGER NOT NULL,
  applied_to_item_id UUID REFERENCES order_items(id)
);

CREATE TABLE order_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL, -- 'delivery', 'custom'
  description TEXT,
  amount INTEGER NOT NULL
);
```

**Features:**
- [ ] Order list with status filters
- [ ] Create order flow:
  - [ ] Select customer
  - [ ] Add products (search, browse, scan)
  - [ ] Quantity input by unit type
  - [ ] Line item notes and meta fields
  - [ ] Price override (permission controlled)
  - [ ] Manual batch selection (optional)
- [ ] Discounts (percentage, fixed cart, fixed product)
- [ ] Fees (delivery, custom)
- [ ] Status management
- [ ] Past/future order dates
- [ ] Delivery notes
- [ ] Order cancellation (restore stock)
- [ ] Refund processing (restore stock)

**Components:**
- `OrdersPage.tsx` - List with filters
- `OrderCreatePage.tsx` - Create order flow
- `OrderDetailPage.tsx` - View/edit order
- `OrderItemRow.tsx` - Line item display
- `ProductSelector.tsx` - Search/browse/scan products
- `QuantityInput.tsx` - Adapts to unit type
- `DiscountForm.tsx` - Add discounts
- `FeeForm.tsx` - Add fees
- `OrderStatusBadge.tsx` - Status display
- `BarcodeScanner.tsx` - Camera scanner
- `useOrders.ts` - Order hooks

---

## Phase 6: Documents (PDF)

**Database Schema:**
```sql
CREATE TYPE document_type AS ENUM ('invoice', 'proforma', 'credit_note', 'packing_slip');

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  document_type document_type NOT NULL,
  document_number TEXT NOT NULL,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),

  pdf_url TEXT, -- Supabase storage URL

  UNIQUE(document_type, document_number)
);

CREATE TABLE document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company info
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_postal_city TEXT,
  company_country TEXT DEFAULT 'Netherlands',
  company_vat_number TEXT,
  company_kvk_number TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_logo_url TEXT,

  -- Bank info
  bank_name TEXT,
  bank_iban TEXT,
  bank_bic TEXT,
  payment_terms TEXT,

  -- Numbering
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_next_number INTEGER DEFAULT 1,
  proforma_prefix TEXT DEFAULT 'PRO-',
  proforma_next_number INTEGER DEFAULT 1,
  credit_note_prefix TEXT DEFAULT 'CN-',
  credit_note_next_number INTEGER DEFAULT 1,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- [ ] Generate Invoice PDF
- [ ] Generate Proforma PDF
- [ ] Generate Credit Note PDF
- [ ] Generate Packing Slip PDF
- [ ] Customizable templates
- [ ] Company logo and info
- [ ] Bank details and payment terms
- [ ] Sequential numbering (configurable prefix)
- [ ] NL/EU legal compliance
- [ ] PDF storage in Supabase

**Components:**
- `DocumentGenerator.tsx` - Generate PDFs
- `InvoiceTemplate.tsx` - Invoice PDF template
- `ProformaTemplate.tsx` - Proforma template
- `CreditNoteTemplate.tsx` - Credit note template
- `PackingSlipTemplate.tsx` - Packing slip template
- `DocumentSettings.tsx` - Owner settings page
- `DocumentPreview.tsx` - Preview before generate
- `useDocuments.ts` - Document hooks

---

## Phase 7: Analytics & Reports (Owner Only)

**Features:**
- [ ] Dashboard with KPIs:
  - [ ] Sales revenue (gross)
  - [ ] VAT totals
  - [ ] Order count
  - [ ] Items sold
  - [ ] Net profit (from batch costs)
- [ ] Top customers
- [ ] Top products
- [ ] Top categories
- [ ] Date range filters
- [ ] Sales by date/customer/product/category
- [ ] Margin report
- [ ] Stock valuation report
- [ ] Expiry reports

**Components:**
- `AnalyticsDashboard.tsx` - Main dashboard
- `SalesChart.tsx` - Revenue over time
- `TopCustomersChart.tsx` - Customer ranking
- `TopProductsChart.tsx` - Product ranking
- `ProfitReport.tsx` - Margin analysis
- `StockValuationReport.tsx` - Inventory value
- `DateRangePicker.tsx` - Filter component
- `useAnalytics.ts` - Analytics hooks

---

## Phase 8: Exports & Workflows

**Features:**
- [ ] Export to CSV/Excel:
  - [ ] Orders
  - [ ] Products
  - [ ] Customers
  - [ ] Stock
  - [ ] Expiry list
  - [ ] Audit log
- [ ] "Yesterday sold" refill report:
  - [ ] Items sold yesterday
  - [ ] Current stock
  - [ ] Suggested refill amount

**Components:**
- `ExportButton.tsx` - Generic export component
- `RefillReport.tsx` - Yesterday sold report
- `useExport.ts` - Export utilities

---

## Phase 9: Migration Tools

**Features:**
- [ ] WooCommerce import pipeline
- [ ] Import customers (with addresses, VAT)
- [ ] Import products (with barcodes, categories)
- [ ] Import orders (~6000)
  - [ ] Order lines with exact sold prices
  - [ ] Discounts and fees
  - [ ] Order dates and statuses
- [ ] Validation and error reporting
- [ ] Dry-run mode
- [ ] Mapping configuration

**Components:**
- `MigrationPage.tsx` - Import wizard
- `ImportCustomers.tsx` - Customer import
- `ImportProducts.tsx` - Product import
- `ImportOrders.tsx` - Order import
- `MigrationReport.tsx` - Validation results
- `useMigration.ts` - Import hooks

---

## Phase 10: Customer Portal (Phase 2)

**Features:**
- [ ] Customer login
- [ ] View order history
- [ ] View order status
- [ ] Download invoices/proformas
- [ ] Reorder from previous orders

---

## Agent Definitions

### Agent: database-architect
**Purpose:** Design and implement database schemas, migrations, RLS policies, triggers
**Scope:** Supabase SQL migrations
**Triggers:** New phase started, schema changes needed

### Agent: auth-security
**Purpose:** Implement authentication, session management, rate limiting, permissions
**Scope:** Auth flows, RLS policies, permission checks
**Triggers:** Phase 0 tasks

### Agent: ui-components
**Purpose:** Build reusable UI components following design system
**Scope:** src/components/ui/*, Tailwind styling
**Triggers:** New UI primitives needed

### Agent: feature-builder
**Purpose:** Implement complete features (pages + components + hooks + services)
**Scope:** Full feature implementation
**Triggers:** New feature phase

### Agent: pdf-generator
**Purpose:** Build PDF templates and generation logic
**Scope:** Document generation, templates
**Triggers:** Phase 6 tasks

### Agent: analytics-builder
**Purpose:** Implement charts, dashboards, and reports
**Scope:** Analytics features
**Triggers:** Phase 7 tasks

### Agent: migration-specialist
**Purpose:** Build import pipelines and data transformation
**Scope:** WooCommerce migration
**Triggers:** Phase 9 tasks

### Agent: mobile-optimizer
**Purpose:** Optimize UI for mobile-first experience
**Scope:** Responsive design, touch interactions
**Triggers:** After feature completion

### Agent: tester
**Purpose:** Test features, find bugs, verify business rules
**Scope:** All features
**Triggers:** After feature completion

---

## Current Status

- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Tailwind CSS v4 setup
- [x] Supabase connection
- [x] Basic layout (Sidebar, Header)
- [x] Sample Dashboard
- [x] **Phase 0: Core Platform** ✅ COMPLETED
- [x] **Phase 1: Customers** ✅ COMPLETED
- [x] **Phase 2: Products & Categories** ✅ COMPLETED
- [ ] **Phase 3: Inventory** ⏸️ POSTPONED (using simple stock for now)
- [ ] Phase 4: Pricing ← **NEXT**
- [ ] Phase 5: Orders
- [ ] Phase 6: Documents
- [ ] Phase 7: Analytics
- [ ] Phase 8: Exports
- [ ] Phase 9: Migration
- [ ] Phase 10: Customer Portal

---

## Next Steps

1. Start Phase 4: Customer-Specific Pricing
2. Create pricing database migration (customer_prices, price_history)
3. Build CustomerPricing component for setting custom prices
4. Implement price lookup logic (customer price > base price)
5. Add price history tracking
6. Then proceed to Phase 5: Orders
