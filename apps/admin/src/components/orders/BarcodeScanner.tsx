import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Camera,
  CameraOff,
  Loader2,
  AlertCircle,
  Check,
  Keyboard,
  ScanBarcode,
} from 'lucide-react'
import { useBarcodeScanner, ScanMode } from '../../hooks/useBarcodeScanner'
import { fetchProductByBarcode } from '../../services/products'
import type { Product } from '../../types'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onProductFound: (product: Product) => void
}

export default function BarcodeScanner({
  isOpen,
  onClose,
  onProductFound,
}: BarcodeScannerProps) {
  const { t } = useTranslation()
  const [manualBarcode, setManualBarcode] = useState('')
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false)

  const scannerElementRef = useRef<HTMLDivElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)

  const handleBarcodeFound = async (barcode: string) => {
    setProductError(null)
    setSuccessMessage(null)
    setSearchingProduct(true)

    try {
      const product = await fetchProductByBarcode(barcode)
      if (product) {
        setSuccessMessage(t('scanner.productAdded', { product: product.name }))
        onProductFound(product)
        // Clear success message after 2 seconds
        setTimeout(() => setSuccessMessage(null), 2000)
      } else {
        setProductError(t('scanner.productNotFound', { barcode }))
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setProductError(t('scanner.productNotFound', { barcode }))
    } finally {
      setSearchingProduct(false)
    }
  }

  const {
    isScanning,
    error: scannerError,
    scanMode,
    startScanning,
    stopScanning,
    setScanMode,
    clearError,
  } = useBarcodeScanner({
    onScan: handleBarcodeFound,
    onError: (err) => {
      if (err.includes('Permission') || err.includes('NotAllowed')) {
        setCameraPermissionDenied(true)
        setShowManualInput(true)
      }
    },
  })

  // Start scanner when modal opens
  useEffect(() => {
    if (isOpen && !showManualInput && !cameraPermissionDenied) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanning('barcode-scanner-region')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, showManualInput, cameraPermissionDenied])

  // Stop scanner when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setManualBarcode('')
      setProductError(null)
      setSuccessMessage(null)
      setShowManualInput(false)
      clearError()
    }
  }, [isOpen, stopScanning, clearError])

  // Focus manual input when showing
  useEffect(() => {
    if (showManualInput && manualInputRef.current) {
      manualInputRef.current.focus()
    }
  }, [showManualInput])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      handleBarcodeFound(manualBarcode.trim())
      setManualBarcode('')
    }
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  const toggleScanMode = (mode: ScanMode) => {
    setScanMode(mode)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="relative bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ScanBarcode className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('scanner.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {(productError || scannerError) && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {productError || scannerError}
              </p>
            </div>
          )}

          {/* Camera Permission Denied */}
          {cameraPermissionDenied && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CameraOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t('scanner.permissionDenied')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {t('scanner.tryManualInput')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Camera Viewfinder */}
          {!showManualInput && !cameraPermissionDenied && (
            <div className="relative">
              {/* Scanner Region */}
              <div
                id="barcode-scanner-region"
                ref={scannerElementRef}
                className="w-full aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden"
              />

              {/* Scanning Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-32 border-2 border-green-500 rounded-lg relative">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 rounded-br" />
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 h-0.5 bg-green-500 animate-scan" />
                  </div>
                </div>
              )}

              {/* Loading Overlay */}
              {!isScanning && !scannerError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-white">{t('scanner.starting')}</p>
                  </div>
                </div>
              )}

              {/* Searching Product Overlay */}
              {searchingProduct && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 rounded-xl">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-white">{t('scanner.searching')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan Mode Toggle */}
          {!showManualInput && !cameraPermissionDenied && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t('scanner.scanMode')}:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                <button
                  onClick={() => toggleScanMode('single')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    scanMode === 'single'
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  {t('scanner.singleScan')}
                </button>
                <button
                  onClick={() => toggleScanMode('continuous')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    scanMode === 'continuous'
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  {t('scanner.continuousScan')}
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Toggle */}
          {!cameraPermissionDenied && (
            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  if (!showManualInput) {
                    stopScanning()
                  }
                  setShowManualInput(!showManualInput)
                }}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-2"
              >
                {showManualInput ? (
                  <>
                    <Camera className="w-4 h-4" />
                    {t('scanner.useCamera')}
                  </>
                ) : (
                  <>
                    <Keyboard className="w-4 h-4" />
                    {t('scanner.manualInput')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Manual Input Form */}
          {(showManualInput || cameraPermissionDenied) && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('scanner.enterBarcode')}
                </label>
                <div className="flex gap-2">
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="5902802646948"
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-mono"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!manualBarcode.trim() || searchingProduct}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    {searchingProduct ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* Custom CSS for scanning animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
