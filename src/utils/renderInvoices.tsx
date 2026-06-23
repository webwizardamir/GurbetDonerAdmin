// Shared invoice batch → PDF rendering used by both the Dagafsluiting modal and
// the delivery-route panel, so invoices can be produced in any caller-defined
// order (e.g. exact delivery-route order).

import { pdf } from '@react-pdf/renderer'
import { InvoiceTemplate } from '../components/documents/InvoiceTemplate'
import CombinedInvoicesTemplate from '../components/documents/CombinedInvoicesTemplate'
import { generateBatchInvoices } from '../services/batchInvoices'

export type InvoiceOutputMode = 'combined' | 'separate'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

interface RenderOptions {
  /** 'combined' = one PDF with all invoices in order; 'separate' = one file each. */
  mode: InvoiceOutputMode
  /** Filename for the combined file (without extension). */
  combinedFilename: string
  onProgress?: (done: number, total: number) => void
}

/**
 * Generate invoices for `orderedIds` IN THE GIVEN ORDER and download them.
 * `generateBatchInvoices` iterates the array in order (and is strictly
 * sequential to keep invoice numbering safe), so the PDF page order / file
 * order matches `orderedIds` exactly. Returns the number of invoices issued.
 */
export async function renderInvoicesToFiles(
  orderedIds: string[],
  { mode, combinedFilename, onProgress }: RenderOptions,
): Promise<number> {
  if (orderedIds.length === 0) return 0
  const results = await generateBatchInvoices(orderedIds, { onProgress })

  if (mode === 'combined') {
    const blob = await pdf(<CombinedInvoicesTemplate invoices={results.map(r => r.data)} />).toBlob()
    downloadBlob(blob, `${combinedFilename}.pdf`)
  } else {
    // Browsers throttle many rapid downloads — space them out a little.
    for (const r of results) {
      const blob = await pdf(<InvoiceTemplate data={r.data} />).toBlob()
      downloadBlob(blob, `${r.documentNumber}.pdf`)
      await sleep(400)
    }
  }
  return results.length
}
