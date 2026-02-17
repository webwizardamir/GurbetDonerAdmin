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
- [x] **User Management** (Owner only):
  - [x] Create users from app (no Supabase dashboard needed)
  - [x] Supabase Edge Function for secure user creation
  - [x] Set email, password, full name, and role
  - [x] Edit user name and role
  - [x] Activate/deactivate users

**Components:**
- `LoginPage.tsx` - Login form
- `ForgotPasswordPage.tsx` - Password reset request
- `ResetPasswordPage.tsx` - New password form
- `AuthProvider.tsx` - Auth context with session management
- `Users.tsx` - User management page (Owner only)
- `supabase/functions/create-user/` - Edge Function for user creation

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
- [x] Customer Detail page (/customers/:id) with:
  - [x] Customer info header (company, contact)
  - [x] Revenue stats (total revenue, orders, avg value, items, payment breakdown)
  - [x] Orders tab with expandable order rows
  - [x] Search and date range filter for orders
  - [x] Document buttons per order (6 types with checkmarks for existing)
  - [x] Details tab (contact info, addresses, notes)
- [ ] Quick reorder from last order (future enhancement)

**Components:**
- `CustomersPage.tsx` - List page with table (desktop) / cards (mobile)
- `CustomerForm.tsx` - Create/edit modal form
- `CustomerImport.tsx` - CSV import modal for WooCommerce data
- `CustomerDetail.tsx` - Full customer detail page with tabs
- `CustomerOrderRow.tsx` - Expandable order row with document buttons
- `useCustomers.ts` - CRUD hooks
- `useCustomerDetail.ts` - Customer detail with orders and stats

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

## Phase 4: Pricing System ✅ COMPLETED

**Database Schema:**
```sql
-- Multi-unit pricing per product
CREATE TABLE product_unit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_type unit_type NOT NULL,
  price INTEGER,  -- cents, NULL = unit type not available for sale
  cost_cents INTEGER,  -- Owner only
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, unit_type)
);

-- Customer-specific pricing with unit type support
CREATE TABLE customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  unit_type unit_type,  -- NULL means applies to all unit types

  custom_price INTEGER NOT NULL, -- cents

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, product_id, unit_type)
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_price_id UUID REFERENCES customer_prices(id),
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock unit type on products table
ALTER TABLE products ADD COLUMN stock_unit_type unit_type;
```

**Features:**
- [x] View base prices per product
- [x] Set customer-specific price per product
- [x] Price history tracking (auto-logged via trigger)
- [x] Reset to base price functionality
- [x] get_effective_price() database function for orders
- [x] **Multi-Unit-Type Pricing** ✅ NEW
  - [x] Single product can have multiple unit types (piece, zak, doos, kg)
  - [x] Each unit type has its own price and cost
  - [x] One unit type marked as default (shown first in forms)
  - [x] Product form with unit price table editor
  - [x] Order form with unit type selector dropdown
  - [x] Stock tracked in user-selected unit type
  - [x] Customer pricing per unit type supported
  - [x] Backward compatible (existing products migrated automatically)
- [ ] Bulk price update (future enhancement)

**Components:**
- `CustomerPricing.tsx` - Set prices for customer (accessed from Customers page)
- `PriceHistoryModal.tsx` - View price changes
- `usePricing.ts` - Pricing hooks
- `pricing.ts` - Pricing service

---

## Phase 5: Orders ✅ COMPLETED

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
-- payment_method is required when completing an order (Cash or Bank selection modal)

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
- [x] Order list with status filters
- [x] Create order flow:
  - [x] Select customer
  - [x] Add products (search by name, SKU, barcode)
  - [x] Quantity input by unit type
  - [x] Customer-specific pricing applied automatically
  - [ ] Line item notes and meta fields
  - [ ] Price override (permission controlled)
  - [ ] Manual batch selection (optional)
