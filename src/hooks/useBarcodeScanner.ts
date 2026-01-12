import { useState, useCallback, useRef, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

export type ScanMode = 'single' | 'continuous'

interface UseBarcodeScanner {
  isScanning: boolean
  error: string | null
  lastScannedCode: string | null
  scanMode: ScanMode
  startScanning: (elementId: string) => Promise<void>
  stopScanning: () => Promise<void>
  setScanMode: (mode: ScanMode) => void
  clearError: () => void
  clearLastScanned: () => void
}

interface UseScannerOptions {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
}

export function useBarcodeScanner({ onScan, onError }: UseScannerOptions): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<ScanMode>('single')

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const scanModeRef = useRef<ScanMode>(scanMode)

  // Keep ref in sync with state
  useEffect(() => {
    scanModeRef.current = scanMode
  }, [scanMode])

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }, [])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setIsScanning(false)
  }, [])

  const startScanning = useCallback(async (elementId: string) => {
    setError(null)

    try {
      // Create new scanner instance
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch {
          // Ignore errors when stopping
        }
      }

      scannerRef.current = new Html5Qrcode(elementId)

      const qrCodeSuccessCallback = (decodedText: string) => {
        // Debounce scans (300ms)
        const now = Date.now()
        if (now - lastScanTimeRef.current < 300) {
          return
        }
        lastScanTimeRef.current = now

        // Trigger haptic feedback
        triggerHaptic()

        // Update last scanned code
        setLastScannedCode(decodedText)

        // Call the onScan callback
        onScan(decodedText)

        // In single mode, stop scanning after successful scan
        if (scanModeRef.current === 'single') {
          stopScanning()
        }
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        formatsToSupport: [0], // EAN_13 format
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        qrCodeSuccessCallback,
        // Ignore QR scan errors (no code found in frame)
        () => {}
      )

      setIsScanning(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsScanning(false)
    }
  }, [onScan, onError, stopScanning, triggerHaptic])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearLastScanned = useCallback(() => {
    setLastScannedCode(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return {
    isScanning,
    error,
    lastScannedCode,
    scanMode,
    startScanning,
    stopScanning,
    setScanMode,
    clearError,
    clearLastScanned,
  }
}
