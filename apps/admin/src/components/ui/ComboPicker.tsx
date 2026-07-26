// Compact searchable single-select for filter bars.
//
// This is now a thin wrapper over SearchSelect. It used to be a second, older
// implementation with three defects that SearchSelect fixes:
//   * its popover was `absolute`, so any ancestor overflow-hidden /
//     overflow-x-auto clipped it (the analytics filter bar and the audit-log
//     filter card both do this);
//   * it rendered `filtered.slice(0, 50)` with NO indication, so option 51
//     silently did not exist — the product picker is the longest list in the app;
//   * it autofocused the search input unconditionally, which on mobile raises
//     the keyboard over the list.
//
// Keeping the name means AuditLog and EntityFilter get all three fixes plus the
// mobile sheet with zero call-site changes — so those files' behaviour changes
// without them appearing in the diff. That is deliberate; do not reintroduce a
// second implementation here.

import type { LucideIcon } from 'lucide-react'
import SearchSelect from './SearchSelect'

export interface ComboOption {
  value: string
  label: string
  sublabel?: string
}

interface ComboPickerProps {
  value: string | null
  options: ComboOption[]
  onChange: (value: string | null) => void
  /** Shown when nothing is selected (e.g. "Alle klanten"). */
  placeholder: string
  searchPlaceholder: string
  icon?: LucideIcon
  loading?: boolean
}

export default function ComboPicker({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  icon,
  loading = false,
}: ComboPickerProps) {
  return (
    <SearchSelect
      value={value}
      options={options}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      icon={icon}
      loading={loading}
    />
  )
}
