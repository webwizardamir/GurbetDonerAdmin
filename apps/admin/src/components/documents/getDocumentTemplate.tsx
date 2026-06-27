// Maps a document type to its @react-pdf template element. Shared by the admin
// DocumentGenerator (generate/preview) and the customer portal (re-render a stored
// document from its snapshot for download/preview). All templates take `data: InvoiceData`.
import { InvoiceTemplate } from './InvoiceTemplate'
import { ProformaTemplate } from './ProformaTemplate'
import { OrderConfirmationTemplate } from './OrderConfirmationTemplate'
import { PaymentReminderTemplate } from './PaymentReminderTemplate'
import { CreditNoteTemplate } from './CreditNoteTemplate'
import { PackingSlipTemplate } from './PackingSlipTemplate'
import type { InvoiceData } from '../../services/documents'
import type { DocumentType } from '../../types'

export function getDocumentTemplate(documentType: DocumentType, data: InvoiceData) {
  switch (documentType) {
    case 'invoice':
      return <InvoiceTemplate data={data} />
    case 'proforma':
      return <ProformaTemplate data={data} />
    case 'order_confirmation':
      return <OrderConfirmationTemplate data={data} />
    case 'payment_reminder':
      return <PaymentReminderTemplate data={data} />
    case 'credit_note':
      return <CreditNoteTemplate data={data} />
    case 'packing_slip':
      return <PackingSlipTemplate data={data} />
    default:
      return <InvoiceTemplate data={data} />
  }
}
