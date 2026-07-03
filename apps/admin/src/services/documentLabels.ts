// ===========================================================================
// Localized document text (NL default, EN for non-NL/BE customers).
//
// Why this file exists: PDF templates used to hardcode Dutch. Customers outside
// NL + BE now receive English documents (emails/reminders too — see
// documentEmail.ts). The language is decided by resolveDocumentLang(country)
// in utils/documentLang.ts and carried on InvoiceData.lang.
//
// Two mechanisms, on purpose:
//  1. InvoiceData.labels — the small, user-editable (Settings → Labels) subset.
//     buildInvoiceData fills it from document_settings for NL and from
//     EN_LABELS / DOC_TITLES_EN for EN. Plain strings → safe in the snapshot.
//  2. getDocText(lang) — the large set of fixed template prose (banners,
//     conditions, table headers, reminder bodies …). Resolved at RENDER time
//     from data.lang, so it is NEVER stored in the snapshot and may contain
//     interpolation functions. Old snapshots (no lang) fall back to Dutch.
// ===========================================================================

import type { DocumentType } from '../types'

export type DocLang = 'nl' | 'en'

// --- Settings-backed labels (InvoiceData.labels) — English side -------------
export const EN_LABELS = {
  invoiceAddress: 'Invoice address',
  date: 'Date',
  customerNumber: 'Customer number',
  dueDate: 'Due date',
  description: 'Description',
  quantity: 'Quantity',
  unit: 'Unit',
  unitPrice: 'Unit price',
  vat: 'VAT',
  total: 'Total',
  subtotal: 'Subtotal',
  grandTotal: 'Total incl. VAT',
  paymentMethod: 'Payment method',
  cash: 'Cash',
  bank: 'Bank',
  onAccount: 'On account',
  forApproval: 'For approval',
  name: 'Name',
  signature: 'Signature',
}

export const DOC_TITLES_EN: Record<DocumentType, string> = {
  invoice: 'INVOICE',
  proforma: 'QUOTATION',
  credit_note: 'CREDIT NOTE',
  packing_slip: 'PACKING SLIP',
  order_confirmation: 'ORDER CONFIRMATION',
  payment_reminder: 'PAYMENT REMINDER',
}

