# MelekHalalFood B2B Portal

A modern B2B e-commerce portal built with React, Vite, Tailwind CSS, and Supabase.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Database & Auth**: Supabase
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **PDF Generation**: @react-pdf/renderer
- **Charts**: Recharts
- **Deployment**: Vercel Edge Functions

## Design Philosophy

The UI follows a "Modern, Clean, & Airy" aesthetic designed for high-volume B2B usage with:
- Minimalist, pill-shaped UI elements
- Subtle borders instead of heavy shadows
- Full responsive Light & Dark Mode support
- Inter font family for clean typography

## Color Palette

### Primary Colors
- **Brand Green**: `green-600` (#16a34a) - Primary buttons, active states
- **Hover Green**: `green-700` - Hover interactions

### Surfaces & Backgrounds
- **Light Mode**: `slate-50` background, `white` cards
- **Dark Mode**: `slate-900` background, `slate-800` cards

### Status Colors (Pill Badges)
- **Pending/Low Stock**: Amber
- **Processing**: Blue
- **Delivered/Active**: Emerald
- **Cancelled/Out of Stock**: Rose
- **Invoices**: Violet

## Project Structure

```
src/
├── assets/          # Static assets (images, fonts)
├── components/      # Reusable UI components
├── context/         # React Context providers
├── hooks/           # Custom React hooks
├── layouts/         # Layout components (Sidebar, Header)
├── pages/           # Page components
├── services/        # API services (Supabase client)
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository** (if applicable)
   ```bash
   cd MelekHalalFood
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features

### Completed (Phases 0-2, 4-8)

**Phase 0: Core Platform**
- Authentication system (email + password login)
- Password reset flow
- Role-based access control (Owner, Shop Manager)
- Permission system with resource/action matrix
- Audit log system (append-only, tracks all changes)
- Session management with Supabase Auth
- **User Management**: Create users directly from app (Owner only)
  - Supabase Edge Function for secure user creation
  - Set email, password, name, and role
  - No need to access Supabase dashboard

**Phase 1: Customers**
- Customer list with search and filters
- Create/edit customer with billing + shipping addresses
- VAT number support
- CSV import from WooCommerce
- Delete customer functionality
- Customer Detail page with:
  - Revenue stats (total, orders, avg value, payment breakdown)
  - Order history with search and date range filter
  - Expandable order rows with document buttons
  - Document generation with checkmarks for existing docs
  - Contact info and address details

**Phase 2: Products & Categories**
- Product list with search and category filter
- Create/edit products with barcode, SKU, unit type
- Category management (simple flat list)
- Tax rate per product (BTW 9%, 21%, 0%)
- Stock quantity tracking
- Cost of Goods (COGS) - Owner only
- Track stock toggle per product
- Margin display for Owner role

**Phase 4: Customer-Specific Pricing**
- Set custom prices per customer per product
- Price history tracking (auto-logged)
- Reset to base price functionality
- Database function for effective price lookup

**Phase 5: Orders**
- Order creation with customer selection
- Product search with customer-specific pricing
- Auto-generated order numbers (ORD-YYYY-NNNNN)
- Status management (draft, pending, completed, cancelled, refunded)
- Payment method selection (Cash/Bank) when completing orders
- Payment method filter and badge display
- Stock deduction/restoration via database triggers
- Order detail view with status actions

**Phase 6: Documents (PDF)**
- Professional A4 templates with @react-pdf/renderer
- 6 unique document types, each with distinct design:
  - **Factuur**: Full invoice with payment methods, signatures, bank details
  - **Proforma**: Quote with validity period, "Dit is geen factuur" disclaimer
  - **Orderbevestiging**: Order confirmation with thank you message, next steps
  - **Betalingsherinnering**: Payment reminder with days overdue, urgency levels
  - **Credit Nota**: Credit note with negative amounts, refund processing info
  - **Pakbon**: Packing slip, delivery-focused, no prices, item checkboxes
- Document Settings page (company info, bank details, numbering)
- Customizable text labels (Dutch defaults)
- Dutch unit types: kg, stuk/stuks, pak/pakken
- Sequential document numbering per type (INV-00001, OB-00001, HR-00001, etc.)
- Payment method checkboxes (Contant, PIN, Open/Bank, Oude Facturen)
- VAT breakdown table (Excl. BTW, BTW bedrag, Incl. BTW)
- PDF preview, download, and print
- NL/EU legal compliance (KVK, BTW, IBAN)

**Phase 7: Analytics (Owner Only)**
- Dashboard with KPI stat cards (revenue, orders, items, avg order value)
- Payment method breakdown (Cash vs Bank revenue and order counts)
- Revenue chart with daily breakdown (area chart with gradient)
- Orders by status (donut chart with semantic colors)
- Top customers by revenue (horizontal bar chart)
- Top products by revenue (horizontal bar chart)
- Date range picker with presets (Today, 7/30/90 days, month, year, custom)
- Period-over-period growth indicators
- Full dark/light mode chart theming
- Responsive grid layout

**Phase 8: Exports & Reports**
- Sold Products page for daily refill workflow
- Date range presets (yesterday, today, week) + custom date picker
- Includes all orders except cancelled/refunded for accurate planning
- Summary cards (products count, total qty, low stock)
- Revenue visible to Owner role only (hidden from Shop Manager)
- Stock status indicators (Critical, Low, OK, Not Tracked)
- Suggested refill amounts based on sales (3-day buffer)
- Copy to clipboard, print, PDF export functionality
- PDF export without revenue (refill workflow focus)
- CSV export for Orders (with status/payment filters)
- CSV export for Products (with category filter)
- CSV export for Customers (with city filter)

**Global Search & Notifications**
- **Global Search Bar** (Header)
  - Search across orders, customers, products, and invoices
  - Debounced search with instant results dropdown
  - Type icons and click-to-navigate
- **Reminder System**
  - Create reminders with title, notes, date, and time
  - Notification dropdown in header with badge count
  - On-screen toast alerts when reminders are due
  - Pleasant notification sound (Web Audio API)
  - Snooze with custom duration (5m, 15m, 30m, 1h, 2h, 1 day)
  - Edit reminders (title, notes, reschedule)
  - Dismissed reminders stay visible for 24 hours
  - Reactivate dismissed reminders
  - Polls every 30 seconds for due reminders
  - Past-due reminders appear when user comes online

**UI/UX Enhancements**
- Custom scrollbars matching design system (light & dark mode)
- Thin, rounded scrollbars with hover effects
- Utility classes: `.scrollbar-thin`, `.scrollbar-hidden`

**Mobile Responsive Design**
- Collapsible sidebar navigation with slide-in animation
- Mobile hamburger menu in header
- Mobile search overlay with full-width search bar
- Responsive filter rows (wrap on mobile, inline on desktop)
- Mobile card views for all data tables (Orders, Customers, Products, Invoices)
- Three-dot action menus replacing icon rows (cleaner UI)
- Overflow protection preventing horizontal scroll
- Touch-friendly UI elements and spacing

### Planned (Phases 3, 9-10)
- **Phase 3**: Inventory & Batch/Expiry tracking (FIFO/FEFO) - postponed
- **Phase 9**: WooCommerce migration tools
- **Phase 10**: Customer portal

### Role Permissions
| Feature | Owner | Shop Manager |
|---------|-------|--------------|
| Customers | Full | View/Create/Edit |
| Products | Full | View/Create/Edit (no COGS) |
| Orders | Full | View/Create/Edit/Refund |
| Documents | Full | Generate/Download |
| Inventory | Full | View/Adjust (no cost) |
| Analytics | Full | None |
| Settings | Full | None |
| Audit Log | View | None |
| User Management | Create/Edit/Deactivate | None |
| Reminders | Full (personal) | Full (personal) |

## UI Components

### Navigation
- **Sidebar**: Fixed width (w-64), pill-shaped menu items
  - Collapsible on mobile (slide-in/out animation)
  - Auto-closes on route change and Escape key
  - Mobile close button
- **Header**: Sticky top bar with:
  - Mobile hamburger menu button
  - Global search (desktop dropdown, mobile overlay)
  - Dark/light theme toggle
  - Notification bell with reminder count badge
  - Reminder dropdown with create/edit/snooze functionality

### Data Tables
- Rounded corners (rounded-2xl)
- Clickable rows with hover effects
- Right-aligned action buttons

### Forms
- Large rounded inputs (rounded-xl)
- Searchable dropdowns
- Focus ring with brand green

### Modals
- Backdrop blur effect
- Zoom-in + Fade-in animation

## Development Guidelines

1. Use TypeScript for all new files
2. Follow the existing folder structure
3. Use Tailwind CSS utility classes (avoid custom CSS)
4. Implement responsive design (mobile-first)
5. Support both light and dark modes
6. Use Lucide React for all icons

## License

Proprietary - MelekHalalFood

## Support

For issues and questions, contact the development team.
