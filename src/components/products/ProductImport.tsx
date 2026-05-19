import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, Upload, Loader2, CheckCircle, AlertCircle, FileDown, FileSpreadsheet,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import {
  PRODUCT_TEMPLATE_COLUMNS,
  TEMPLATE_HEADERS,
  UNIT_TYPE_VALUES,
  VALID_TAX_RATES,
  downloadProductTemplate,
} from '../../utils/productTemplate'
import { readExcelFile, getValue, sanitizeCellValue, type ParsedExcelRow } from '../../utils/excelImport'
import {
  upsertProductsFromImport,
  fetchAllProducts,
  type ImportProductInput,
} from '../../services/products'
import type { UnitType } from '../../types'

interface ProductImportProps {
  onClose: () => void
  onComplete: () => void
}

interface RowError {
  field: string
  message: string
}

interface ValidatedRow {
  source: ParsedExcelRow
  parsed: ImportProductInput | null
  errors: RowError[]
  isUpdate: boolean
}

type ViewState = 'pick' | 'preview' | 'committing' | 'done'

const parseNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(',', '.').replace(/[^0-9.\-]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const trimOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  // Neutralise any Excel/CSV formula-injection prefix before storing.
  const sanitized = sanitizeCellValue(v)
  const s = String(sanitized).trim()
  return s ? s : null
}

