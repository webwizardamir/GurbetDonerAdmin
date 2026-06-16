import { Document } from '@react-pdf/renderer'
import { InvoicePage } from './InvoiceTemplate'
import type { InvoiceData } from '../../services/documents'

// One PDF containing every selected invoice, one A4 page each. Reuses the exact
// single-invoice page body so the layout stays identical to a standalone
// invoice. Used by the Dagafsluiting (day-close) batch flow.
export default function CombinedInvoicesTemplate({ invoices }: { invoices: InvoiceData[] }) {
  return (
    <Document>
      {invoices.map(data => (
        <InvoicePage key={data.order.id} data={data} />
      ))}
    </Document>
  )
}
