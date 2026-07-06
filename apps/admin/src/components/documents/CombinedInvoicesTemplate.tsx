import { Document } from '@react-pdf/renderer'
import { InvoicePage } from './InvoiceTemplate'
import type { InvoiceData } from '../../services/documents'

// One PDF containing every selected invoice, one A4 page each. Reuses the exact
// single-invoice page body so the layout stays identical to a standalone
// invoice. Used by the Dagafsluiting (day-close) batch flow.
//
// The same invoice may legitimately appear more than once in `invoices` (the
// "aantal kopieën" feature repeats each invoice N times consecutively so a
// single print gives 1-1-2-2-3-3… copies), so the key must be index-based —
// `order.id` would collide across repeats.
export default function CombinedInvoicesTemplate({ invoices }: { invoices: InvoiceData[] }) {
  return (
    <Document>
      {invoices.map((data, i) => (
        <InvoicePage key={`${data.order.id}-${i}`} data={data} />
      ))}
    </Document>
  )
}
