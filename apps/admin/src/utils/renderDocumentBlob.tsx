import { pdf } from '@react-pdf/renderer'
import { getDocumentTemplate } from '../components/documents/getDocumentTemplate'
import type { InvoiceData } from '../services/documents'
import type { DocumentType } from '../types'

/**
 * Render a document to a PDF blob.
 *
 * One place for the `pdf(template).toBlob()` idiom so every surface that mails,
 * downloads or previews a document produces a byte-identical file. It also keeps
 * `@react-pdf` out of the services layer: `services/bulkDocumentEmail.ts` takes
 * this as an injected `renderPdf`, the same way `services/batchInvoices.ts`
 * leaves rendering to its caller.
 */
export function renderDocumentBlob(documentType: DocumentType, data: InvoiceData): Promise<Blob> {
  return pdf(getDocumentTemplate(documentType, data)).toBlob()
}
