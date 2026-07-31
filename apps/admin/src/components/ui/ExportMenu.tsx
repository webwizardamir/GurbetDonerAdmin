import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  Filter,
  Loader2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import Modal from './Modal'
import {
  exportToCSV,
  exportToExcelGeneric,
} from '../../utils/export'
import { fetchDocumentSettings } from '../../services/documents'
import type { DataExportColumn } from '../documents/DataExportTemplate'

export type ExportColumn<T> = {
  key: keyof T | string
  header: string
  format?: (value: unknown, row: T) => string
  /** When true, this column is summed in the export's "Totaal" footer row. */
  summable?: boolean
  /** Optional PDF-only column width (points). Falls back to even split. */
  pdfWidth?: number
  /** Optional PDF-only alignment. */
  pdfAlign?: 'left' | 'right' | 'center'
  /**
   * Not ticked for a user with NO saved prefs. For columns that are useful but
   * would blow up a first-time PDF — e.g. the eight per-unit price/cost columns
   * on the products export, which would otherwise make 19 columns share ~539pt
   * of portrait A4. A user who has ever saved a selection is unaffected.
   */
  defaultOff?: boolean
}

/**
 * One selectable output SHAPE. `columns` and `getAllData` are paired in a single
 * object on purpose: a per-product row has `price_kg`, a per-unit row has
 * `unit_type` + `list_price`, so one dataset cannot serve both column sets —
 * pairing them makes the mismatch unrepresentable.
 */
export interface ExportVariant<T> {
  /** Stable slug; becomes part of the prefs storage key. */
  key: string
  label: string
  /** One line describing what the output looks like. */
  description?: string
  columns: ExportColumn<T>[]
  getAllData: () => Promise<T[]>
  /** Optional overrides so two shapes don't produce identically-named files. */
  filename?: string
  pdfTitle?: string
}

interface ExportMenuBaseProps<T> {
  /** Rows currently loaded on the visible page (omit when not paginated). */
  pageData?: T[]
  /** Hand-picked rows (omit when the page has no row selection). */
  selectedData?: T[]
  /** Total count of all matching rows — shown on the "all" scope label. */
  totalCount?: number
  filename: string
  pdfTitle: string
  pdfBrandColor?: string
  pdfBrandColorDark?: string
  /** localStorage key for remembering column/format/orientation choices. */
  storageKey: string
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  /**
   * 'button' (default) — a normal toolbar button.
   * 'menuitem' — a full-width row for the mobile overflow (⋮) menu. Without it
   *   the toolbar button renders inside a 224px dropdown and gets clipped.
   */
  variant?: 'button' | 'menuitem'
  /**
   * Render ONLY the dialog, no trigger. Used by ListToolbar's mobile overflow:
   * the trigger has to live inside the ⋮ menu, but the dialog must not, because
   * closing the menu unmounts its children and would discard the open state
   * before the dialog could render. So the toolbar mounts a headless copy at its
   * own root and drives it with `open`.
   */
  headless?: boolean
  /** Controlled open state. Omit for the normal self-contained button. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Shown at the top of the dialog when the page's data is FILTERED. The active
   * filter chips sit behind the modal backdrop at the exact moment of danger,
   * and an exported file is durable and forwardable — so the last screen before
   * it leaves should say what is being left out.
   */
  filterNotice?: ReactNode
}

/**
 * Either a single column set, or several selectable shapes — never both.
 * Written as a union so the six single-shape call sites need no change.
 */
export type ExportMenuProps<T> = ExportMenuBaseProps<T> &
  (
    | {
        /** Full dataset matching the current filter/search (fetched lazily). */
        getAllData: () => Promise<T[]>
        columns: ExportColumn<T>[]
        variants?: undefined
      }
    | {
        getAllData?: undefined
        columns?: undefined
        variants: ExportVariant<T>[]
      }
  )

type Format = 'excel' | 'csv' | 'pdf'
type Orientation = 'portrait' | 'landscape'
type Scope = 'all' | 'page' | 'selected'

interface Prefs {
  columns: string[]
  format: Format
  orientation: Orientation
}