// --- Fixed template prose (render-time only) --------------------------------
const NL = {
  // meta labels
  metaInvoiceNumber: 'Factuurnummer:',
  metaInvoiceDate: 'Factuurdatum:',
  metaDeliveryDate: 'Leverdatum:',
  metaDate: 'Datum:',
  metaValidUntil: 'Geldig tot:',
  metaCreditDate: 'Creditnotadatum:',
  metaOrderNumber: 'Ordernummer:',
  metaOrderNumberShort: 'Order Nr.:',
  metaOrderDate: 'Orderdatum:',
  metaConfirmDate: 'Bevestigingsdatum:',
  metaArticles: 'Artikelen:',
  // address box labels
  addrRecipient: 'Geadresseerde',
  addrCustomer: 'Klantgegevens',
  addrDelivery: 'Afleveradres',
  addrDebtor: 'Debiteur',
  // table headers
  thDescription: 'Omschrijving',
  thProduct: 'Product',
  thNote: 'Notitie',
  thUnitPrice: 'Eenheidprijs',
  thPiecePrice: 'Stukprijs',
  thBoxPrice: 'Doosprijs',
  thQty: 'Aantal',
  thExclVat: 'Excl. BTW',
  thVat: 'BTW',
  thInclVat: 'Incl. BTW',
  thCredit: 'Credit',
  thTotal: 'Totaal',
  thCheck: 'Check',
  // totals
  tSubtotal: 'Subtotaal',
  tSubtotalExclVat: 'Subtotaal excl. BTW',
  tDiscount: 'Korting',
  tGrandInclVat: 'Totaal incl. BTW',
  tGrandTotal: 'Totaal',
  tCreditTotal: 'Totaal credit',
  // payment block (invoice)
  payMethod: 'Betaalmethode',
  payCash: 'Contant',
  payPin: 'PIN',
  payOpenBank: 'Open/Bank',
  payOldInvoices: 'Oude Facturen',
  receipt: 'Ontvangst',
  // reverse charge
  verlegdLabel: 'BTW verlegd — intracommunautaire levering',
  verlegdBody: ' (Art. 138 EU BTW-richtlijn 2006/112/EG). 0% BTW. BTW-nummer afnemer: ',
  // IBAN callout (invoice) — centered block under the payment terms
  ibanPay: 'Gelieve het bedrag over te maken op IBAN:',
  ibanHolderPrefix: 't.n.v. ',
  // proforma
  pfDisclaimer: 'Dit is een prijsopgave/offerte en geen factuur. Prijzen zijn onder voorbehoud.',
  pfConditionsTitle: 'Voorwaarden',
  pfConditions: (validUntil: string) =>
    `• Deze offerte is geldig tot ${validUntil}\n` +
    `• Prijzen zijn onder voorbehoud van prijswijzigingen\n` +
    `• Levertijd in overleg\n` +
    `• Op al onze leveringen zijn onze algemene voorwaarden van toepassing`,
  pfContactPrefix: 'Vragen? Neem contact met ons op: ',
  // credit note
  cnBanner: 'CREDITNOTA - Dit bedrag wordt verrekend met uw openstaande saldo',
  cnRefTitle: 'Referentie oorspronkelijke transactie',
  cnRefText: (order: string, date: string) =>
    `Deze creditnota heeft betrekking op order ${order} van ${date}.`,
  cnReasonTitle: 'Reden creditering',
  cnReasonText:
    'Annulering/retour van bestelling.\n\nBij vragen over deze creditnota kunt u contact opnemen met onze administratie.',
  cnProcessTitle: 'Verwerking van deze creditnota',
  cnProcessText: (amount: string) =>
    `Het creditbedrag van ${amount} wordt verrekend met uw openstaande facturen of uitbetaald naar uw bankrekening.\n\n` +
    `Heeft u reeds betaald? Dan ontvangt u het bedrag binnen 14 werkdagen retour.`,
  // order confirmation
  ocThankTitle: 'Bedankt voor uw bestelling!',
  ocThankText:
    'Wij hebben uw bestelling in goede orde ontvangen en gaan deze zo spoedig mogelijk verwerken.',
  ocSummaryTitle: 'Besteloverzicht',
  ocItemsLabel: 'Aantal artikelen:',
  ocItemsValue: (products: number, pieces: number) => `${products} producten (${pieces} stuks)`,
  ocTotalLabel: 'Totaalbedrag:',
  ocInclVatSuffix: ' incl. BTW',
  ocNextTitle: 'Wat kunt u verwachten?',
  ocNextText:
    `1. Wij verwerken uw bestelling binnen 1 werkdag\n` +
    `2. U ontvangt bericht wanneer uw bestelling klaar is voor levering\n` +
    `3. Levering vindt plaats op de afgesproken dag\n` +
    `4. Na levering ontvangt u de factuur\n\n` +
    `Wijzigingen? Neem zo snel mogelijk contact met ons op.`,
  ocContactTitle: 'Vragen over uw bestelling?',
  ocPhone: 'Telefoon:',
  ocEmail: 'E-mail:',
  // packing slip
  psNotesTitle: 'Bezorginformatie',
  psNotesText: 'Controleer alle artikelen bij ontvangst. Meld eventuele afwijkingen direct.',
  psSender: 'Afzender',
  psReceiver: 'Ontvanger',
  // payment reminder
  prTitleFinal: 'LAATSTE AANMANING',
  prTitleSecond: 'TWEEDE HERINNERING',
  prTitleFirst: 'BETALINGSHERINNERING',
  prOverdue: (days: number) => `Uw betaling is ${days} dagen over de vervaldatum.`,
  prDueReached: 'De vervaldatum van uw factuur is bereikt.',
  prMetaReminderDate: 'Herinneringsdatum:',
  prMetaDaysLate: 'Dagen te laat:',
  prDaysSuffix: (days: number) => `${days} dagen`,
  prRefTitle: 'Betreft: Openstaande factuur',
  prRefInvoiceNumber: 'Factuurnummer:',
  prRefOrderDate: 'Orderdatum:',
  prRefOrigDue: 'Oorspronkelijke vervaldatum:',
  prRefItems: 'Aantal artikelen:',
  prAmountDueLabel: 'OPENSTAAND BEDRAG',
  prGreeting: 'Geachte heer/mevrouw,',
  prBodyCritical: (amount: string) =>
    `Ondanks eerdere herinneringen hebben wij nog geen betaling van u ontvangen voor bovengenoemde factuur. Het openstaande bedrag van ${amount} dient per omgaande te worden voldaan.\n\nIndien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt de vordering uit handen te geven. De daaruit voortvloeiende kosten zullen op u worden verhaald.`,
  prBodyUrgent: (amount: string, days: number) =>
    `Wij hebben tot op heden geen betaling van u ontvangen voor bovengenoemde factuur. Het totaalbedrag van ${amount} is inmiddels ${days} dagen over de vervaldatum.\n\nWij verzoeken u vriendelijk doch dringend het openstaande bedrag binnen 7 dagen over te maken.`,
  prBodyNormal:
    'Uit onze administratie blijkt dat onderstaande factuur nog niet is voldaan. Wellicht is uw betaling reeds onderweg, in dat geval kunt u deze herinnering als niet verzonden beschouwen.\n\nMocht u de factuur nog niet hebben betaald, dan verzoeken wij u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken.',
  prBankTitle: 'Maak uw betaling over naar:',
  prBankBank: 'Bank:',
  prBankHolder: 'T.n.v.:',
  prIbanRef: (number: string) => `Vermeld bij betaling: ${number}`,
  prActionTitle: 'Heeft u vragen of opmerkingen?',
  prActionText: (phone?: string, email?: string) =>
    `Neem dan zo spoedig mogelijk contact met ons op:\n` +
    (phone ? `Telefoon: ${phone}\n` : '') +
    (email ? `E-mail: ${email}\n` : '') +
    `\nIndien u reeds betaald heeft, verzoeken wij u dit bericht te negeren.`,
}