- [ ] Discounts (percentage, fixed cart, fixed product)
- [ ] Fees (delivery, custom)
- [x] Status management (draft, pending, on_hold, completed, cancelled, refunded)
- [x] Payment method selection modal (Cash/Bank) when completing orders
- [x] Payment method filter in Orders list
- [x] Payment badge display (Cash/Bank) next to status
- [x] Past/future order dates
- [x] Delivery notes
- [x] Order cancellation (restore stock via trigger)
- [x] Refund processing (restore stock via trigger)
- [x] Auto-generated order numbers (ORD-YYYY-NNNNN)
- [x] **Bulk actions** for orders:
  - [x] Bulk complete (with payment method selection)
  - [x] Bulk cancel
  - [x] Bulk delete (for draft/pending/on_hold orders)

**Components:**
- `OrdersPage.tsx` - List with filters (status, payment method)
- `PaymentMethodModal.tsx` - Cash/Bank selection when completing order
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

## Phase 6: Documents (PDF) ✅ COMPLETED

**Database Schema:**
```sql
CREATE TYPE document_type AS ENUM ('invoice', 'proforma', 'credit_note', 'packing_slip', 'order_confirmation', 'payment_reminder');

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  document_type document_type NOT NULL,
  document_number TEXT NOT NULL,
  snapshot JSONB, -- Full data snapshot at generation time
  pdf_url TEXT,
  file_size INTEGER,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_number)
);

CREATE TABLE document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Company Identity
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_postal_code TEXT,
  company_city TEXT,
  company_country TEXT DEFAULT 'Netherlands',
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  -- Legal Registration
  company_vat_number TEXT,
  company_kvk_number TEXT,
  -- Bank Details
  bank_name TEXT,
  bank_iban TEXT,
  bank_bic TEXT,
  bank_account_holder TEXT,
  -- Payment Terms
  payment_terms_days INTEGER DEFAULT 14,
  payment_terms_text TEXT,
  -- Numbering (per document type)
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_next_number INTEGER DEFAULT 1,
  proforma_prefix TEXT DEFAULT 'PRO-',
  proforma_next_number INTEGER DEFAULT 1,
  credit_note_prefix TEXT DEFAULT 'CN-',
  credit_note_next_number INTEGER DEFAULT 1,
  packing_slip_prefix TEXT DEFAULT 'PS-',
  packing_slip_next_number INTEGER DEFAULT 1,
  -- Customizable Labels (all document text is configurable)
  label_invoice TEXT DEFAULT 'FACTUUR',
  label_proforma TEXT DEFAULT 'PROFORMA',
  -- ... (full set of customizable labels)
  footer_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- [x] Generate Invoice PDF (@react-pdf/renderer)
- [x] Generate Proforma PDF (unique template with validity period)
- [x] Generate Credit Note PDF (unique template with negative amounts)
- [x] Generate Packing Slip PDF (no prices, delivery-focused)
- [x] Generate Order Confirmation (Orderbevestiging) PDF
- [x] Generate Payment Reminder (Betalingsherinnering) PDF
- [x] Each document type has unique design and Dutch content
- [x] Dutch unit types: kg, stuk/stuks, pak/pakken
- [x] Company logo and info from settings
- [x] Bank details and payment terms
- [x] Sequential numbering (configurable prefix per document type)
- [x] NL/EU legal compliance (KVK, BTW, IBAN)
- [x] All text labels customizable (Dutch defaults)
- [x] PDF preview before download
- [x] Print functionality
- [x] Payment method checkboxes (Contant, PIN, Open/Bank, Oude Facturen)
- [x] Signature/receipt fields (Ontvangst)
- [x] Payment terms message display
- [x] Table with VAT breakdown (Excl. BTW, BTW bedrag, Incl. BTW)
- [ ] PDF storage in Supabase (local download only for now)
- [x] **Invoices/Documents list page enhancements:**
  - [x] Customer name column (from snapshot)
  - [x] Order number column (clickable link to order)
  - [x] Multi-field search (number, customer, order)
  - [x] All 6 document types in type filter dropdown
  - [x] Date range filter (Today, This Week, This Month, This Year, Custom)
  - [x] Customer filter dropdown (built from loaded documents)
  - [x] Sortable columns (date, customer, doc number, type)
  - [x] Summary stat cards (Total, Invoices, Credit Notes, Other)
  - [x] Bulk selection with checkboxes (select-all, row highlight)
  - [x] Bulk download (sequential PDF generation)
  - [x] Bulk delete (permission-gated with confirmation)
  - [x] CSV export with document columns
  - [x] Clickable type badges (click to filter)
  - [x] Type-specific icon colors per document type
  - [x] Result count display ("X van Y documenten")
  - [x] Richer mobile cards with customer/order info
  - [x] i18n translations for all new features (NL + EN)

**Components:**
- `DocumentGenerator.tsx` - Modal for preview/download/print
- `InvoiceTemplate.tsx` - Full invoice (green theme):
  - Payment method checkboxes, signature fields
  - Factuurdatum & Leverdatum labels
  - Factuurnummer in metadata (no separate badge)
  - VAT breakdown (Excl. BTW, BTW bedrag, Incl. BTW)
- `ProformaTemplate.tsx` - Quote/Offerte (blue theme):
  - "Dit is geen factuur" disclaimer
  - Validity period (Geldig tot), conditions section
  - No payment checkboxes
- `OrderConfirmationTemplate.tsx` - Order confirmation (cyan theme):
  - "Bedankt voor uw bestelling" banner
  - Order summary, next steps section
  - Contact info, no payment details
- `PaymentReminderTemplate.tsx` - Payment reminder (red theme):
  - Days overdue calculation
  - Escalating urgency messages (1st, 2nd, final notice)
  - Prominent bank details
- `CreditNoteTemplate.tsx` - Credit note (purple theme):
  - Negative amounts shown in green
  - Reference to original order
  - Processing/refund info
- `PackingSlipTemplate.tsx` - Delivery slip (blue theme):
  - No prices, item checkboxes
  - Sender/receiver signature fields
- `DocumentSettings.tsx` - Settings page with tabs:
  - Company (name, address, logo, registration)
  - Bank & Payment (IBAN, BIC, payment terms)
  - Numbering (prefix and next number per type)
  - Labels (all customizable text)
- `useDocumentSettings.ts` - Settings hook

**Document Footer Design (all templates):**
- Consistent two-column footer: company name/address on left, KVK/BTW on right
- IBAN displayed prominently in footer (Invoice, Order Confirmation, Proforma, Credit Note, Payment Reminder)
- Theme-colored top border per document type (green, cyan, blue, purple, red, dark)
- Optional custom footer text centered below
- No client number (Klantnummer) in any document metadata

---

## Phase 7: Analytics & Reports ✅ COMPLETED

**Features:**
- [x] Dashboard with KPIs:
  - [x] Total revenue (from completed/delivered orders)
  - [x] Total orders count
  - [x] Items sold count
  - [x] Average order value
  - [x] Period-over-period growth indicators
- [x] Payment method breakdown (Cash vs Bank revenue/order counts)
- [x] Revenue chart (area chart with gradient, daily data)
- [x] Orders by status (donut chart with status colors)
- [x] Top customers by revenue (horizontal bar chart)
- [x] Top products by revenue (horizontal bar chart)
- [x] Date range picker with presets (Today, 7/30/90 days, month, year, custom)
- [x] Full dark/light mode support with theme-aware chart colors
- [x] Responsive layout (mobile-first grid)
- [x] Owner-only access (non-owners redirected)
- [ ] Margin report (requires batch costs - postponed with Phase 3)
- [ ] Stock valuation report (future enhancement)

**Components:**
- `Analytics.tsx` - Main dashboard page (Owner only)
- `RevenueChart.tsx` - Area chart with gradient fill
- `OrdersChart.tsx` - Donut chart for orders by status
- `TopCustomersChart.tsx` - Horizontal bar chart ranking
- `TopProductsChart.tsx` - Horizontal bar chart ranking
- `DateRangePicker.tsx` - Date range selector with custom option
- `ChartColors.ts` - Chart color palette for light/dark modes
- `useAnalytics.ts` - Analytics data hook
- `analytics.ts` - Supabase analytics service

---

## Phase 8: Exports & Workflows (Partial)

**Features:**
- [x] "Sold Products" refill report page:
  - [x] Items sold in date range (default: yesterday)
  - [x] Date range presets (yesterday, today, last 7 days, this week, last week)
  - [x] Custom date range filter (start/end date picker)
  - [x] Includes all orders except cancelled/refunded (for accurate refill planning)
  - [x] Summary cards (products, total qty, low stock) - revenue Owner-only
  - [x] Desktop table view with product details
  - [x] Mobile card view for responsive design
  - [x] Revenue column/card hidden from Shop Manager (Owner-only)
  - [x] Current stock display (if track_stock enabled)
  - [x] Stock status indicators (Critical, Low, OK, Not Tracked)
  - [x] Suggested refill amounts (3-day buffer)
  - [x] Copy to clipboard functionality
  - [x] Print functionality
  - [x] PDF export (no revenue - refill workflow only)
- [x] Export to CSV:
  - [x] Orders (with filters applied)
  - [x] Products (with filters applied)
  - [x] Customers (with filters applied)
  - [ ] Stock (pending - Phase 3 postponed)
  - [ ] Expiry list (pending - Phase 3 postponed)
  - [ ] Audit log (pending - low priority)

**Components:**
- `SoldProducts.tsx` - Sold products report page
- `SoldProductsTemplate.tsx` - PDF template for sold products export
- `soldProducts.ts` - Service functions (getSoldProducts, getStockStatus, getSuggestedRefill)
- `useSoldProducts.ts` - Hook for state management
- `export.ts` - CSV export utilities (toCSV, downloadCSV, exportToCSV, column configs)

---

## Global Features: Search, Reminders & UI ✅ COMPLETED

### Global Search
- [x] Search bar in header
- [x] Search across orders, customers, products, invoice numbers
- [x] Debounced queries (300ms) for performance
- [x] Results dropdown with type icons
- [x] Click-to-navigate functionality

**Components:**
- `Header.tsx` - Global search implementation
- `search.ts` - Search service with globalSearch()

### Reminder System ✅ COMPLETED

**Database Schema:**
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  notes TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Features:**
- [x] Create reminders with title, notes, date, time
- [x] Notification dropdown in header with badge count
- [x] On-screen toast alerts when due
- [x] Notification sound (Web Audio API melody)
- [x] Custom snooze durations (5m, 15m, 30m, 1h, 2h, 1 day)
- [x] Edit reminders (title, notes, reschedule)
- [x] Dismissed reminders visible for 24 hours
- [x] Reactivate dismissed reminders
- [x] Auto-polling every 30 seconds
- [x] Past-due reminders appear when user comes online

**Components:**
- `Header.tsx` - Notification dropdown with reminder management
- `ReminderAlert.tsx` - Toast-style on-screen alerts
- `reminders.ts` - CRUD service for reminders
- `useReminders.ts` - Hook with polling and alert events
- `notificationSound.ts` - Web Audio API sound utility

### UI/UX Enhancements ✅ COMPLETED
- [x] Custom scrollbars (light & dark mode)
- [x] Thin, rounded scrollbar design
- [x] Hover effects on scrollbar thumb
- [x] Firefox and WebKit browser support
- [x] Utility classes: `.scrollbar-thin`, `.scrollbar-hidden`

**Files:**
- `index.css` - Custom scrollbar styles

### Mobile Responsive Design ✅ COMPLETED
- [x] Collapsible sidebar with slide-in/out animation
- [x] Mobile hamburger menu in header
- [x] Mobile search overlay (full-width)
- [x] Responsive notification dropdown
- [x] Mobile card views for all data tables:
  - [x] Orders (with simplified layout)
  - [x] Customers (with three-dot action menu)
  - [x] Products
  - [x] Invoices
- [x] Responsive filter rows (`flex-wrap` for mobile)
- [x] Three-dot action menus (icon + text dropdown)
- [x] Overflow protection (`overflow-x-hidden`, `min-w-0`)
- [x] Auto-close sidebar on route change and Escape key

**Components:**
- `Layout.tsx` - Sidebar state, overflow handling
- `Sidebar.tsx` - Mobile slide animation, close button
- `Header.tsx` - Hamburger menu, mobile search overlay
- `Customers.tsx` - CustomerActionMenu dropdown component

---

### Multi-Language Support (i18n) ✅ COMPLETED

**Features:**
- [x] Dutch (NL) as default language
- [x] English (EN) as secondary language
- [x] Language selector in header (globe icon with flag indicators)
- [x] Language preference stored in localStorage
- [x] All UI components translated (pages, modals, forms, buttons)
- [x] **PDF documents always remain in Dutch** (legal compliance)

**Translation Files:**
- `src/i18n/locales/nl.json` - Dutch translations (primary)
- `src/i18n/locales/en.json` - English translations (secondary)
- `src/i18n/index.ts` - i18n configuration

**Translated Components:**
- All pages (Dashboard, Customers, Products, Orders, etc.)
- All forms (CustomerForm, ProductForm, OrderForm, etc.)
- All modals (OrderDetail, PaymentMethodModal, etc.)
- Navigation (Sidebar, Header)
- Status badges and action buttons
- Validation messages and error messages

**Usage in Components:**
```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <h1>{t('page.title')}</h1>
}
```

**Important Notes:**
- PDF templates (invoices, proforma, etc.) are NOT translated - they always use Dutch text for legal compliance
- When adding new features, always add translations to BOTH nl.json (first) and en.json (second)
- Use nested keys: `section.subsection.key` (e.g., `orders.status.completed`)

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

## Phase 10: Customer Portal ✅ COMPLETED

**Database Schema:**
```sql
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id),
  UNIQUE(user_id)
);
```

**Features:**
- [x] Customer portal login (/portal/login)
- [x] Separate auth session from admin (different storage key)
- [x] Portal home with stats (total orders, pending, completed, total spent)
- [x] View order history with search and status filters
- [x] Order detail view with items and totals
- [x] Download documents (invoices, proforma, etc.) per order
- [x] Account page with company info and addresses
- [x] Password change functionality
- [x] Forgot password flow
- [x] Portal access management (admin side):
  - [x] Enable/disable portal access per customer
  - [x] Create portal user with email and password
  - [x] Random password generator
  - [x] Show/hide password toggle
  - [x] Copy credentials (link, email, password, or all)
  - [x] Send via email button (opens email client with pre-filled message)
  - [x] Last login tracking
- [ ] Reorder from previous orders (future enhancement)

**Components:**
- `src/pages/portal/` - Portal pages (Login, Home, Orders, OrderDetail, Documents, Account)
- `src/services/portalAuth.ts` - Portal authentication service
- `src/services/portalOrders.ts` - Portal orders/documents service
- `src/components/customers/PortalAccessModal.tsx` - Admin portal management modal
- `supabase/functions/create-user/` - Edge Function (supports 'customer' role)

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
- [x] **Phase 4: Pricing** ✅ COMPLETED
- [x] **Phase 5: Orders** ✅ COMPLETED
- [x] **Phase 6: Documents** ✅ COMPLETED
- [x] **Phase 7: Analytics** ✅ COMPLETED
- [x] **Phase 8: Exports** ✅ COMPLETED
- [ ] Phase 9: Migration ⏳ (after full testing - large data import)
- [x] **Phase 10: Customer Portal** ✅ COMPLETED

---

## Next Steps

1. ~~Complete Phase 8: Exports & Workflows~~ ✅ DONE
   - [x] "Sold Products" refill report with PDF export ✅
   - [x] CSV export for orders, products, customers ✅
2. ~~Global Features~~ ✅ DONE
   - [x] Global search bar
   - [x] Reminder system with notifications
   - [x] User management from app (Edge Function)
   - [x] Custom scrollbar styling
3. ~~Phase 10: Customer Portal~~ ✅ DONE
   - [x] Customer login and session management
   - [x] Order history and document download
   - [x] Portal access management from admin
   - [x] Email credentials to customers
4. Phase 9: WooCommerce migration - **after all features tested and stable**
   - Large data import (~6000 orders) requires stable system first
   - Need thorough testing of all features before migration
5. Future optimizations (after web app complete):
   - Code-splitting for PDF/Recharts (lazy loading for faster initial load)
   - Mobile barcode scanning for order creation
   - Reorder from previous orders in customer portal

---

## Bug Fixes & Issues Resolved

### Analytics - Top Products Chart (Fixed)
- **Issue**: Chart showed €0-4 range with empty bars, tooltip showed "revenue: 0"
- **Cause**: Analytics service was querying `line_total` column but data is stored in `total` column in `order_items` table
- **Fix**: Updated `getTopProducts()` in `analytics.ts` to select `total` instead of `line_total`

### User Creation (Fixed)
- **Issue**: Could not create users from app, required going to Supabase dashboard
- **Cause**: Client-side Supabase uses anon key which can't create auth users
- **Fix**: Created Supabase Edge Function (`create-user`) that runs server-side with service_role key

### Notification Sound (Fixed)
- **Issue**: No sound played when reminder alerts appeared
- **Cause**: Browser autoplay policy blocks audio until user interaction
- **Fix**: Created `notificationSound.ts` utility that initializes AudioContext on first user interaction

### Mobile Horizontal Scroll (Fixed)
- **Issue**: Customers page (and others) caused horizontal scroll on mobile
- **Cause**: Action icon buttons in rows caused content to overflow viewport width
- **Fix**:
  - Added `overflow-x-hidden` and `min-w-0` to Layout.tsx containers
  - Replaced action icon rows with three-dot dropdown menus
  - Added `truncate` and `min-w-0` to text containers

### Audit Log Empty (Fixed)
- **Issue**: Audit log page showed no entries even after creating/updating data
- **Cause**: Migration 00010 checked for `audit_log_changes` function, but actual function was named `log_audit_event`. Triggers were never attached to tables.
- **Fix**: Created migration 00028 that:
  - Creates the `log_audit_event()` function if not exists
  - Creates `audit_logs` table with proper RLS policies
  - Attaches audit triggers to all tables (profiles, customers, products, orders, order_items, customer_prices, documents, reminders, customer_accounts, categories)

### Dropdown Overflow on Customers Page (Fixed)
- **Issue**: Three-dot action menu went below container when only one search result, causing scroll
- **Cause**: Dropdown with `absolute` positioning was constrained by parent's `overflow-x-auto`
- **Fix**: Implemented React Portal to render dropdown at `document.body` level with `position: fixed` and viewport boundary calculations

---

## Recent Enhancements

### Decimal Quantities Support ✅
- **Feature**: All product types now support decimal quantities (not just kg)
- **Use Cases**: 1.5 packages, 0.75 kg, 2.25 pieces
- **Database Changes**:
  - `products.stock_quantity`: Changed from INTEGER to DECIMAL(10,3)
  - `order_items.quantity`: Changed from INTEGER to DECIMAL(10,3)
- **Smart Formatting** (`src/utils/format.ts`):
  - `formatQuantity()`: Trims trailing zeros, max 3 decimals
  - `formatQuantityWithUnit()`: Adds translated unit labels (singular/plural)
  - Examples: "5" (not "5.000"), "1.5 kg", "2 stuks", "1 pak"
- **Updated Components**: OrderForm, ProductForm, SoldProducts, Analytics, OrderDetail, TopProductsChart

### Desktop Layout Optimization ✅
- **Feature**: Combined search bar and filters into single row on desktop
- **Pages Updated**: Orders, Customers, Products
- **Layout**:
  - Search bar: Fixed width (sm:w-64 lg:w-80) instead of full width
  - Filters: Inline next to search on desktop
  - Action buttons: Export, Import, Categories inline
  - Green main button: Pushed to far right via flex spacer
- **Mobile**: Still stacks vertically for touch-friendly interaction

### Multi-Unit-Type Pricing ✅
- **Feature**: Products can have multiple unit types with different prices
- **Example**: "Burger" available as Stuk (€2.50), Zak (€12.00), Doos (€45.00)
- **Database Changes**:
  - New `product_unit_prices` table (product_id, unit_type, price, cost_cents, is_default)
  - Added `stock_unit_type` column to products table
  - Added `unit_type` column to customer_prices table
- **Product Form**: Table-based unit price editor with checkboxes, prices, costs, default radio
- **Order Form**: Unit type dropdown when product has multiple prices
- **Pricing Logic**: customer price (unit) → customer price (all) → product unit price → base price
- **Migration**: Existing products auto-migrated to new format
- **Files Added/Modified**:
  - `supabase/migrations/00033_product_unit_prices.sql`
  - `src/services/productUnitPrices.ts` (new)
  - `src/types/index.ts` (ProductUnitPrice interface)
  - `src/services/products.ts`, `src/services/pricing.ts`
  - `src/components/products/ProductForm.tsx`
  - `src/components/orders/OrderForm.tsx`
  - `src/hooks/useProducts.ts`