const colId = <T,>(c: ExportColumn<T>) => String(c.key)

// Stable identity for the "neither columns nor variants" case — see effColumns.
const EMPTY_COLUMNS: ExportColumn<never>[] = []

/**
 * Prefs are keyed PER VARIANT. The shapes have disjoint column keys, so one
 * shared blob would mean switching shape fails the `allKeys` validity filter,
 * drops every remembered key and silently falls back to "all columns".
 */
const prefsKey = (storageKey: string, variantKey?: string) =>
  variantKey ? `export:${storageKey}:${variantKey}` : `export:${storageKey}`

/** The remembered shape itself. `::` cannot collide with a kebab-case variant key. */
const variantMemoKey = (storageKey: string) => `export:${storageKey}::variant`

function loadPrefs(key: string): Partial<Prefs> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : null
  } catch {
    return null
  }
}

function savePrefs(key: string, prefs: Prefs) {
  try {
    localStorage.setItem(key, JSON.stringify(prefs))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export default function ExportMenu<T>({
  getAllData,
  pageData,
  selectedData,
  totalCount,
  columns,
  variants,
  filename,
  pdfTitle,
  pdfBrandColor,
  pdfBrandColorDark,
  storageKey,
  disabled,
  size = 'md',
  label,
  variant = 'button',
  headless = false,
  open: openProp,
  onOpenChange,
  filterNotice,
}: ExportMenuProps<T>) {
  const { t } = useTranslation()
  const dialogId = useId()
  // Controlled when `open` is supplied (headless mode), self-managed otherwise.
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  const [busy, setBusy] = useState(false)

  const [variantKey, setVariantKey] = useState<string>(() => variants?.[0]?.key ?? '')
  const activeVariant = variants?.find(v => v.key === variantKey) ?? variants?.[0]

  // Everything downstream reads these, so the single- and multi-shape paths
  // share one code path. Memoised because the `?? EMPTY_COLUMNS` fallback would
  // otherwise be a fresh array each render, changing the identity that allKeys /
  // defaultKeys / orderedSelectedColumns depend on and making those memos moot.
  const effColumns = useMemo(
    () => activeVariant?.columns ?? columns ?? EMPTY_COLUMNS,
    [activeVariant, columns],
  ) as ExportColumn<T>[]
  const effGetAllData = activeVariant?.getAllData ?? getAllData
  const effFilename = activeVariant?.filename ?? filename
  const effPdfTitle = activeVariant?.pdfTitle ?? pdfTitle

  // allKeys drives validity + "Alles selecteren" (which must mean literally
  // everything); defaultKeys is what a user with no saved prefs starts from.
  const allKeys = useMemo(() => effColumns.map(colId), [effColumns])
  const defaultKeys = useMemo(
    () => effColumns.filter(c => !c.defaultOff).map(colId),
    [effColumns],
  )

  const [format, setFormat] = useState<Format>('pdf')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  // ORDERED, not a Set: the array order IS the column order in the exported
  // file, so the user can move a column and it stays put next time (the same
  // array is what gets persisted under export:<storageKey>).
  const [selectedCols, setSelectedCols] = useState<string[]>(defaultKeys)
  const [scope, setScope] = useState<Scope>('all')

  const hasSelection = (selectedData?.length ?? 0) > 0
  const hasPage = pageData !== undefined

  // Extracted from the open-effect so switching shape can reuse it. A second
  // effect keyed on [variantKey] would race the open-effect on first render.
  const applyPrefsFor = (v?: ExportVariant<T>) => {
    const cols = v?.columns ?? columns ?? []
    const keys = cols.map(colId)
    // A page that GAINS variants orphans its old single-key blob, which would
    // silently reset a user's remembered columns. The first variant is the
    // pre-existing shape, so let it inherit the legacy prefs.
    const prefs =
      loadPrefs(prefsKey(storageKey, v?.key)) ??
      (v && v.key === variants?.[0]?.key ? loadPrefs(prefsKey(storageKey)) : null)
    const validCols = prefs?.columns?.filter(k => keys.includes(k)) ?? []
    setSelectedCols(validCols.length > 0 ? validCols : cols.filter(c => !c.defaultOff).map(colId))
    if (prefs?.format) setFormat(prefs.format)
    if (prefs?.orientation) setOrientation(prefs.orientation)
  }

  // Restore remembered prefs (and pick a sensible default scope) when opening.
  useEffect(() => {
    if (!open) return
    let v = activeVariant
    if (variants?.length) {
      const remembered = (() => {
        try { return localStorage.getItem(variantMemoKey(storageKey)) } catch { return null }
      })()
      const match = variants.find(x => x.key === remembered)
      if (match) { v = match; setVariantKey(match.key) }
    }
    applyPrefsFor(v)
    setScope(hasSelection ? 'selected' : 'all')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectVariant = (v: ExportVariant<T>) => {
    setVariantKey(v.key)
    applyPrefsFor(v)
  }

  const buttonLabel = label ?? t('export.menu')
  const padding = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'

  // Follows the user's order, not the declaration order.
  const orderedSelectedColumns = useMemo(
    () => selectedCols
      .map(k => effColumns.find(c => colId(c) === k))
      .filter((c): c is ExportColumn<T> => !!c),
    [effColumns, selectedCols],
  )

  // Newly ticked columns append to the END, so ticking Kostprijs after Totaal
  // puts it after Totaal — then move it with the arrows if you want it earlier.
  const toggleCol = (key: string) =>
    setSelectedCols(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))

  // Reordering can disable the very button that was clicked (moving a column to
  // position 1 disables its ↑). The browser then drops focus to <body>, which
  // strands a keyboard user mid-list — so re-aim it at the same row's other
  // arrow. Layout effect: must run before paint, or focus visibly jumps.
  const moveFocusRef = useRef<{ key: string; dir: -1 | 1 } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const moveCol = (key: string, dir: -1 | 1) => {
    moveFocusRef.current = { key, dir }
    setSelectedCols(prev => {
      const i = prev.indexOf(key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  useLayoutEffect(() => {
    const pending = moveFocusRef.current
    moveFocusRef.current = null
    if (!pending || !listRef.current) return
    const pick = (dir: -1 | 1) =>
      listRef.current?.querySelector<HTMLButtonElement>(
        `[data-col-move="${CSS.escape(pending.key)}:${dir}"]`,
      )
    const same = pick(pending.dir)
    const target = same && !same.disabled ? same : pick(pending.dir === -1 ? 1 : -1)
    if (target && !target.disabled) target.focus()
  }, [selectedCols])

  const allChecked = selectedCols.length === allKeys.length
  const toggleAll = () => setSelectedCols(allChecked ? [] : allKeys)

  const reset = () => {
    const first = variants?.[0]
    if (first) setVariantKey(first.key)
    setSelectedCols((first?.columns ?? columns ?? []).filter(c => !c.defaultOff).map(colId))
    setFormat('pdf')
    setOrientation('portrait')
    try {
      // Clear every shape's blob plus the remembered shape, so "Herstellen"
      // means the same thing whether or not the page has variants.
      if (variants?.length) {
        for (const v of variants) localStorage.removeItem(prefsKey(storageKey, v.key))
        localStorage.removeItem(variantMemoKey(storageKey))
      }
      localStorage.removeItem(prefsKey(storageKey))
    } catch {
      /* ignore */
    }
  }

  const resolveRows = async (): Promise<T[]> => {
    if (scope === 'selected') return selectedData ?? []
    if (scope === 'page') return pageData ?? []
    return await effGetAllData!()
  }

  const stripPdfMeta = (cols: ExportColumn<T>[]) =>
    cols.map(({ key, header, format: fmt, summable }) => ({ key, header, format: fmt, summable }))

  const handleExport = async () => {
    if (orderedSelectedColumns.length === 0) return
    setBusy(true)
    try {
      savePrefs(prefsKey(storageKey, activeVariant?.key), { columns: selectedCols, format, orientation })
      if (activeVariant) {
        try { localStorage.setItem(variantMemoKey(storageKey), activeVariant.key) } catch { /* ignore */ }
      }
      const rows = await resolveRows()

      if (format === 'excel') {
        await exportToExcelGeneric(
          rows as Record<string, unknown>[],
          stripPdfMeta(orderedSelectedColumns) as never,
          effFilename,
        )
      } else if (format === 'csv') {
        exportToCSV(
          rows as Record<string, unknown>[],
          stripPdfMeta(orderedSelectedColumns) as never,
          `${effFilename}.csv`,
        )
      } else {
        const [{ pdf }, { default: DataExportTemplate }, settings] = await Promise.all([
          import('@react-pdf/renderer'),
          import('../documents/DataExportTemplate'),
          fetchDocumentSettings(),
        ])

        const pdfColumns: DataExportColumn<T>[] = orderedSelectedColumns.map(c => ({
          key: c.key,
          header: c.header,
          format: c.format,
          summable: c.summable,
          width: c.pdfWidth,
          align: c.pdfAlign,
        }))

        const element = (
          <DataExportTemplate<T>
            title={effPdfTitle}
            data={rows}
            columns={pdfColumns}
            company={settings}
            orientation={orientation}
            brandColor={pdfBrandColor}
            brandColorDark={pdfBrandColorDark}
          />
        )

        const blob = await pdf(element).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${effFilename}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const formatOptions: { value: Format; label: string; icon: React.ReactNode }[] = [
    { value: 'pdf', label: t('export.pdf'), icon: <FileType2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /> },
    { value: 'excel', label: t('export.excel'), icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { value: 'csv', label: t('export.csv'), icon: <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> },
  ]

  return (
    <>
      {!headless && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || busy}
        aria-haspopup="dialog"
        aria-label={t('export.openAria')}
        role={variant === 'menuitem' ? 'menuitem' : undefined}
        className={variant === 'menuitem'
          ? 'flex w-full items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50'
          : `inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${padding} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 shrink-0" />}
        <span className={variant === 'menuitem' ? '' : 'truncate'}>{buttonLabel}</span>
      </button>
      )}

      <Modal isOpen={open} onClose={() => !busy && setOpen(false)} title={t('export.title')} maxWidth="max-w-lg">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* FILTER NOTICE — the last chance to notice the export is partial. */}
          {filterNotice && (
            <div className="flex gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Filter className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 text-sm text-amber-800 dark:text-amber-300">{filterNotice}</div>
            </div>
          )}

          {/* FORMAT */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {t('export.format')}
            </h3>
            {/* Selection is announced via aria-checked and shown with a ring +
                bolder weight, so it is not conveyed by colour alone. */}
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('export.format')}>
              {formatOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={format === opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    format === opt.value
                      ? 'border-green-500 ring-2 ring-green-500/40 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium'
                  }`}
                >
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ORIENTATION (PDF only) */}
          {format === 'pdf' && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('export.orientation')}
              </h3>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('export.orientation')}>
                {(['portrait', 'landscape'] as Orientation[]).map(o => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={orientation === o}
                    onClick={() => setOrientation(o)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      orientation === o
                        ? 'border-green-500 ring-2 ring-green-500/40 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium'
                    }`}
                  >
                    {o === 'portrait' ? t('export.portrait') : t('export.landscape')}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* SHAPE (Vorm) — above SCOPE because it changes the row GRAIN, so the
              scope counts below it are downstream of this choice too. Radio rows
              rather than the Orientation pill grid: the choice needs a sentence,
              and unlike Orientation it is not format-specific. */}
          {variants && variants.length > 1 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('export.shape')}
              </h3>
              <div className="space-y-1.5">
                {variants.map(v => (
                  <RadioOption
                    key={v.key}
                    name={`${dialogId}-shape`}
                    checked={activeVariant?.key === v.key}
                    onSelect={() => selectVariant(v)}
                    label={v.label}
                    description={v.description}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SCOPE */}
          {(hasPage || hasSelection) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('export.rows')}
              </h3>
              {/* Shared `name` — without it these are three unrelated radios
                  rather than one group, so arrow keys don't move between them. */}
              <div className="space-y-1.5">
                <RadioOption
                  name={`${dialogId}-scope`}
                  checked={scope === 'all'}
                  onSelect={() => setScope('all')}
                  label={t('export.scopeAll', { n: totalCount ?? pageData?.length ?? 0 })}
                />
                {hasPage && (
                  <RadioOption
                    name={`${dialogId}-scope`}
                    checked={scope === 'page'}
                    onSelect={() => setScope('page')}
                    label={t('export.scopePage', { n: pageData!.length })}
                  />
                )}
                {hasSelection && (
                  <RadioOption
                    name={`${dialogId}-scope`}
                    checked={scope === 'selected'}
                    onSelect={() => setScope('selected')}
                    label={t('export.scopeSelected', { n: selectedData!.length })}
                  />
                )}
              </div>
            </section>
          )}

          {/* COLUMNS */}
          <section>
            <div className="flex items-center justify-between mb-2">
              {/* Live count: the clearest signal that switching Vorm swapped the
                  whole list underneath, rather than something breaking. */}
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('export.columns')}
                <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400 tabular-nums">
                  {orderedSelectedColumns.length}/{allKeys.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
              >
                {allChecked ? t('export.deselectAll') : t('export.selectAll')}
              </button>
            </div>
            {/* Selected columns first, IN EXPORT ORDER, each movable. The order
                is saved with the rest of the prefs, so it is remembered. */}
            <div ref={listRef} className="max-h-56 overflow-y-auto pr-1 space-y-1">
              {orderedSelectedColumns.map((c, i) => {
                const id = colId(c)
                return (
                  // A <label> like the unticked rows below, so the whole row is
                  // the hit target (this dialog is used from an iPad) and the two
                  // halves of the list behave the same way.
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 pl-2 pr-1 py-1 min-h-[36px] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleCol(id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                    />
                    <span className="w-5 shrink-0 text-xs text-slate-400 tabular-nums text-right">{i + 1}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">{c.header}</span>
                    {/* Row-specific names: 12 buttons all called "Omhoog" are
                        unusable with a screen reader. data-col-move is what the
                        focus rescue in moveCol's layout effect aims at. */}
                    <button
                      type="button"
                      data-col-move={`${id}:-1`}
                      onClick={e => { e.preventDefault(); moveCol(id, -1) }}
                      disabled={i === 0}
                      aria-label={`${c.header}: ${t('export.moveUp')}`}
                      title={t('export.moveUp')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      data-col-move={`${id}:1`}
                      onClick={e => { e.preventDefault(); moveCol(id, 1) }}
                      disabled={i === orderedSelectedColumns.length - 1}
                      aria-label={`${c.header}: ${t('export.moveDown')}`}
                      title={t('export.moveDown')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </label>
                )
              })}

              {/* Not included — ticking one appends it at the end. */}
              {effColumns.filter(c => !selectedCols.includes(colId(c))).map(c => {
                const id = colId(c)
                return (
                  <label key={id} className="flex items-center gap-2 pl-2 py-1 min-h-[36px] text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleCol(id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                    />
                    <span className="w-5 shrink-0" />
                    <span className="truncate">{c.header}</span>
                  </label>
                )
              })}
            </div>
            {orderedSelectedColumns.length === 0 && (
              <p id={`${dialogId}-colerr`} role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {t('export.atLeastOneColumn')}
              </p>
            )}
          </section>
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            {t('export.reset')}
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={busy || orderedSelectedColumns.length === 0}
              aria-describedby={orderedSelectedColumns.length === 0 ? `${dialogId}-colerr` : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('export.run')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

interface RadioOptionProps {
  /** Shared across the options of one group, so they behave as a radio group. */
  name: string
  checked: boolean
  onSelect: () => void
  label: string
  /** Optional second line explaining what the choice produces. */
  description?: string
}

function RadioOption({ name, checked, onSelect, label, description }: RadioOptionProps) {
  return (
    <label
      className={`flex items-start gap-2.5 px-3 py-2 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
        checked
          ? 'border-green-500 bg-green-50/60 dark:bg-green-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 w-4 h-4 shrink-0 border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
      />
      <span className="min-w-0">
        <span className="block text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {description && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
        )}
      </span>
    </label>
  )
}