const EN: typeof NL = {
  metaInvoiceNumber: 'Invoice number:',
  metaInvoiceDate: 'Invoice date:',
  metaDeliveryDate: 'Delivery date:',
  metaDate: 'Date:',
  metaValidUntil: 'Valid until:',
  metaCreditDate: 'Credit note date:',
  metaOrderNumber: 'Order number:',
  metaOrderNumberShort: 'Order no.:',
  metaOrderDate: 'Order date:',
  metaConfirmDate: 'Confirmation date:',
  metaArticles: 'Items:',
  addrRecipient: 'Recipient',
  addrCustomer: 'Customer details',
  addrDelivery: 'Delivery address',
  addrDebtor: 'Debtor',
  thDescription: 'Description',
  thProduct: 'Product',
  thNote: 'Note',
  thUnitPrice: 'Unit price',
  thPiecePrice: 'Piece price',
  thBoxPrice: 'Box price',
  thQty: 'Quantity',
  thExclVat: 'Excl. VAT',
  thVat: 'VAT',
  thInclVat: 'Incl. VAT',
  thCredit: 'Credit',
  thTotal: 'Total',
  thCheck: 'Check',
  tSubtotal: 'Subtotal',
  tSubtotalExclVat: 'Subtotal excl. VAT',
  tDiscount: 'Discount',
  tGrandInclVat: 'Total incl. VAT',
  tGrandTotal: 'Total',
  tCreditTotal: 'Total credit',
  payMethod: 'Payment method',
  payCash: 'Cash',
  payPin: 'Card',
  payOpenBank: 'Open/Bank',
  payOldInvoices: 'Previous invoices',
  receipt: 'Receipt',
  verlegdLabel: 'VAT reverse charge — intra-Community supply',
  verlegdBody: ' (Art. 138 EU VAT Directive 2006/112/EC). 0% VAT. Customer VAT number: ',
  ibanPay: 'Please transfer the amount to IBAN:',
  ibanHolderPrefix: 'in the name of ',
  pfDisclaimer: 'This is a quotation, not an invoice. Prices are subject to change.',
  pfConditionsTitle: 'Terms',
  pfConditions: (validUntil: string) =>
    `• This quotation is valid until ${validUntil}\n` +
    `• Prices are subject to change\n` +
    `• Delivery time to be agreed\n` +
    `• All our deliveries are subject to our general terms and conditions`,
  pfContactPrefix: 'Questions? Contact us: ',
  cnBanner: 'CREDIT NOTE - This amount will be offset against your outstanding balance',
  cnRefTitle: 'Reference to original transaction',
  cnRefText: (order: string, date: string) =>
    `This credit note relates to order ${order} dated ${date}.`,
  cnReasonTitle: 'Reason for credit',
  cnReasonText:
    'Cancellation/return of order.\n\nFor questions about this credit note, please contact our administration.',
  cnProcessTitle: 'Processing of this credit note',
  cnProcessText: (amount: string) =>
    `The credit amount of ${amount} will be offset against your outstanding invoices or paid to your bank account.\n\n` +
    `Have you already paid? You will receive the amount back within 14 working days.`,
  ocThankTitle: 'Thank you for your order!',
  ocThankText: 'We have received your order in good order and will process it as soon as possible.',
  ocSummaryTitle: 'Order summary',
  ocItemsLabel: 'Number of items:',
  ocItemsValue: (products: number, pieces: number) => `${products} products (${pieces} pieces)`,
  ocTotalLabel: 'Total amount:',
  ocInclVatSuffix: ' incl. VAT',
  ocNextTitle: 'What to expect?',
  ocNextText:
    `1. We process your order within 1 working day\n` +
    `2. You will be notified when your order is ready for delivery\n` +
    `3. Delivery takes place on the agreed day\n` +
    `4. After delivery you will receive the invoice\n\n` +
    `Changes? Please contact us as soon as possible.`,
  ocContactTitle: 'Questions about your order?',
  ocPhone: 'Phone:',
  ocEmail: 'Email:',
  psNotesTitle: 'Delivery information',
  psNotesText: 'Please check all items on receipt. Report any discrepancies immediately.',
  psSender: 'Sender',
  psReceiver: 'Recipient',
  prTitleFinal: 'FINAL NOTICE',
  prTitleSecond: 'SECOND REMINDER',
  prTitleFirst: 'PAYMENT REMINDER',
  prOverdue: (days: number) => `Your payment is ${days} days past the due date.`,
  prDueReached: 'The due date of your invoice has been reached.',
  prMetaReminderDate: 'Reminder date:',
  prMetaDaysLate: 'Days overdue:',
  prDaysSuffix: (days: number) => `${days} days`,
  prRefTitle: 'Re: Outstanding invoice',
  prRefInvoiceNumber: 'Invoice number:',
  prRefOrderDate: 'Order date:',
  prRefOrigDue: 'Original due date:',
  prRefItems: 'Number of items:',
  prAmountDueLabel: 'AMOUNT DUE',
  prGreeting: 'Dear Sir or Madam,',
  prBodyCritical: (amount: string) =>
    `Despite previous reminders, we have not yet received your payment for the above invoice. The outstanding amount of ${amount} must be paid immediately.\n\nIf we do not receive payment within 7 days, we will be obliged to hand over the claim for collection. Any resulting costs will be charged to you.`,
  prBodyUrgent: (amount: string, days: number) =>
    `To date we have not received your payment for the above invoice. The total amount of ${amount} is now ${days} days past the due date.\n\nWe kindly but urgently request that you transfer the outstanding amount within 7 days.`,
  prBodyNormal:
    'Our records show that the invoice below has not yet been paid. Your payment may already be on its way, in which case you may disregard this reminder.\n\nIf you have not yet paid the invoice, we kindly request that you transfer the outstanding amount as soon as possible.',
  prBankTitle: 'Please transfer your payment to:',
  prBankBank: 'Bank:',
  prBankHolder: 'Name:',
  prIbanRef: (number: string) => `Payment reference: ${number}`,
  prActionTitle: 'Questions or comments?',
  prActionText: (phone?: string, email?: string) =>
    `Please contact us as soon as possible:\n` +
    (phone ? `Phone: ${phone}\n` : '') +
    (email ? `Email: ${email}\n` : '') +
    `\nIf you have already paid, please disregard this message.`,
}

export type DocText = typeof NL

/** Render-time template text for the given language (anything != 'en' → Dutch). */
export function getDocText(lang: DocLang | undefined): DocText {
  return lang === 'en' ? EN : NL
}
