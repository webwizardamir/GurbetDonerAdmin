import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
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
}

export interface ExportMenuProps<T> {
  /** Full dataset matching the current filter/search (fetched lazily). */
  getAllData: () => Promise<T[]>
  /** Rows currently loaded on the visible page (omit when not paginated). */
  pageData?: T[]
  /** Hand-picked rows (omit when the page has no row selection). */
  selectedData?: T[]
  /** Total count of all matching rows — shown on the "all" scope label. */
  totalCount?: number
  columns: ExportColumn<T>[]
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
}

type Format = 'excel' | 'csv' | 'pdf'
type Orientation = 'portrait' | 'landscape'
type Scope = 'all' | 'page' | 'selected'

interface Prefs {
  columns: string[]
  format: Format
  orientation: Orientation
}

const colId = <T,>(c: ExportColumn<T>) => String(c.key)

function loadPrefs(storageKey: string): Partial<Prefs> | null {
  try {
    const raw = localStorage.getItem(`export:${storageKey}`)
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : null
  } catch {
    return null
  }
}

function savePrefs(storageKey: string, prefs: Prefs) {
  try {
    localStorage.setItem(`export:${storageKey}`, JSON.stringify(prefs))
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
}: ExportMenuProps<T>) {
  const { t } = useTranslation()
  // Controlled when `open` is supplied (headless mode), self-managed otherwise.
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  const [busy, setBusy] = useState(false)

  const allKeys = useMemo(() => columns.map(colId), [columns])

  const [format, setFormat] = useState<Format>('pdf')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  // ORDERED, not a Set: the array order IS the column order in the exported
  // file, so the user can move a column and it stays put next time (the same
  // array is what gets persisted under export:<storageKey>).
  const [selectedCols, setSelectedCols] = useState<string[]>(allKeys)
  const [scope, setScope] = useState<Scope>('all')

  const hasSelection = (selectedData?.length ?? 0) > 0
  const hasPage = pageData !== undefined

  // Restore remembered prefs (and pick a sensible default scope) when opening.
  useEffect(() => {
    if (!open) return
    const prefs = loadPrefs(storageKey)
    const validCols = prefs?.columns?.filter(k => allKeys.includes(k)) ?? []
    setSelectedCols(validCols.length > 0 ? validCols : allKeys)
    if (prefs?.format) setFormat(prefs.format)
    if (prefs?.orientation) setOrientation(prefs.orientation)
    setScope(hasSelection ? 'selected' : 'all')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const buttonLabel = label ?? t('export.menu')
  const padding = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'

  // Follows the user's order, not the declaration order.
  const orderedSelectedColumns = useMemo(
    () => selectedCols
      .map(k => columns.find(c => colId(c) === k))
      .filter((c): c is ExportColumn<T> => !!c),
    [columns, selectedCols],
  )

  // Newly ticked columns append to the END, so ticking Kostprijs after Totaal
  // puts it after Totaal — then move it with the arrows if you want it earlier.
  const toggleCol = (key: string) =>
    setSelectedCols(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))

  const moveCol = (key: string, dir: -1 | 1) =>
    setSelectedCols(prev => {
      const i = prev.indexOf(key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const allChecked = selectedCols.length === allKeys.length
  const toggleAll = () => setSelectedCols(allChecked ? [] : allKeys)

  const reset = () => {
    setSelectedCols(allKeys)
    setFormat('pdf')
    setOrientation('portrait')
    try {
      localStorage.removeItem(`export:${storageKey}`)
    } catch {
      /* ignore */
    }
  }

  const resolveRows = async (): Promise<T[]> => {
    if (scope === 'selected') return selectedData ?? []
    if (scope === 'page') return pageData ?? []
    return await getAllData()
  }

  const stripPdfMeta = (cols: ExportColumn<T>[]) =>
    cols.map(({ key, header, format: fmt, summable }) => ({ key, header, format: fmt, summable }))

  const handleExport = async () => {
    if (orderedSelectedColumns.length === 0) return
    setBusy(true)
    try {
      savePrefs(storageKey, { columns: selectedCols, format, orientation })
      const rows = await resolveRows()

      if (format === 'excel') {
        await exportToExcelGeneric(
          rows as Record<string, unknown>[],
          stripPdfMeta(orderedSelectedColumns) as never,
          filename,
        )
      } else if (format === 'csv') {
        exportToCSV(
          rows as Record<string, unknown>[],
          stripPdfMeta(orderedSelectedColumns) as never,
          `${filename}.csv`,
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
            title={pdfTitle}
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
        link.download = `${filename}.pdf`
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
          {/* FORMAT */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {t('export.format')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    format === opt.value
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as Orientation[]).map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrientation(o)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      orientation === o
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {o === 'portrait' ? t('export.portrait') : t('export.landscape')}
                  </button>
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
              <div className="space-y-1.5">
                <ScopeOption
                  checked={scope === 'all'}
                  onSelect={() => setScope('all')}
                  label={t('export.scopeAll', { n: totalCount ?? pageData?.length ?? 0 })}
                />
                {hasPage && (
                  <ScopeOption
                    checked={scope === 'page'}
                    onSelect={() => setScope('page')}
                    label={t('export.scopePage', { n: pageData!.length })}
                  />
                )}
                {hasSelection && (
                  <ScopeOption
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('export.columns')}
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
            <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
              {orderedSelectedColumns.map((c, i) => {
                const id = colId(c)
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 pl-2 pr-1 py-1">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleCol(id)}
                      aria-label={c.header}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                    />
                    <span className="w-5 shrink-0 text-xs text-slate-400 tabular-nums text-right">{i + 1}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">{c.header}</span>
                    <button
                      type="button"
                      onClick={() => moveCol(id, -1)}
                      disabled={i === 0}
                      aria-label={t('export.moveUp')}
                      title={t('export.moveUp')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCol(id, 1)}
                      disabled={i === orderedSelectedColumns.length - 1}
                      aria-label={t('export.moveDown')}
                      title={t('export.moveDown')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}

              {/* Not included — ticking one appends it at the end. */}
              {columns.filter(c => !selectedCols.includes(colId(c))).map(c => {
                const id = colId(c)
                return (
                  <label key={id} className="flex items-center gap-2 pl-2 py-1 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
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
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t('export.atLeastOneColumn')}</p>
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

interface ScopeOptionProps {
  checked: boolean
  onSelect: () => void
  label: string
}

function ScopeOption({ checked, onSelect, label }: ScopeOptionProps) {
  return (
    <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="w-4 h-4 border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
      />
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  )
}
