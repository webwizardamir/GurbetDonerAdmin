// Deliver a rendered PDF blob to the user.
//
// On Android/desktop the classic hidden-<a download> trick saves a real .pdf file.
// On iOS Safari (and every iOS browser — they're all WebKit) the `download`
// attribute is IGNORED: the blob is opened in a viewer tab instead of being saved,
// so its address becomes a `blob:https://…` URL. When the customer then taps the OS
// "Share" button, iOS treats that blob tab as a *web page* and shows the confusing
// "Share as: Automatic / PDF" prompt — it never had a real file to share.
//
// Fix: on iOS, hand the native share sheet a real File via the Web Share API, so it
// shares the actual PDF directly (no "Automatic/PDF" prompt). Everywhere else the
// behaviour is unchanged — a direct download.

// iOS detection. iPadOS 13+ masquerades as desktop Safari on "MacIntel", so we also
// treat a touch-capable MacIntel as iOS.
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

// Classic download — a hidden anchor with the `download` attribute.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Native share on iOS, download everywhere else. Safe fallback in every failure
// case, so this never leaves the user with nothing.
export async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<void> {
  if (isIOS() && typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch (err) {
        // User dismissed the share sheet — respect that, don't force a download.
        if (err instanceof Error && err.name === 'AbortError') return
        // Any other failure (e.g. lost user-activation) → fall through to download.
      }
    }
  }
  downloadBlob(blob, filename)
}
