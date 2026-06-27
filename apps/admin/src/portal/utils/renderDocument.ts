// Re-render a stored document's PDF on demand from its immutable `snapshot`
// (the same InvoiceData the admin renders from). PDFs aren't persisted anywhere,
// so this is how the portal lets a customer download/preview their documents.
// @react-pdf and the templates are lazy-imported so they stay out of the portal's
// initial bundle (loaded on first download/preview click). The snapshot is safe to
// render client-side — it contains no cost/profit fields (security-reviewed).
import type { Document } from '../../types'
import type { InvoiceData } from '../../services/documents'

type RenderableDoc = Pick<Document, 'document_type' | 'snapshot'>

export async function renderDocumentBlob(doc: RenderableDoc): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  const { getDocumentTemplate } = await import('../../components/documents/getDocumentTemplate')
  return pdf(getDocumentTemplate(doc.document_type, doc.snapshot as unknown as InvoiceData)).toBlob()
}

// Trigger a browser download for a rendered blob.
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