export default function ProductImport({ onClose, onComplete }: ProductImportProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const { categories } = useCategories({ activeOnly: true })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<ViewState>('pick')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [downloadingWithData, setDownloadingWithData] = useState(false)

  const handleDownloadWithData = async () => {
    if (downloadingWithData) return
    setDownloadingWithData(true)
    try {
      const all = await fetchAllProducts()
      await downloadProductTemplate({
        includeOwnerColumns: isOwner,
        existingProducts: all,
      })
    } finally {
      setDownloadingWithData(false)
    }
  }

  if (!isOwner) return null

  const categoryByName = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach(c => map.set(c.name.toLowerCase().trim(), c.id))
    return map
  }, [categories])

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParseError(null)

    const { rows, parseErrors } = await readExcelFile(file, [...TEMPLATE_HEADERS])
    if (parseErrors.length > 0) {
      setParseError(parseErrors.join(' · '))
      return
    }

    // Validate each row
    const seenCodes = new Set<string>()
    const seenSkus = new Set<string>()

    const validated: ValidatedRow[] = rows.map(source => {
      const errors: RowError[] = []

      const id = trimOrNull(getValue(source, 'ID'))
      const name = trimOrNull(getValue(source, 'Naam'))
      const categoryName = trimOrNull(getValue(source, 'Categorie'))
      const sku = trimOrNull(getValue(source, 'SKU'))
      const barcode = trimOrNull(getValue(source, 'Barcode'))
      const unitTypeRaw = trimOrNull(getValue(source, 'Standaard eenheid'))?.toLowerCase()
      const priceKg = parseNumber(getValue(source, 'Prijs per kg (€)'))
      const priceStuk = parseNumber(getValue(source, 'Prijs per stuk (€)'))
      const priceZak = parseNumber(getValue(source, 'Prijs per zak (€)'))
      const priceDoos = parseNumber(getValue(source, 'Prijs per doos (€)'))
      const costEur = parseNumber(getValue(source, 'Kostprijs (€)'))
      const taxPct = parseNumber(getValue(source, 'BTW %'))
      const stock = parseNumber(getValue(source, 'Voorraad'))
      const trackRaw = trimOrNull(getValue(source, 'Voorraad bijhouden'))
      const description = trimOrNull(getValue(source, 'Beschrijving'))

      if (!name) errors.push({ field: 'Naam', message: t('products.import.requiredField', { field: 'Naam' }) })
      if (!categoryName) {
        errors.push({ field: 'Categorie', message: t('products.import.requiredField', { field: 'Categorie' }) })
      }
      let categoryId: string | undefined
      if (categoryName) {
        categoryId = categoryByName.get(categoryName.toLowerCase().trim())
        if (!categoryId) {
          errors.push({ field: 'Categorie', message: t('products.import.unknownCategory', { name: categoryName }) })
        }
      }

      if (!unitTypeRaw) {
        errors.push({ field: 'StandaardEenheid', message: t('products.import.requiredField', { field: 'Standaard eenheid' }) })
      } else if (!UNIT_TYPE_VALUES.includes(unitTypeRaw as UnitType)) {
        errors.push({ field: 'StandaardEenheid', message: t('products.import.invalidUnit', { value: unitTypeRaw }) })
      }

      const priceChecks: Array<[string, number | null]> = [
        ['PrijsKg', priceKg], ['PrijsStuk', priceStuk], ['PrijsZak', priceZak], ['PrijsDoos', priceDoos],
      ]
      priceChecks.forEach(([field, val]) => {
        if (val !== null && (Number.isNaN(val) || val < 0)) {
          errors.push({ field, message: t('products.import.invalidPrice') })
        }
      })
      if (costEur !== null && (Number.isNaN(costEur) || costEur < 0)) {
        errors.push({ field: 'Kostprijs', message: t('products.import.invalidPrice') })
      }
      if (taxPct !== null && !VALID_TAX_RATES.includes(taxPct)) {
        errors.push({ field: 'BtwPercent', message: t('products.import.invalidTax') })
      }
      if (id) {
        if (!/^[A-Za-z0-9-]+$/.test(id)) {
          errors.push({ field: 'ID', message: 'Ongeldig ID-formaat' })
        }
        if (seenCodes.has(id.toLowerCase())) {
          errors.push({ field: 'ID', message: t('products.import.duplicateId', { id }) })
        }
        seenCodes.add(id.toLowerCase())
      }
      if (sku) {
        if (seenSkus.has(sku.toLowerCase())) {
          errors.push({ field: 'SKU', message: `Dubbele SKU in bestand: ${sku}` })
        }
        seenSkus.add(sku.toLowerCase())
      }

      const unitType = (unitTypeRaw as UnitType) || 'piece'

      const unit_prices: Partial<Record<UnitType, number>> = {}
      if (priceKg !== null) unit_prices.kg = Math.round(priceKg * 100)
      if (priceStuk !== null) unit_prices.piece = Math.round(priceStuk * 100)
      if (priceZak !== null) unit_prices.zak = Math.round(priceZak * 100)
      if (priceDoos !== null) unit_prices.doos = Math.round(priceDoos * 100)

      const parsed: ImportProductInput | null = errors.length > 0 || !name || !categoryId
        ? null
        : {
          product_code: id,
          sku,
          name,
          category_id: categoryId,
          barcode,
          default_unit_type: unitType,
          unit_prices,
          cost_cents: costEur !== null ? Math.round(costEur * 100) : null,
          tax_rate: taxPct,
          stock_quantity: stock !== null ? Math.round(stock) : null,
          track_stock: trackRaw ? trackRaw.toLowerCase() === 'ja' : true,
          description,
        }

      return {
        source,
        parsed,
        errors,
        isUpdate: !!id,   // refined post-commit; preview just shows "would update"
      }
    })

    setValidatedRows(validated)
    setView('preview')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  const okCount = validatedRows.filter(r => r.errors.length === 0).length
  const errCount = validatedRows.length - okCount
  const willInsert = validatedRows.filter(r => r.errors.length === 0 && !r.source['ID']).length
  const willUpdate = validatedRows.filter(r => r.errors.length === 0 && !!r.source['ID']).length

  const handleCommit = async () => {
    if (errCount > 0) return
    setCommitting(true)
    setView('committing')
    try {
      const rows = validatedRows.map(r => r.parsed).filter((r): r is ImportProductInput => r !== null)
      const result = await upsertProductsFromImport(rows)
      setCommitResult(result)
      setView('done')
      if (result.errors.length === 0) onComplete()
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('products.import.title')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {view === 'pick' && (
            <PickState
              onPick={() => fileInputRef.current?.click()}
              onDownloadTemplate={() => downloadProductTemplate(isOwner)}
              onDownloadWithData={handleDownloadWithData}
              downloadingWithData={downloadingWithData}
              t={t}
              parseError={parseError}
            />
          )}

          {view === 'preview' && (
            <PreviewState
              rows={validatedRows}
              okCount={okCount}
              errCount={errCount}
              willInsert={willInsert}
              willUpdate={willUpdate}
              fileName={fileName}
              onChangeFile={() => fileInputRef.current?.click()}
              t={t}
            />
          )}

          {view === 'committing' && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          )}

          {view === 'done' && commitResult && (
            <DoneState result={commitResult} t={t} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          {view === 'preview' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={committing}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('products.import.selectFile')}
              </button>
              <button
                onClick={handleCommit}
                disabled={errCount > 0 || committing || okCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('products.import.confirm')}
              </button>
            </>
          )}
          {view === 'done' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('products.import.done')}
            </button>
          )}
          {(view === 'pick' || view === 'committing') && (
            <button
              onClick={onClose}
              disabled={committing}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.close')}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}

function PickState({
  onPick, onDownloadTemplate, onDownloadWithData, downloadingWithData, t, parseError,
}: {
  onPick: () => void
  onDownloadTemplate: () => void
  onDownloadWithData: () => void
  downloadingWithData: boolean
  t: (k: string, opts?: Record<string, unknown>) => string
  parseError: string | null
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Upload een .xlsx-bestand volgens het sjabloon. Bestaande producten worden bijgewerkt op basis van ID; rijen zonder ID worden als nieuw aangemaakt en krijgen automatisch een MHF-NNNNN.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <button
          onClick={onDownloadTemplate}
          className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-left hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
        >
          <FileDown className="w-6 h-6 text-slate-500 dark:text-slate-400" />
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{t('products.import.blankTemplate')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('products.import.blankTemplateHint')}</div>
          </div>
        </button>
        <button
          onClick={onDownloadWithData}
          disabled={downloadingWithData}
          className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-left hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloadingWithData
            ? <Loader2 className="w-6 h-6 text-slate-500 dark:text-slate-400 animate-spin" />
            : <FileSpreadsheet className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{t('products.import.withDataTemplate')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('products.import.withDataTemplateHint')}</div>
          </div>
        </button>
        <button
          onClick={onPick}
          className="flex items-center gap-3 p-4 border-2 border-dashed border-green-500 rounded-xl text-left bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
        >
          <Upload className="w-6 h-6 text-green-600" />
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{t('products.import.selectFile')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">.xlsx of .xls</div>
          </div>
        </button>
      </div>
      {parseError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{parseError}</div>
        </div>
      )}
    </div>
  )
}

function PreviewState({
  rows, okCount, errCount, willInsert, willUpdate, fileName, onChangeFile, t,
}: {
  rows: ValidatedRow[]
  okCount: number
  errCount: number
  willInsert: number
  willUpdate: number
  fileName: string
  onChangeFile: () => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const headers = PRODUCT_TEMPLATE_COLUMNS.map(c => c.header)

  const headerKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    PRODUCT_TEMPLATE_COLUMNS.forEach(c => m.set(c.header, c.key))
    return m
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" /> {t('products.import.ok', { count: okCount })}
          </span>
          {errCount > 0 && (
            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4" /> {t('products.import.errors', { count: errCount })}
            </span>
          )}
        </div>
      </div>

      {errCount > 0 ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {t('products.import.fixAndRetry')}
            <button onClick={onChangeFile} className="ml-2 underline hover:no-underline">
              {t('products.import.selectFile')}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
          {willInsert} nieuw · {willUpdate} bijwerken
        </div>
      )}

      {/* Preview table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[50vh]">
        <table className="text-xs w-full">
          <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-12">#</th>
              {headers.map(h => (
                <th key={h} className="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((row, idx) => {
              const errFields = new Set(row.errors.map(e => e.field))
              const errMessages = row.errors.map(e => `${e.field}: ${e.message}`).join('\n')
              return (
                <tr key={idx} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">{row.source.__rowNumber}</td>
                  {headers.map(h => {
                    const key = headerKeyMap.get(h) ?? h
                    const hasErr = errFields.has(key)
                    const val = row.source[h]
                    return (
                      <td
                        key={h}
                        title={hasErr ? errMessages : undefined}
                        className={`px-2 py-1.5 whitespace-nowrap ${hasErr ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {val !== null && val !== undefined && val !== '' ? String(val) : ''}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DoneState({ result, t }: {
  result: { created: number; updated: number; errors: string[] }
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="space-y-3 py-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('products.import.result', { created: result.created, updated: result.updated })}
        </div>
      </div>
      {result.errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-1">
          {result.errors.slice(0, 10).map((err, i) => (
            <div key={i} className="text-sm text-red-700 dark:text-red-300">{err}</div>
          ))}
          {result.errors.length > 10 && (
            <div className="text-xs text-red-600 dark:text-red-400 italic">
              … en nog {result.errors.length - 10} meer
            </div>
          )}
        </div>
      )}
    </div>
  )
}
