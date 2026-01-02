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
| Internationalization | react-i18next (NL default, EN secondary) |

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

### Internationalization (i18n)
- **Languages**: Dutch (NL) as default, English (EN) as secondary
- **Library**: react-i18next with i18next-browser-languagedetector
- **Translation files**: `src/i18n/locales/nl.json` and `src/i18n/locales/en.json`
- **IMPORTANT**: When creating or modifying features, ALWAYS add translations to BOTH language files
  - Add Dutch (NL) translations FIRST
  - Add English (EN) translations SECOND
- **PDF Documents**: Always remain in Dutch regardless of app language (legal compliance)
- **Key naming**: Use nested keys like `section.subsection.key` (e.g., `orders.status.completed`)
- **Usage**:
  ```typescript
  import { useTranslation } from 'react-i18next'

  function MyComponent() {
    const { t } = useTranslation()
    return <button>{t('common.save')}</button>
  }
  ```

---

## Page Layout & Styling

### Global Layout Structure

The app uses a fixed sidebar + header layout with scrollable main content:

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (w-64)  │  Header (h-16, fixed)                 │
│ ┌─────────────┐ │  Title | Description    [Search][☀][🔔]│
│ │ Logo (h-16) │ ├─────────────────────────────────────────┤
│ ├─────────────┤ │                                         │
│ │ Nav (py-4)  │ │  Main Content (mt-16 px-6 py-4)        │
│ │ - Dashboard │ │                                         │
│ │ - Orders    │ │  ┌─────────────────────────────────┐   │
│ │ - ...       │ │  │  Page Content (space-y-4)       │   │
│ │             │ │  │                                 │   │
│ ├─────────────┤ │  └─────────────────────────────────┘   │
│ │ User Footer │ │                                         │
│ └─────────────┘ │                                         │
└─────────────────────────────────────────────────────────┘
```

### Layout Components

| Component | File | Dimensions |
|-----------|------|------------|
| Sidebar | `components/layout/Sidebar.tsx` | `w-64` (256px), full height |
| Header | `components/layout/Header.tsx` | `h-16` (64px), fixed top |
| Layout | `components/layout/Layout.tsx` | Wrapper with `mt-16 px-6 py-4` |

### Creating New Pages

**1. Add page metadata to Header.tsx:**
```typescript
// In PAGE_META object
'/your-route': { title: 'Page Title', description: 'Brief description' },
```

**2. Create page component:**
```typescript
// src/pages/YourPage.tsx
export default function YourPage() {
  return (
    <div className="space-y-4">
      {/* Page content - NO duplicate title, NO extra padding */}
      {/* Use space-y-4 for consistent vertical spacing */}
    </div>
  )
}
```

**3. Add route to App.tsx:**
```typescript
<Route path="your-route" element={<YourPage />} />
```

### Page Content Rules

| Rule | Details |
|------|---------|
| **No duplicate titles** | Header shows page title; don't repeat in page content |
| **No page-level padding** | Layout provides `px-6 py-4`; pages use `space-y-*` only |
| **Vertical spacing** | Use `space-y-4` (16px) or `space-y-6` (24px) between sections |
| **Card spacing** | Use `gap-4` for grid layouts |
| **Content wrapper** | Root element should be `<div className="space-y-4">` |

### Tailwind Spacing Reference

| Class | Pixels | Usage |
|-------|--------|-------|
| `space-y-4` / `gap-4` | 16px | Standard spacing between elements |
| `space-y-6` / `gap-6` | 24px | Larger spacing for major sections |
| `p-3` | 12px | Compact padding (info boxes, compact cards) |
| `p-4` | 16px | Standard padding (cards, sections) |
| `p-6` | 24px | Larger padding (main cards, modals) |

### Dark Mode

All components must support dark mode using Tailwind's `dark:` prefix:

```typescript
// Example: Card with dark mode support
<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
  <h3 className="text-slate-900 dark:text-white">Title</h3>
  <p className="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

**Color mappings:**
| Light Mode | Dark Mode |
|------------|-----------|
| `bg-white` | `dark:bg-slate-800` |
| `bg-slate-50` | `dark:bg-slate-900` |
| `text-slate-900` | `dark:text-white` |
| `text-slate-600` | `dark:text-slate-400` |
| `border-slate-200` | `dark:border-slate-700` |

### Component Styling Patterns

**Tables:**
```typescript
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
    <thead className="bg-slate-50 dark:bg-slate-900">
      {/* ... */}
    </thead>
    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
      {/* ... */}
    </tbody>
  </table>
</div>
```

**Info/Alert Boxes:**
```typescript
// Blue info box
<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
  <p className="text-sm text-blue-800 dark:text-blue-300">Info message</p>
</div>

// Red error box
<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
  <p className="text-sm text-red-700 dark:text-red-300">Error message</p>
</div>
```

**Buttons:**
```typescript
// Primary button
<button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
  Primary Action
</button>

// Secondary button
<button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
  Secondary Action
</button>
```

**Loading State:**
```typescript
<div className="flex items-center justify-center h-64">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
</div>
```

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

## Custom Agents

The project has specialized agents defined in `.claude/agents.md`. Use these for focused reviews and tasks:

| Agent | Purpose |
|-------|---------|
| `ui-ux` | UI/UX review, dark mode, responsive design, accessibility |
| `security` | Security audit, RLS policies, auth flows, input validation |
| `performance` | Performance optimization, bundle size, query efficiency |
| `database` | Schema design, migrations, RLS policies, indexes |
| `testing` | Write tests, verify business logic, regression testing |
| `code-review` | Code quality, conventions, best practices |
| `docs` | Documentation, comments, README files |
| `i18n` | Dutch/EU localization, date/currency formatting |

**Usage:** Ask Claude to "run the ui-ux agent" or "do a security review" to invoke specialized checks.

See `.claude/agents.md` for detailed checklists and scopes.
See `PLANNER.md` for build phases and feature specifications.
