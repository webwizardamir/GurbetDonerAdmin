import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, Upload, Loader2, CheckCircle, AlertCircle, FileDown, FileSpreadsheet,
} from 'lucide-react'
import {
  PRICE_LIST_TEMPLATE_COLUMNS,
  PRICE_LIST_HEADERS,
  UNIT_TYPE_VALUES,
  VALID_TAX_RATES,
  downloadPriceListTemplate,
} from '../../utils/priceListTemplate'
import { readExcelFile, getValue, type ParsedExcelRow } from '../../utils/excelImport'
import { fetchAllProducts } from '../../services/products'
import {
  upsertPriceListItems,
  fetchPriceListItems,
  type ImportPriceListItemInput,
  type PriceListItemWithProduct,
} from '../../services/priceLists'
import type { UnitType } from '../../types'

interface PriceListImportProps {
  priceListId: string
  priceListName: string
  onClose: () => void
  onComplete: () => void
}

interface RowError {
  field: string
  message: string
}

interface ValidatedRow {
  source: ParsedExcelRow
  parsed: ImportPriceListItemInput | null
  errors: RowError[]
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
  const s = String(v).trim()
  return s ? s : null
}

export default function PriceListImport({
  priceListId, priceListName, onClose, onComplete,
}: PriceListImportProps) {
  const { t } = useTranslation()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<ViewState>('pick')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null)
  const [productByCode, setProductByCode] = useState<Map<string, string>>(new Map())
  const [downloadingWithData, setDownloadingWithData] = useState(false)

  // Preload product_code → id map for validation
  useEffect(() => {
    void fetchAllProducts().then(prods => {
      const m = new Map<string, string>()
      for (const p of prods) {
        if (p.product_code) m.set(p.product_code.toLowerCase().trim(), p.id)
      }
      setProductByCode(m)
    })
  }, [])

  const handleDownloadWithData = async () => {
    if (downloadingWithData) return
    setDownloadingWithData(true)
    try {
      const items: PriceListItemWithProduct[] = await fetchPriceListItems(priceListId)
      await downloadPriceListTemplate({ listName: priceListName, existingItems: items })
    } finally {
      setDownloadingWithData(false)
    }
  }

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParseError(null)

    const { rows, parseErrors } = await readExcelFile(file, [...PRICE_LIST_HEADERS])
    if (parseErrors.length > 0) {
      setParseError(parseErrors.join(' · '))
      return
    }

    const seenKeys = new Set<string>()

    const validated: ValidatedRow[] = rows.map(source => {
      const errors: RowError[] = []
      const productCode = trimOrNull(getValue(source, 'Product ID'))
      const unitRaw = trimOrNull(getValue(source, 'Eenheid'))?.toLowerCase()
      const price = parseNumber(getValue(source, 'Prijs (€)'))
      const taxRaw = parseNumber(getValue(source, 'BTW % (optioneel)'))

      if (!productCode) {
        errors.push({ field: 'ProductID', message: t('priceLists.import.missingProductId') })
      }
      let productId: string | undefined
      if (productCode) {
        productId = productByCode.get(productCode.toLowerCase())
        if (!productId) {
          errors.push({ field: 'ProductID', message: t('priceLists.import.unknownProduct', { code: productCode }) })
        }
      }

      let unitType: UnitType | undefined
      if (!unitRaw) {
        errors.push({ field: 'Eenheid', message: t('priceLists.import.missingUnit') })
      } else if (!UNIT_TYPE_VALUES.includes(unitRaw as UnitType)) {
        errors.push({ field: 'Eenheid', message: t('priceLists.import.invalidUnit', { value: unitRaw }) })
      } else {
        unitType = unitRaw as UnitType
      }

      if (price === null) {
        errors.push({ field: 'Prijs', message: t('priceLists.import.missingPrice') })
      } else if (price < 0 || !Number.isFinite(price)) {
        errors.push({ field: 'Prijs', message: t('priceLists.import.invalidPrice') })
      }

      if (taxRaw !== null && !VALID_TAX_RATES.includes(taxRaw)) {
        errors.push({ field: 'BtwPercent', message: t('priceLists.import.invalidTax') })
      }

      // In-file duplicate (product_id + unit_type)
      if (productId && unitType) {
        const key = `${productId}::${unitType}`
        if (seenKeys.has(key)) {
          errors.push({ field: 'ProductID', message: t('priceLists.import.duplicateInFile', { code: productCode, unit: unitType }) })
        }
        seenKeys.add(key)
      }

      const parsed: ImportPriceListItemInput | null = errors.length > 0 || !productId || !unitType || price === null
        ? null
        : {
          product_id: productId,
          unit_type: unitType,
          price_cents: Math.round(price * 100),
          tax_rate: taxRaw,
        }

      return { source, parsed, errors }
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

  const handleCommit = async () => {
    if (errCount > 0) return
    setCommitting(true)
    setView('committing')
    try {
      const rows = validatedRows.map(r => r.parsed).filter((r): r is ImportPriceListItemInput => r !== null)
      const result = await upsertPriceListItems(priceListId, rows)
      setCommitResult(result)
      setView('done')
      if (result.errors.length === 0) onComplete()
    } finally {
      setCommitting(false)
    }
  }

  const headerKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    PRICE_LIST_TEMPLATE_COLUMNS.forEach(c => m.set(c.header, c.key))
    return m
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('priceLists.import.title')} — {priceListName}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {view === 'pick' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('priceLists.import.intro')}</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <button
                  onClick={() => downloadPriceListTemplate({ listName: priceListName })}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-left hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                >
                  <FileDown className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{t('priceLists.import.blankTemplate')}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">price-list-template.xlsx</div>
                  </div>
                </button>
                <button
                  onClick={handleDownloadWithData}
                  disabled={downloadingWithData}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-left hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {downloadingWithData
                    ? <Loader2 className="w-6 h-6 text-slate-500 dark:text-slate-400 animate-spin" />
                    : <FileSpreadsheet className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{t('priceLists.import.currentItems')}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t('priceLists.import.currentItemsHint')}</div>
                  </div>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-green-500 rounded-xl text-left bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Upload className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{t('priceLists.import.selectFile')}</div>
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
          )}

          {view === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{fileName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> {t('priceLists.import.ok', { count: okCount })}
                  </span>
                  {errCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" /> {t('priceLists.import.errors', { count: errCount })}
                    </span>
                  )}
                </div>
              </div>

              {errCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">{t('priceLists.import.fixAndRetry')}</div>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[50vh]">
                <table className="text-xs w-full">
                  <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-12">#</th>
                      {PRICE_LIST_HEADERS.map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {validatedRows.map((row, idx) => {
                      const errFields = new Set(row.errors.map(e => e.field))
                      const errMessages = row.errors.map(e => `${e.field}: ${e.message}`).join('\n')
                      return (
                        <tr key={idx} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                          <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">{row.source.__rowNumber}</td>
                          {PRICE_LIST_HEADERS.map(h => {
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
          )}

          {view === 'committing' && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          )}

          {view === 'done' && commitResult && (
            <div className="space-y-3 py-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('priceLists.import.result', { inserted: commitResult.inserted, updated: commitResult.updated })}
                </div>
              </div>
              {commitResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-1">
                  {commitResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-sm text-red-700 dark:text-red-300">{err}</div>
                  ))}
                </div>
              )}
            </div>
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
                {t('priceLists.import.selectFile')}
              </button>
              <button
                onClick={handleCommit}
                disabled={errCount > 0 || committing || okCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('priceLists.import.confirm')}
              </button>
            </>
          )}
          {view === 'done' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('priceLists.import.done')}
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
