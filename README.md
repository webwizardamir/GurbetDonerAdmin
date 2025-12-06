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

## Features (Planned)

### Admin Role
- Dashboard with KPIs overview
- Order management
- Customer management with balance tracking
- Product inventory control
- Invoice generation (PDF)
- Payment history
- Sales reports and analytics
- App settings

### Customer Role
- Personal dashboard
- Order history
- Invoice access
- Payment tracking
- Profile management

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
