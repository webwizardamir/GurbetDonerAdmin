import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Loader2 } from 'lucide-react'
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
  data?: T[]
  /** Async data getter — called on each format pick. Use when the visible
   *  list is paged/truncated and the export must hit the full dataset. */
  getData?: () => Promise<T[]>
  columns: ExportColumn<T>[]
  filename: string
  pdfTitle: string
  pdfBrandColor?: string
  pdfBrandColorDark?: string
  pdfFilterSummary?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
}

type Format = 'excel' | 'csv' | 'pdf'

export default function ExportMenu<T>({
  data,
  getData,
  columns,
  filename,
  pdfTitle,
  pdfBrandColor,
  pdfBrandColorDark,
  pdfFilterSummary,
  disabled,
  size = 'md',
  label,
}: ExportMenuProps<T>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<Format | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isDisabled = disabled || (!getData && (!data || data.length === 0))
  const buttonLabel = label ?? t('export.menu')

  const resolveData = async (): Promise<T[]> => {
    if (getData) return await getData()
    return data ?? []
  }

  const padding = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'

  const stripPdfMeta = (cols: ExportColumn<T>[]) =>
    cols.map(({ key, header, format, summable }) => ({ key, header, format, summable }))

  const handleExcel = async () => {
    setBusy('excel')
    try {
      const rows = await resolveData()
      await exportToExcelGeneric(rows as Record<string, unknown>[], stripPdfMeta(columns) as never, filename)
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  const handleCsv = async () => {
    setBusy('csv')
    try {
      const rows = await resolveData()
      exportToCSV(rows as Record<string, unknown>[], stripPdfMeta(columns) as never, `${filename}.csv`)
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  const handlePdf = async () => {
    setBusy('pdf')
    try {
      const [{ pdf }, { default: DataExportTemplate }, settings, rows] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../documents/DataExportTemplate'),
        fetchDocumentSettings(),
        resolveData(),
      ])

      const pdfColumns: DataExportColumn<T>[] = columns.map(c => ({
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
          filterSummary={pdfFilterSummary}
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
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={isDisabled || busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('export.openAria')}
        className={`inline-flex items-center gap-2 ${padding} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
        >
          <MenuItem
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            label={t('export.excel')}
            onClick={handleExcel}
            busy={busy === 'excel'}
          />
          <MenuItem
            icon={<FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            label={t('export.csv')}
            onClick={handleCsv}
            busy={busy === 'csv'}
          />
          <MenuItem
            icon={<FileType2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            label={t('export.pdf')}
            onClick={handlePdf}
            busy={busy === 'pdf'}
          />
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  busy: boolean
}

function MenuItem({ icon, label, onClick, busy }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={busy}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors text-left"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  )
}
