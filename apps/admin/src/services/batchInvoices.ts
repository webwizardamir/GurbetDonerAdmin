import {
  buildInvoiceData,
  getNextDocumentNumber,
  createDocument,
  fetchLatestDocumentForOrder,
  type InvoiceData,
} from './documents'

export interface BatchInvoiceResult {
  orderId: string
  documentNumber: string
  data: InvoiceData
  /** True when a fresh invoice number was assigned (vs reusing an existing one). */
  isNew: boolean
}

/**
 * Generate invoice data for many orders, conserving sequential numbering.
 *
 * This loop is sequential (await per order, never Promise.all) so invoice
 * numbers are assigned in the caller-defined order (e.g. delivery-route order).
 * Numbering itself is now safe under concurrency regardless — getNextDocumentNumber
 * delegates to the atomic get_next_document_number_atomic RPC (migration 00079),
 * which row-locks the settings counter and derives GREATEST(counter, max_used+1),
 * so it can never issue a duplicate/colliding number. Re-running the same day
 * reuses each order's existing number via fetchLatestDocumentForOrder, so it is
 * idempotent and never burns extra numbers.
 *
 * Mirrors DocumentGenerator's single-order logic, looped. PDF rendering is left
 * to the caller (combined vs separate file output).
 */
export async function generateBatchInvoices(
  orderIds: string[],
  opts: { onProgress?: (done: number, total: number) => void } = {},
): Promise<BatchInvoiceResult[]> {
  const results: BatchInvoiceResult[] = []
  for (const orderId of orderIds) {
    const data = await buildInvoiceData(orderId, 'invoice')
    const existing = await fetchLatestDocumentForOrder(orderId, 'invoice')
    if (existing) {
      data.documentNumber = existing.document_number
    } else {
      data.documentNumber = await getNextDocumentNumber('invoice')
      await createDocument(
        orderId,
        'invoice',
        data.documentNumber,
        data as unknown as Record<string, unknown>,
      )
    }
    results.push({ orderId, documentNumber: data.documentNumber, data, isNew: !existing })
    opts.onProgress?.(results.length, orderIds.length)
  }
  return results
}
