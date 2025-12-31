# MelekHalalFood B2B Portal

A modern B2B e-commerce portal built with React, Vite, Tailwind CSS, and Supabase.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Database & Auth**: Supabase
- **Routing**: React Router DOM
- **Icons**: Lucide React
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

### Completed (Phases 0-2, 4)

**Phase 0: Core Platform**
- Authentication system (email + password login)
- Password reset flow
- Role-based access control (Owner, Shop Manager)
- Permission system with resource/action matrix
- Audit log system (append-only, tracks all changes)
- Session management with Supabase Auth

**Phase 1: Customers**
- Customer list with search and filters
- Create/edit customer with billing + shipping addresses
- VAT number support
- CSV import from WooCommerce
- Delete customer functionality

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

### Planned (Phases 3, 5-10)
- **Phase 3**: Inventory & Batch/Expiry tracking (FIFO/FEFO) - postponed
- **Phase 5**: Order management with discounts and fees
- **Phase 6**: PDF document generation (Invoice, Proforma, Credit Note)
- **Phase 7**: Analytics & Reports (Owner only)
- **Phase 8**: Exports & Workflows
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

## UI Components

### Navigation
- **Sidebar**: Fixed width (w-72), pill-shaped menu items
- **Header**: Sticky top bar with search, theme toggle, notifications

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
