// Chart color palette for light and dark modes
// Uses Tailwind color values for consistency with the design system

export const CHART_COLORS = {
  light: {
    primary: '#16a34a',      // green-600 - revenue, main metrics
    primaryLight: '#22c55e', // green-500 - gradients
    secondary: '#3b82f6',    // blue-500 - orders
    accent: '#8b5cf6',       // violet-500 - customers
    warning: '#f59e0b',      // amber-500 - pending
    danger: '#ef4444',       // red-500 - cancelled
    success: '#10b981',      // emerald-500 - completed
    muted: '#94a3b8',        // slate-400 - inactive
    grid: '#e2e8f0',         // slate-200 - grid lines
    text: '#1e293b',         // slate-800 - primary text
    textSecondary: '#64748b', // slate-500 - secondary text
    background: '#ffffff',   // white - tooltip bg
    cardBg: '#f8fafc',       // slate-50 - card backgrounds
  },
  dark: {
    primary: '#22c55e',      // green-500
    primaryLight: '#4ade80', // green-400 - gradients
    secondary: '#60a5fa',    // blue-400
    accent: '#a78bfa',       // violet-400
    warning: '#fbbf24',      // amber-400
    danger: '#f87171',       // red-400
    success: '#34d399',      // emerald-400
    muted: '#64748b',        // slate-500
    grid: '#334155',         // slate-700 - grid lines
    text: '#f1f5f9',         // slate-100 - primary text
    textSecondary: '#94a3b8', // slate-400 - secondary text
    background: '#1e293b',   // slate-800 - tooltip bg
    cardBg: '#0f172a',       // slate-900 - card backgrounds
  },
}

// Status-specific colors (for order status charts)
export const STATUS_COLORS = {
  light: {
    completed: '#10b981',    // emerald-500
    delivered: '#22c55e',    // green-500
    pending_payment: '#f59e0b', // amber-500
    processing: '#3b82f6',   // blue-500
    on_hold: '#8b5cf6',      // violet-500
    cancelled: '#ef4444',    // red-500
    refunded: '#a855f7',     // purple-500
    draft: '#94a3b8',        // slate-400
  },
  dark: {
    completed: '#34d399',    // emerald-400
    delivered: '#4ade80',    // green-400
    pending_payment: '#fbbf24', // amber-400
    processing: '#60a5fa',   // blue-400
    on_hold: '#a78bfa',      // violet-400
    cancelled: '#f87171',    // red-400
    refunded: '#c084fc',     // purple-400
    draft: '#64748b',        // slate-500
  },
}

// Hook to get current theme colors
export function useChartColors() {
  // Check if dark mode is active
  const isDark = typeof window !== 'undefined'
    && document.documentElement.classList.contains('dark')

  return {
    colors: isDark ? CHART_COLORS.dark : CHART_COLORS.light,
    statusColors: isDark ? STATUS_COLORS.dark : STATUS_COLORS.light,
    isDark,
  }
}

import { formatPrice, formatCompactPrice, formatPercentChange } from '../../utils/format'

// Currency for chart tooltips/cells — delegate to the shared 2-decimal formatter.
// Kept as a named re-export for backwards compatibility with existing imports.
export { formatPrice as formatChartCurrency }

// Compact currency for chart axes (€1,2K / €2,3M).
export { formatCompactPrice as formatChartCompactCurrency }

// Compact number with K/M suffix for non-currency chart axes.
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

// Signed percentage delta — delegate to shared helper.
export { formatPercentChange as formatPercentage }
