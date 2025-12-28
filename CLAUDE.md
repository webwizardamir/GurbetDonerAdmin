# MelekHalalFood - B2B Halal Food Wholesale Management System

## Project Overview

A comprehensive B2B wholesale management platform for halal food distribution. The system handles customer management, inventory with batch/expiry tracking, order processing, document generation, and analytics.

**Target Users:**
- Owner: Full system access including analytics, costs, and profits
- Shop Manager: Operational access (no cost/profit visibility)

**Key Differentiators:**
- Batch/lot inventory with expiry tracking (FIFO/FEFO)
- Exact profit calculation from batch costs
- Customer-specific pricing
- Mobile-first design with barcode scanning
- Dutch/EU legal compliance for invoicing

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| PDF Generation | @react-pdf/renderer or jsPDF |
| Barcode Scanning | html5-qrcode or quagga2 |
| State Management | React Context + React Query |
| Forms | React Hook Form + Zod validation |
| Tables | TanStack Table |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router DOM v7 |

---

## Architecture Principles

### Database Design
- **Append-only audit log** - All mutations logged with who/when/old/new values
- **Batch inventory** - Stock received as batches with cost, expiry, lot number
- **Immutable order prices** - Sold prices stored at time of sale, never recalculated
- **Soft deletes** - Use `is_active` or `deleted_at` instead of hard deletes

### Security
- Row Level Security (RLS) on all tables
- Role-based access control (Owner vs Shop Manager)
- Shop Manager cannot access: COGS, cost fields, profit/margin, analytics, settings
- Rate limiting on auth endpoints
- Secure session management with auto-logout

### Data Flow
```
User Action → React Component → Supabase Client → PostgreSQL
                                      ↓
                              RLS Policy Check
                                      ↓
                              Audit Log Trigger
```

---

## Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `CustomerForm.tsx`)
- Pages: `PascalCase.tsx` in `/pages` folder
- Hooks: `useCamelCase.ts` (e.g., `useCustomers.ts`)
- Utils: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Types: `camelCase.ts` or in component file

### Component Structure
```
src/
├── components/
│   ├── ui/              # Reusable UI primitives (Button, Input, Modal)
│   ├── layout/          # Layout components (Sidebar, Header, PageWrapper)
│   ├── customers/       # Customer-specific components
│   ├── products/        # Product-specific components
│   ├── inventory/       # Inventory/batch components
│   ├── orders/          # Order-specific components
│   ├── documents/       # PDF generation components
│   └── analytics/       # Charts and reports
├── pages/               # Route pages
├── hooks/               # Custom React hooks
├── services/            # Supabase queries and mutations
├── context/             # React Context providers
├── types/               # TypeScript interfaces
├── utils/               # Helper functions
└── lib/                 # Third-party library configs
```

### Database Naming
- Tables: `snake_case` plural (e.g., `customers`, `order_items`)
- Columns: `snake_case` (e.g., `company_name`, `created_at`)
- Foreign keys: `{table_singular}_id` (e.g., `customer_id`)
- Indexes: `idx_{table}_{column}` (e.g., `idx_orders_customer_id`)

### TypeScript
- Use interfaces for object shapes
- Use enums for fixed sets (statuses, roles)
- Always type function parameters and returns
- Use `unknown` over `any` where possible

### Currency & Numbers
- Store prices as integers (cents) to avoid floating point issues
- Display with Euro formatting: `€1.234,56` (Dutch locale)
- Weight quantities allow decimals (kg)
- Package/piece quantities are integers

### Dates
- Store as `timestamptz` in database
- Display in Dutch format: `DD-MM-YYYY`
- Support past/future order dates

---

## Key Business Rules

### Stock Management
1. Stock deducted when order is **created** (not on delivery)
2. Cancelled orders restore stock (if before delivery)
3. Refunds restore stock (full or partial based on refunded quantities)
4. FIFO or FEFO (soonest expiry first) for batch consumption

### Pricing
1. Base price per product
2. Customer-specific prices override base price
3. Sold price stored immutably on order line
4. Price changes never affect historical orders

### Documents
1. Sequential invoice numbering (legal requirement)
2. Separate sequences: Invoice, Proforma, Credit Note
3. Required fields for Dutch/EU compliance
4. No order locking after invoice - but all changes logged

### Roles
| Permission | Owner | Shop Manager |
|------------|-------|--------------|
| Customers | Full | View/Create/Edit |
| Products | Full | View/Create/Edit (no cost) |
| Orders | Full | View/Create/Edit/Refund |
| Documents | Full | Generate/Download |
| Inventory | Full | View/Adjust (no cost) |
| Analytics | Full | None |
| Settings | Full | None |
| Audit Log | View | None |

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# App
VITE_APP_NAME=MelekHalalFood
VITE_DEFAULT_CURRENCY=EUR
VITE_DEFAULT_LOCALE=nl-NL
VITE_DEFAULT_TIMEZONE=Europe/Amsterdam
```

---

## Migration Notes (WooCommerce)

Migrating from WooCommerce:
- ~6000 orders to import
- Preserve exact sold prices for analytics accuracy
- Map WooCommerce statuses to new status model
- Import customers with VAT numbers and addresses
- Import products with barcodes and categories
- Generate migration report with validation errors

---

## Development Workflow

1. **Feature Branch** - Create branch per feature
2. **Database First** - Write migrations before UI
3. **Types Second** - Update TypeScript types
4. **Services Third** - Create Supabase service functions
5. **Components Last** - Build UI components
6. **Test** - Verify on mobile viewport

---

## Agent Definitions

See `PLANNER.md` for build phases and agent assignments.
