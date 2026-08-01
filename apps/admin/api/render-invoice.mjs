// api-src/render-invoice.tsx
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";

// src/components/documents/InvoiceTemplate.tsx
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet
} from "@react-pdf/renderer";

// src/services/documentLabels.ts
var NL = {
  // meta labels
  metaInvoiceNumber: "Factuurnummer:",
  metaInvoiceDate: "Factuurdatum:",
  metaDeliveryDate: "Leverdatum:",
  metaDate: "Datum:",
  metaValidUntil: "Geldig tot:",
  metaCreditDate: "Creditnotadatum:",
  metaOrderNumber: "Ordernummer:",
  metaOrderNumberShort: "Order Nr.:",
  metaOrderDate: "Orderdatum:",
  metaConfirmDate: "Bevestigingsdatum:",
  metaArticles: "Artikelen:",
  // address box labels
  addrRecipient: "Geadresseerde",
  addrCustomer: "Klantgegevens",
  addrDelivery: "Afleveradres",
  addrDebtor: "Debiteur",
  // table headers
  thDescription: "Omschrijving",
  thProduct: "Product",
  thNote: "Notitie",
  thUnitPrice: "Eenheidprijs",
  // Generic "price of one single unit" (per stuk for boxed goods, per kg for
  // weighed goods) — used as the first price column when a box line is present,
  // sitting next to Doosprijs. NOT literally "Stukprijs" so it isn't wrong on a
  // kg row in a mixed order.
  thPiecePrice: "Eenheidprijs",
  thBoxPrice: "Doosprijs",
  thQty: "Aantal",
  thExclVat: "Excl. BTW",
  thVat: "BTW",
  thInclVat: "Incl. BTW",
  thCredit: "Credit",
  thTotal: "Totaal",
  thCheck: "Check",
  // totals
  tSubtotal: "Subtotaal",
  tSubtotalExclVat: "Subtotaal excl. BTW",
  tDiscount: "Korting",
  tShipping: "Verzendkosten",
  tGrandInclVat: "Totaal incl. BTW",
  tGrandTotal: "Totaal",
  tCreditTotal: "Totaal credit",
  // payment block (invoice)
  payMethod: "Betaalmethode",
  payCash: "Contant",
  payPin: "PIN",
  payOpenBank: "Open/Bank",
  payOldInvoices: "Oude Facturen",
  receipt: "Ontvangst",
  // reverse charge
  verlegdLabel: "BTW verlegd \u2014 intracommunautaire levering",
  verlegdBody: " (Art. 138 EU BTW-richtlijn 2006/112/EG). 0% BTW. BTW-nummer afnemer: ",
  // IBAN callout (invoice) — centered block under the payment terms
  ibanPay: "Gelieve het bedrag over te maken op IBAN:",
  ibanHolderPrefix: "t.n.v. ",
  // proforma
  pfDisclaimer: "Dit is een prijsopgave/offerte en geen factuur. Prijzen zijn onder voorbehoud.",
  pfConditionsTitle: "Voorwaarden",
  pfConditions: (validUntil) => `\u2022 Deze offerte is geldig tot ${validUntil}
\u2022 Prijzen zijn onder voorbehoud van prijswijzigingen
\u2022 Levertijd in overleg
\u2022 Op al onze leveringen zijn onze algemene voorwaarden van toepassing`,
  pfContactPrefix: "Vragen? Neem contact met ons op: ",
  // credit note
  cnBanner: "CREDITNOTA - Dit bedrag wordt verrekend met uw openstaande saldo",
  cnRefTitle: "Referentie oorspronkelijke transactie",
  cnRefText: (order, date) => `Deze creditnota heeft betrekking op order ${order} van ${date}.`,
  cnReasonTitle: "Reden creditering",
  cnReasonText: "Annulering/retour van bestelling.\n\nBij vragen over deze creditnota kunt u contact opnemen met onze administratie.",
  cnProcessTitle: "Verwerking van deze creditnota",
  cnProcessText: (amount) => `Het creditbedrag van ${amount} wordt verrekend met uw openstaande facturen of uitbetaald naar uw bankrekening.

Heeft u reeds betaald? Dan ontvangt u het bedrag binnen 14 werkdagen retour.`,
  // order confirmation
  ocThankTitle: "Bedankt voor uw bestelling!",
  ocThankText: "Wij hebben uw bestelling in goede orde ontvangen en gaan deze zo spoedig mogelijk verwerken.",
  ocSummaryTitle: "Besteloverzicht",
  ocItemsLabel: "Aantal artikelen:",
  ocItemsValue: (products, pieces) => `${products} producten (${pieces} stuks)`,
  ocTotalLabel: "Totaalbedrag:",
  ocInclVatSuffix: " incl. BTW",
  ocNextTitle: "Wat kunt u verwachten?",
  ocNextText: `1. Wij verwerken uw bestelling binnen 1 werkdag
2. U ontvangt bericht wanneer uw bestelling klaar is voor levering
3. Levering vindt plaats op de afgesproken dag
4. Na levering ontvangt u de factuur

Wijzigingen? Neem zo snel mogelijk contact met ons op.`,
  ocContactTitle: "Vragen over uw bestelling?",
  ocPhone: "Telefoon:",
  ocEmail: "E-mail:",
  // packing slip
  psNotesTitle: "Bezorginformatie",
  psNotesText: "Controleer alle artikelen bij ontvangst. Meld eventuele afwijkingen direct.",
  psSender: "Afzender",
  psReceiver: "Ontvanger",
  psTotalLabel: "Totaal",
  // payment reminder
  prTitleFinal: "LAATSTE AANMANING",
  prTitleSecond: "TWEEDE HERINNERING",
  prTitleFirst: "BETALINGSHERINNERING",
  prOverdue: (days) => `Uw betaling is ${days} dagen over de vervaldatum.`,
  prDueReached: "De vervaldatum van uw factuur is bereikt.",
  prMetaReminderDate: "Herinneringsdatum:",
  prMetaDaysLate: "Dagen te laat:",
  prDaysSuffix: (days) => `${days} dagen`,
  prRefTitle: "Betreft: Openstaande factuur",
  prRefInvoiceNumber: "Factuurnummer:",
  prRefOrderDate: "Orderdatum:",
  prRefOrigDue: "Oorspronkelijke vervaldatum:",
  prRefItems: "Aantal artikelen:",
  prAmountDueLabel: "OPENSTAAND BEDRAG",
  prGreeting: "Geachte heer/mevrouw,",
  prBodyCritical: (amount) => `Ondanks eerdere herinneringen hebben wij nog geen betaling van u ontvangen voor bovengenoemde factuur. Het openstaande bedrag van ${amount} dient per omgaande te worden voldaan.

Indien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt de vordering uit handen te geven. De daaruit voortvloeiende kosten zullen op u worden verhaald.`,
  prBodyUrgent: (amount, days) => `Wij hebben tot op heden geen betaling van u ontvangen voor bovengenoemde factuur. Het totaalbedrag van ${amount} is inmiddels ${days} dagen over de vervaldatum.

Wij verzoeken u vriendelijk doch dringend het openstaande bedrag binnen 7 dagen over te maken.`,
  prBodyNormal: "Uit onze administratie blijkt dat onderstaande factuur nog niet is voldaan. Wellicht is uw betaling reeds onderweg, in dat geval kunt u deze herinnering als niet verzonden beschouwen.\n\nMocht u de factuur nog niet hebben betaald, dan verzoeken wij u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken.",
  prBankTitle: "Maak uw betaling over naar:",
  prBankBank: "Bank:",
  prBankHolder: "T.n.v.:",
  prIbanRef: (number) => `Vermeld bij betaling: ${number}`,
  prActionTitle: "Heeft u vragen of opmerkingen?",
  prActionText: (phone, email) => `Neem dan zo spoedig mogelijk contact met ons op:
` + (phone ? `Telefoon: ${phone}
` : "") + (email ? `E-mail: ${email}
` : "") + `
Indien u reeds betaald heeft, verzoeken wij u dit bericht te negeren.`,
  // payment overview (monthly statement of account)
  poTitle: "BETAALOVERZICHT",
  poAddrLabel: "Overzicht voor",
  poMetaDate: "Overzichtsdatum:",
  poMetaAsAt: "Peildatum:",
  poMetaCount: "Verlopen facturen:",
  poThInvoice: "Factuur",
  poThInvoiceDate: "Factuurdatum",
  poThDueDate: "Vervaldatum",
  poThDaysLate: "Dagen te laat",
  poThAmount: "Bedrag",
  poTotalLabel: "Totaal te betalen",
  poIntro: (asAt) => `Hieronder vindt u een overzicht van de facturen die volgens onze administratie op ${asAt} vervallen zijn en nog openstaan.`,
  poAlreadyPaid: "Heeft u een of meer van deze facturen inmiddels betaald? Dan kunt u die regels als voldaan beschouwen. Betalingen van de afgelopen dagen zijn mogelijk nog niet verwerkt.",
  poIbanRef: "Vermeld bij betaling het factuurnummer.",
  poEmpty: "Er staan op dit moment geen facturen open. Hartelijk dank voor uw betaling."
};
var EN = {
  metaInvoiceNumber: "Invoice number:",
  metaInvoiceDate: "Invoice date:",
  metaDeliveryDate: "Delivery date:",
  metaDate: "Date:",
  metaValidUntil: "Valid until:",
  metaCreditDate: "Credit note date:",
  metaOrderNumber: "Order number:",
  metaOrderNumberShort: "Order no.:",
  metaOrderDate: "Order date:",
  metaConfirmDate: "Confirmation date:",
  metaArticles: "Items:",
  addrRecipient: "Recipient",
  addrCustomer: "Customer details",
  addrDelivery: "Delivery address",
  addrDebtor: "Debtor",
  thDescription: "Description",
  thProduct: "Product",
  thNote: "Note",
  thUnitPrice: "Unit price",
  thPiecePrice: "Unit price",
  thBoxPrice: "Box price",
  thQty: "Quantity",
  thExclVat: "Excl. VAT",
  thVat: "VAT",
  thInclVat: "Incl. VAT",
  thCredit: "Credit",
  thTotal: "Total",
  thCheck: "Check",
  tSubtotal: "Subtotal",
  tSubtotalExclVat: "Subtotal excl. VAT",
  tDiscount: "Discount",
  tShipping: "Shipping",
  tGrandInclVat: "Total incl. VAT",
  tGrandTotal: "Total",
  tCreditTotal: "Total credit",
  payMethod: "Payment method",
  payCash: "Cash",
  payPin: "Card",
  payOpenBank: "Open/Bank",
  payOldInvoices: "Previous invoices",
  receipt: "Receipt",
  verlegdLabel: "VAT reverse charge \u2014 intra-Community supply",
  verlegdBody: " (Art. 138 EU VAT Directive 2006/112/EC). 0% VAT. Customer VAT number: ",
  ibanPay: "Please transfer the amount to IBAN:",
  ibanHolderPrefix: "in the name of ",
  pfDisclaimer: "This is a quotation, not an invoice. Prices are subject to change.",
  pfConditionsTitle: "Terms",
  pfConditions: (validUntil) => `\u2022 This quotation is valid until ${validUntil}
\u2022 Prices are subject to change
\u2022 Delivery time to be agreed
\u2022 All our deliveries are subject to our general terms and conditions`,
  pfContactPrefix: "Questions? Contact us: ",
  cnBanner: "CREDIT NOTE - This amount will be offset against your outstanding balance",
  cnRefTitle: "Reference to original transaction",
  cnRefText: (order, date) => `This credit note relates to order ${order} dated ${date}.`,
  cnReasonTitle: "Reason for credit",
  cnReasonText: "Cancellation/return of order.\n\nFor questions about this credit note, please contact our administration.",
  cnProcessTitle: "Processing of this credit note",
  cnProcessText: (amount) => `The credit amount of ${amount} will be offset against your outstanding invoices or paid to your bank account.

Have you already paid? You will receive the amount back within 14 working days.`,
  ocThankTitle: "Thank you for your order!",
  ocThankText: "We have received your order in good order and will process it as soon as possible.",
  ocSummaryTitle: "Order summary",
  ocItemsLabel: "Number of items:",
  ocItemsValue: (products, pieces) => `${products} products (${pieces} pieces)`,
  ocTotalLabel: "Total amount:",
  ocInclVatSuffix: " incl. VAT",
  ocNextTitle: "What to expect?",
  ocNextText: `1. We process your order within 1 working day
2. You will be notified when your order is ready for delivery
3. Delivery takes place on the agreed day
4. After delivery you will receive the invoice

Changes? Please contact us as soon as possible.`,
  ocContactTitle: "Questions about your order?",
  ocPhone: "Phone:",
  ocEmail: "Email:",
  psNotesTitle: "Delivery information",
  psNotesText: "Please check all items on receipt. Report any discrepancies immediately.",
  psSender: "Sender",
  psReceiver: "Recipient",
  psTotalLabel: "Total",
  prTitleFinal: "FINAL NOTICE",
  prTitleSecond: "SECOND REMINDER",
  prTitleFirst: "PAYMENT REMINDER",
  prOverdue: (days) => `Your payment is ${days} days past the due date.`,
  prDueReached: "The due date of your invoice has been reached.",
  prMetaReminderDate: "Reminder date:",
  prMetaDaysLate: "Days overdue:",
  prDaysSuffix: (days) => `${days} days`,
  prRefTitle: "Re: Outstanding invoice",
  prRefInvoiceNumber: "Invoice number:",
  prRefOrderDate: "Order date:",
  prRefOrigDue: "Original due date:",
  prRefItems: "Number of items:",
  prAmountDueLabel: "AMOUNT DUE",
  prGreeting: "Dear Sir or Madam,",
  prBodyCritical: (amount) => `Despite previous reminders, we have not yet received your payment for the above invoice. The outstanding amount of ${amount} must be paid immediately.

If we do not receive payment within 7 days, we will be obliged to hand over the claim for collection. Any resulting costs will be charged to you.`,
  prBodyUrgent: (amount, days) => `To date we have not received your payment for the above invoice. The total amount of ${amount} is now ${days} days past the due date.

We kindly but urgently request that you transfer the outstanding amount within 7 days.`,
  prBodyNormal: "Our records show that the invoice below has not yet been paid. Your payment may already be on its way, in which case you may disregard this reminder.\n\nIf you have not yet paid the invoice, we kindly request that you transfer the outstanding amount as soon as possible.",
  prBankTitle: "Please transfer your payment to:",
  prBankBank: "Bank:",
  prBankHolder: "Name:",
  prIbanRef: (number) => `Payment reference: ${number}`,
  prActionTitle: "Questions or comments?",
  prActionText: (phone, email) => `Please contact us as soon as possible:
` + (phone ? `Phone: ${phone}
` : "") + (email ? `Email: ${email}
` : "") + `
If you have already paid, please disregard this message.`,
  poTitle: "STATEMENT OF ACCOUNT",
  poAddrLabel: "Statement for",
  poMetaDate: "Statement date:",
  poMetaAsAt: "As at:",
  poMetaCount: "Overdue invoices:",
  poThInvoice: "Invoice",
  poThInvoiceDate: "Invoice date",
  poThDueDate: "Due date",
  poThDaysLate: "Days overdue",
  poThAmount: "Amount",
  poTotalLabel: "Total due",
  poIntro: (asAt) => `Below is an overview of the invoices that, according to our records, were past their due date and still unpaid on ${asAt}.`,
  poAlreadyPaid: "Have you already paid one or more of these invoices? Please consider those lines settled. Payments made in the last few days may not yet be processed.",
  poIbanRef: "Please quote the invoice number with your payment.",
  poEmpty: "There are currently no outstanding invoices. Thank you for your payment."
};
function getDocText(lang) {
  return lang === "en" ? EN : NL;
}

// src/utils/format.ts
var eurFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR"
});
var dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
var dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
var dateShortFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric"
});
var dayMonthFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit"
});
var timeShortFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit"
});
var countFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0
});
function formatPrice(cents) {
  return eurFormatter.format(cents / 100);
}
function formatDate(dateString) {
  return dateFormatter.format(new Date(dateString));
}

// src/utils/address.ts
function buildAddressLines(a) {
  if (!a) return [];
  const lines = [];
  if (a.street) lines.push(a.street);
  const cityParts = [];
  if (a.postalCode && a.city) cityParts.push(`${a.postalCode} ${a.city}`);
  else if (a.city) cityParts.push(a.city);
  if (a.country && a.country !== a.city) cityParts.push(a.country);
  if (cityParts.length) lines.push(cityParts.join(", "));
  return lines;
}

// src/config/tenantId.ts
function resolveTenantId() {
  const raw = "melek";
  return raw === "father" ? "father" : "melek";
}
var tenantId = resolveTenantId();

// src/components/documents/brandPalette.ts
var MELEK = {
  invoice: {
    primary: "#16a34a",
    dark: "#166534",
    accent: "#22c55e",
    tint: "#dcfce7",
    tintSoft: "#f0fdf4"
  },
  proforma: {
    primary: "#3b82f6",
    dark: "#1e40af",
    tint: "#dbeafe"
  },
  creditNote: {
    primary: "#7c3aed",
    dark: "#6d28d9",
    deep: "#5b21b6",
    accent: "#6b21a8",
    tint: "#ede9fe",
    tintSoft: "#faf5ff"
  },
  orderConfirmation: {
    primary: "#0891b2",
    dark: "#0e7490",
    tint: "#cffafe",
    tintSoft: "#f0fdfa"
  },
  paymentReminder: {
    primary: "#dc2626",
    dark: "#991b1b",
    accent: "#fca5a5",
    tint: "#fecaca",
    tintSoft: "#fef2f2"
  },
  /**
   * Monthly Betaaloverzicht (statement of account). Indigo, deliberately unused
   * elsewhere in either tenant's family.
   *
   * It must not read as the INVOICE (that is the payable document, and on Gurbet
   * the "darkest navy band = money is due" rule is load-bearing), nor as the
   * PAYMENT REMINDER — a statement is a courtesy summary that also goes to
   * customers who are perfectly within terms, so the dunning red would be a lie.
   * Indigo is far from both, and identical on both tenants because the document
   * is a summary, not a branding surface.
   */
  paymentOverview: {
    primary: "#4338ca",
    dark: "#312e81",
    // 12.3:1 on white
    accent: "#6366f1",
    tint: "#e0e7ff",
    tintSoft: "#eef2ff"
  },
  packingSlip: {
    primary: "#1e293b",
    dark: "#1e293b",
    accent: "#3b82f6"
  },
  soldProducts: {
    primary: "#16a34a",
    dark: "#166534",
    badgeTint: "#dbeafe",
    badgeText: "#2563eb"
  },
  dataExport: {
    primary: "#16a34a",
    dark: "#166534"
  },
  deliveryRoute: {
    primary: "#0891b2",
    dark: "#0e7490"
  }
};
var FATHER = {
  invoice: {
    primary: "#0a62b4",
    dark: "#07406f",
    // 10.65:1 on white — the heaviest band in the family
    accent: "#2b82d4",
    tint: "#dbeafe",
    tintSoft: "#eff6ff"
  },
  proforma: {
    primary: "#b45309",
    // 183° from the invoice, and 11 L* lighter in greyscale
    dark: "#92400e",
    deep: "#92400e",
    accent: "#b45309",
    tint: "#ffedd5",
    // NOT #fef3c7 — that would blend into the amber verlegd notice
    tintSoft: "#fff7ed"
  },
  creditNote: {
    primary: "#9333ea",
    dark: "#7e22ce",
    deep: "#6b21a8",
    accent: "#6b21a8",
    tint: "#f3e8ff",
    tintSoft: "#faf5ff"
  },
  orderConfirmation: {
    // Teal, not green: this template's thank-you banner IS green (#10b981), and a
    // green primary would swallow it.
    primary: "#0f766e",
    dark: "#115e59",
    deep: "#134e4a",
    tint: "#ccfbf1",
    tintSoft: "#f0fdfa"
  },
  paymentReminder: {
    // Unchanged. Red is the only correct hue for a dunning letter.
    primary: "#dc2626",
    dark: "#991b1b",
    accent: "#fca5a5",
    tint: "#fecaca",
    tintSoft: "#fef2f2"
  },
  paymentOverview: {
    // Same indigo as Melek — see the note on the MELEK entry. It has to stay clear
    // of the brand blue here too, which the invoice owns.
    primary: "#4338ca",
    dark: "#312e81",
    accent: "#6366f1",
    tint: "#e0e7ff",
    tintSoft: "#eef2ff"
  },
  packingSlip: {
    // Unchanged neutral — a warehouse pick list, not a branding surface. Only the
    // customer rule moves: it was #3b82f6, which lands 8° off the new brand and
    // would read as almost-but-not-quite the brand. Made exact instead.
    primary: "#1e293b",
    dark: "#1e293b",
    accent: "#0a62b4"
  },
  soldProducts: {
    primary: "#0a62b4",
    dark: "#07406f",
    // Melek's blue refill badge would collide with the brand here.
    badgeTint: "#f3e8ff",
    badgeText: "#7e22ce"
  },
  dataExport: {
    primary: "#0a62b4",
    dark: "#07406f"
  },
  deliveryRoute: {
    // Keeps cyan: now uniquely cyan (order confirmation vacated it), and it is an
    // internal driver sheet that never sits in a customer's stack of paperwork.
    primary: "#0891b2",
    dark: "#0e7490"
  }
};
var docBrand = tenantId === "father" ? FATHER : MELEK;

// src/components/documents/InvoiceTemplate.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var LEVERDATUM_FIX_CUTOFF = "2026-07-20";
var deliveryDateForRow = (data) => (data.documentDate || "") >= LEVERDATUM_FIX_CUTOFF ? data.documentDate : data.dueDate;
var styles = StyleSheet.create({
  // ===========================================
  // PAGE
  // ===========================================
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  // ===========================================
  // HEADER
  // ===========================================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: docBrand.invoice.primary
  },
  // ===========================================
  // INFO ROW (Customer + Metadata)
  // ===========================================
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.invoice.accent,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  // Dual-address layout — only rendered when the customer has a delivery
  // address that differs from the billing address. Two accent boxes share
  // roughly the width the single customer box normally takes, so the block
  // costs no extra vertical space (the compact 15-16 items/page spec holds).
  addressGroup: {
    width: "58%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addressBoxHalf: {
    width: "48.5%"
  },
  customerNameDual: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  metaValueDue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626"
  },
  // ===========================================
  // REVERSE-CHARGE NOTICE (single-line, professional)
  // ===========================================
  verlegdBox: {
    borderLeftWidth: 2,
    borderLeftColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  verlegdText: {
    fontSize: 7.5,
    color: "#78350f",
    lineHeight: 1.35
  },
  verlegdLabel: {
    fontFamily: "Helvetica-Bold"
  },
  // ===========================================
  // ITEMS TABLE
  // ===========================================
  table: {
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: docBrand.invoice.dark,
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0"
  },
  rowEven: {
    backgroundColor: "#f8fafc"
  },
  rowOdd: {
    backgroundColor: "#ffffff"
  },
  td: {
    fontSize: 7.5
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold"
  },
  // Column widths
  colNum: { width: 18, textAlign: "right", paddingRight: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colNote: { width: 62, paddingRight: 6 },
  colUnitPrice: { width: 62, textAlign: "right", paddingRight: 6 },
  // Box (doos) dual-price columns — used only when the order has a box line.
  colPiecePrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colBoxPrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colQty: { width: 52, textAlign: "left", paddingLeft: 4 },
  colExclVat: { width: 66, textAlign: "right", paddingRight: 6 },
  colVatAmt: { width: 50, textAlign: "right", paddingRight: 6 },
  colInclVat: { width: 66, textAlign: "right" },
  // ===========================================
  // BOTTOM SECTION
  // ===========================================
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  // Left: Payment + Receipt
  leftColumn: {
    width: "55%",
    flexDirection: "row",
    gap: 6
  },
  actionBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderTopWidth: 2,
    borderTopColor: docBrand.invoice.primary,
    padding: 6
  },
  actionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: docBrand.invoice.dark,
    textTransform: "uppercase",
    marginBottom: 4
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    marginRight: 5
  },
  paymentLabel: {
    fontSize: 7.5,
    color: "#1e293b"
  },
  sigField: {
    marginBottom: 4
  },
  sigLabel: {
    fontSize: 6.5,
    color: "#64748b",
    marginBottom: 1
  },
  sigLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    borderStyle: "dashed",
    height: 10
  },
  // Right: Totals
  rightColumn: {
    width: "40%"
  },
  totalsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderTopWidth: 2,
    borderTopColor: docBrand.invoice.primary,
    padding: 7
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  totalLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  totalValue: {
    fontSize: 7.5,
    textAlign: "right"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: docBrand.invoice.primary
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: docBrand.invoice.dark
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: docBrand.invoice.primary
  },
  // ===========================================
  // PAYMENT TERMS
  // ===========================================
  paymentTerms: {
    backgroundColor: docBrand.invoice.tint,
    borderWidth: 0.5,
    borderColor: docBrand.invoice.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6
  },
  paymentTermsText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.invoice.dark,
    textAlign: "center"
  },
  // ===========================================
  // IBAN CALLOUT (directly under the payment terms — clients kept asking
  // "where is your IBAN?"). Centered, prominent IBAN (reminder-style, a touch
  // smaller). The footer IBAN was removed in favour of this.
  // ===========================================
  ibanCallout: {
    borderWidth: 0.5,
    borderColor: docBrand.invoice.primary,
    backgroundColor: docBrand.invoice.tintSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: "center"
  },
  ibanCalloutLabel: {
    fontSize: 8,
    color: docBrand.invoice.dark,
    marginBottom: 2
  },
  ibanCalloutIban: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: docBrand.invoice.primary,
    letterSpacing: 0.5
  },
  ibanCalloutHolder: {
    fontSize: 7.5,
    color: docBrand.invoice.dark,
    marginTop: 1
  },
  // ===========================================
  // FOOTER
  // ===========================================
  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.invoice.primary,
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  },
  footerIban: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.invoice.dark
  },
  footerSeparator: {
    fontSize: 7,
    color: "#cbd5e1",
    marginHorizontal: 4
  },
  footerCenter: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3
  }
});
function InvoicePage({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== "NL";
  const hasBox = data.items.some((i) => i.unitType === "doos");
  const hasNotes = data.items.some((i) => (i.note ?? "").trim().length > 0);
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  if (data.customer.street) customerLines.push(data.customer.street);
  const cityParts = [];
  if (data.customer.postalCode && data.customer.city) {
    cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
  } else if (data.customer.city) {
    cityParts.push(data.customer.city);
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    cityParts.push(data.customer.country);
  }
  if (cityParts.length) customerLines.push(cityParts.join(", "));
  if (data.customer.vatNumber) customerLines.push(`BTW: ${data.customer.vatNumber}`);
  const deliveryLines = data.customer.deliveryAddress ? [
    ...data.customer.contactPerson ? [data.customer.contactPerson] : [],
    ...buildAddressLines(data.customer.deliveryAddress)
  ] : [];
  return /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
    /* @__PURE__ */ jsxs(View, { style: styles.header, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx(Image, { src: data.company.logoUrl, style: styles.logo }),
        /* @__PURE__ */ jsxs(View, { style: styles.companyInfo, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx(Text, { style: styles.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null,
            data.company.email
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsx(View, { style: styles.headerRight, children: /* @__PURE__ */ jsx(Text, { style: styles.docTitle, children: data.labels.documentTitle }) })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: styles.infoRow, children: [
      deliveryLines.length > 0 ? (
        // Delivery address first (where the goods go), invoice address next.
        /* @__PURE__ */ jsxs(View, { style: styles.addressGroup, children: [
          /* @__PURE__ */ jsxs(View, { style: [styles.customerBox, styles.addressBoxHalf], children: [
            /* @__PURE__ */ jsx(Text, { style: styles.customerLabel, children: T.addrDelivery }),
            /* @__PURE__ */ jsx(Text, { style: styles.customerNameDual, children: data.customer.companyName }),
            /* @__PURE__ */ jsx(Text, { style: styles.customerDetail, children: deliveryLines.join("\n") })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: [styles.customerBox, styles.addressBoxHalf], children: [
            /* @__PURE__ */ jsx(Text, { style: styles.customerLabel, children: data.labels.invoiceAddress }),
            /* @__PURE__ */ jsx(Text, { style: styles.customerNameDual, children: data.customer.companyName }),
            /* @__PURE__ */ jsx(Text, { style: styles.customerDetail, children: customerLines.join("\n") })
          ] })
        ] })
      ) : /* @__PURE__ */ jsxs(View, { style: styles.customerBox, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.customerLabel, children: data.labels.invoiceAddress }),
        /* @__PURE__ */ jsx(Text, { style: styles.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx(Text, { style: styles.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: styles.metaBox, children: [
        /* @__PURE__ */ jsxs(View, { style: styles.metaRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.metaLabel, children: T.metaInvoiceNumber }),
          /* @__PURE__ */ jsx(Text, { style: styles.metaValue, children: data.documentNumber })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.metaRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.metaLabel, children: T.metaInvoiceDate }),
          /* @__PURE__ */ jsx(Text, { style: styles.metaValue, children: formatDate(data.documentDate) })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.metaRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.metaLabel, children: T.metaDeliveryDate }),
          /* @__PURE__ */ jsx(Text, { style: styles.metaValueDue, children: formatDate(deliveryDateForRow(data)) })
        ] })
      ] })
    ] }),
    isReverseCharge && /* @__PURE__ */ jsx(View, { style: styles.verlegdBox, children: /* @__PURE__ */ jsxs(Text, { style: styles.verlegdText, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.verlegdLabel, children: T.verlegdLabel }),
      T.verlegdBody,
      data.customer.vatNumber || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsxs(View, { style: styles.table, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.tableHeader, children: [
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colNum], children: "#" }),
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colDesc], children: T.thDescription }),
        hasNotes && /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colNote], children: T.thNote }),
        hasBox ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colPiecePrice], children: T.thPiecePrice }),
          /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colBoxPrice], children: T.thBoxPrice })
        ] }) : /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colUnitPrice], children: T.thUnitPrice }),
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colQty], children: T.thQty }),
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colExclVat], children: T.thExclVat }),
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colVatAmt], children: T.thVat }),
        /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colInclVat], children: T.thInclVat })
      ] }),
      data.items.map((item, idx) => {
        const priceExclVat = item.unitPrice * item.quantity;
        const vatAmount = Math.round(priceExclVat * (item.vatRate / 100));
        const priceInclVat = priceExclVat + vatAmount;
        const isBoxLine = item.unitType === "doos";
        return /* @__PURE__ */ jsxs(
          View,
          {
            wrap: false,
            style: [
              styles.tableRow,
              idx % 2 === 0 ? styles.rowEven : styles.rowOdd
            ],
            children: [
              /* @__PURE__ */ jsx(Text, { style: [styles.tdBold, styles.colNum], children: idx + 1 }),
              /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colDesc], children: item.description }),
              hasNotes && /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colNote], children: item.note || "" }),
              hasBox ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colPiecePrice], children: isBoxLine ? item.piecePrice != null ? formatPrice(item.piecePrice) : "\u2014" : formatPrice(item.unitPrice) }),
                /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colBoxPrice], children: isBoxLine ? formatPrice(item.unitPrice) : "\u2014" })
              ] }) : /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colUnitPrice], children: formatPrice(item.unitPrice) }),
              /* @__PURE__ */ jsxs(Text, { style: [styles.td, styles.colQty], children: [
                item.quantity,
                " ",
                item.unit.toLowerCase()
              ] }),
              /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colExclVat], children: formatPrice(priceExclVat) }),
              /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colVatAmt], children: formatPrice(vatAmount) }),
              /* @__PURE__ */ jsx(Text, { style: [styles.tdBold, styles.colInclVat], children: formatPrice(priceInclVat) })
            ]
          },
          idx
        );
      })
    ] }),
    /* @__PURE__ */ jsx(View, { style: { marginTop: "auto" } }),
    /* @__PURE__ */ jsxs(View, { style: styles.bottomSection, wrap: false, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.leftColumn, children: [
        /* @__PURE__ */ jsxs(View, { style: styles.actionBox, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.actionTitle, children: T.payMethod }),
          /* @__PURE__ */ jsxs(View, { style: styles.paymentRow, children: [
            /* @__PURE__ */ jsx(View, { style: styles.checkbox }),
            /* @__PURE__ */ jsx(Text, { style: styles.paymentLabel, children: T.payCash })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.paymentRow, children: [
            /* @__PURE__ */ jsx(View, { style: styles.checkbox }),
            /* @__PURE__ */ jsx(Text, { style: styles.paymentLabel, children: T.payPin })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.paymentRow, children: [
            /* @__PURE__ */ jsx(View, { style: styles.checkbox }),
            /* @__PURE__ */ jsx(Text, { style: styles.paymentLabel, children: T.payOpenBank })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.paymentRow, children: [
            /* @__PURE__ */ jsx(View, { style: styles.checkbox }),
            /* @__PURE__ */ jsx(Text, { style: styles.paymentLabel, children: T.payOldInvoices })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.actionBox, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.actionTitle, children: T.receipt }),
          /* @__PURE__ */ jsxs(View, { style: styles.sigField, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.sigLabel, children: data.labels.name }),
            /* @__PURE__ */ jsx(View, { style: styles.sigLine })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.sigField, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.sigLabel, children: data.labels.signature }),
            /* @__PURE__ */ jsx(View, { style: styles.sigLine })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(View, { style: styles.rightColumn, children: /* @__PURE__ */ jsxs(View, { style: styles.totalsBox, children: [
        /* @__PURE__ */ jsxs(View, { style: styles.totalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.totalLabel, children: data.labels.subtotal }),
          /* @__PURE__ */ jsx(Text, { style: styles.totalValue, children: formatPrice(data.subtotal) })
        ] }),
        data.discount > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs(View, { style: styles.totalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.totalLabel, children: T.tDiscount }),
          /* @__PURE__ */ jsxs(Text, { style: styles.totalValue, children: [
            "-",
            formatPrice(data.discount)
          ] })
        ] }),
        data.shipping > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs(View, { style: styles.totalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.totalLabel, children: T.tShipping }),
          /* @__PURE__ */ jsx(Text, { style: styles.totalValue, children: formatPrice(data.shipping) })
        ] }),
        data.vatBreakdown.map((vat, idx) => /* @__PURE__ */ jsxs(View, { style: styles.totalRow, children: [
          /* @__PURE__ */ jsxs(Text, { style: styles.totalLabel, children: [
            data.labels.vat,
            " ",
            vat.rate,
            "%"
          ] }),
          /* @__PURE__ */ jsx(Text, { style: styles.totalValue, children: formatPrice(vat.amount) })
        ] }, idx)),
        /* @__PURE__ */ jsxs(View, { style: styles.grandTotalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.grandTotalLabel, children: data.labels.grandTotal }),
          /* @__PURE__ */ jsx(Text, { style: styles.grandTotalValue, children: formatPrice(data.grandTotal) })
        ] })
      ] }) })
    ] }),
    data.paymentTerms && /* @__PURE__ */ jsx(View, { style: styles.paymentTerms, children: /* @__PURE__ */ jsx(Text, { style: styles.paymentTermsText, children: data.paymentTerms }) }),
    data.company.iban && /* @__PURE__ */ jsxs(View, { style: styles.ibanCallout, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.ibanCalloutLabel, children: T.ibanPay }),
      /* @__PURE__ */ jsx(Text, { style: styles.ibanCalloutIban, children: data.company.iban }),
      data.company.accountHolder && /* @__PURE__ */ jsxs(Text, { style: styles.ibanCalloutHolder, children: [
        T.ibanHolderPrefix,
        data.company.accountHolder
      ] })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: styles.footer, wrap: false, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.footerRow, children: [
        /* @__PURE__ */ jsxs(View, { children: [
          /* @__PURE__ */ jsx(Text, { style: styles.footerCompany, children: data.company.name }),
          /* @__PURE__ */ jsx(Text, { style: styles.footerDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
          ].filter(Boolean).join(", ") })
        ] }),
        /* @__PURE__ */ jsx(View, { children: /* @__PURE__ */ jsx(Text, { style: styles.footerDetail, children: [
          data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
          data.company.vatNumber && `BTW: ${data.company.vatNumber}`
        ].filter(Boolean).join("  |  ") }) })
      ] }),
      data.footerText && /* @__PURE__ */ jsx(Text, { style: styles.footerCenter, children: data.footerText })
    ] })
  ] });
}
function InvoiceTemplate({ data }) {
  return /* @__PURE__ */ jsx(Document, { children: /* @__PURE__ */ jsx(InvoicePage, { data }) });
}

// src/components/documents/ProformaTemplate.tsx
import {
  Document as Document2,
  Page as Page2,
  View as View2,
  Text as Text2,
  Image as Image2,
  StyleSheet as StyleSheet2
} from "@react-pdf/renderer";
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var styles2 = StyleSheet2.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    color: docBrand.proforma.primary
  },
  docNumber: {
    fontSize: 8.5,
    color: "#475569",
    backgroundColor: docBrand.proforma.tint,
    padding: 4,
    paddingHorizontal: 10
  },
  // Disclaimer banner (compact)
  disclaimer: {
    backgroundColor: docBrand.proforma.tint,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.proforma.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  disclaimerText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.proforma.dark,
    textAlign: "center"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.proforma.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  // Dual-address layout — see InvoiceTemplate.tsx. Only rendered when the
  // customer has a delivery address that differs from the billing address.
  addressGroup: {
    width: "58%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addressBoxHalf: {
    width: "48.5%"
  },
  customerNameDual: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  metaValueHighlight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: docBrand.proforma.primary
  },
  // BTW verlegd notice (single-line, professional)
  verlegdBox: {
    borderLeftWidth: 2,
    borderLeftColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  verlegdText: {
    fontSize: 7.5,
    color: "#78350f",
    lineHeight: 1.35
  },
  verlegdLabel: {
    fontFamily: "Helvetica-Bold"
  },
  table: {
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: docBrand.proforma.dark,
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0"
  },
  rowEven: {
    backgroundColor: "#f8fafc"
  },
  rowOdd: {
    backgroundColor: "#ffffff"
  },
  td: {
    fontSize: 7.5
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold"
  },
  colNum: { width: 18, textAlign: "right", paddingRight: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colUnitPrice: { width: 70, textAlign: "right", paddingRight: 6 },
  colPiecePrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colBoxPrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colQty: { width: 55, textAlign: "left", paddingLeft: 4 },
  colExclVat: { width: 70, textAlign: "right", paddingRight: 6 },
  colVatAmt: { width: 55, textAlign: "right", paddingRight: 6 },
  colInclVat: { width: 70, textAlign: "right" },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8
  },
  totalsBox: {
    width: "45%",
    backgroundColor: "#f8fafc",
    borderTopWidth: 2,
    borderTopColor: docBrand.proforma.primary,
    padding: 7
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  totalLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  totalValue: {
    fontSize: 7.5,
    textAlign: "right"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: docBrand.proforma.dark
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold"
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right"
  },
  // Conditions section (compact)
  conditionsSection: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6
  },
  conditionsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3
  },
  conditionsText: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.4
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.proforma.primary,
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  },
  footerIban: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.proforma.dark
  },
  footerCenter: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3
  }
});
function getValidityDate(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 30);
  return formatDate(date.toISOString());
}
function ProformaTemplate({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== "NL";
  const hasBox = data.items.some((i) => i.unitType === "doos");
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  if (data.customer.street) customerLines.push(data.customer.street);
  const cityParts = [];
  if (data.customer.postalCode && data.customer.city) {
    cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
  } else if (data.customer.city) {
    cityParts.push(data.customer.city);
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    cityParts.push(data.customer.country);
  }
  if (cityParts.length) customerLines.push(cityParts.join(", "));
  if (data.customer.vatNumber) customerLines.push(`BTW: ${data.customer.vatNumber}`);
  const deliveryLines = data.customer.deliveryAddress ? [
    ...data.customer.contactPerson ? [data.customer.contactPerson] : [],
    ...buildAddressLines(data.customer.deliveryAddress)
  ] : [];
  return /* @__PURE__ */ jsx2(Document2, { children: /* @__PURE__ */ jsxs2(Page2, { size: "A4", style: styles2.page, children: [
    /* @__PURE__ */ jsxs2(View2, { style: styles2.header, children: [
      /* @__PURE__ */ jsxs2(View2, { style: styles2.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx2(Image2, { src: data.company.logoUrl, style: styles2.logo }),
        /* @__PURE__ */ jsxs2(View2, { style: styles2.companyInfo, children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx2(Text2, { style: styles2.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null,
            data.company.email
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2(View2, { style: styles2.headerRight, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.docTitle, children: data.labels.documentTitle }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.docNumber, children: data.documentNumber })
      ] })
    ] }),
    /* @__PURE__ */ jsx2(View2, { style: styles2.disclaimer, children: /* @__PURE__ */ jsx2(Text2, { style: styles2.disclaimerText, children: T.pfDisclaimer }) }),
    /* @__PURE__ */ jsxs2(View2, { style: styles2.infoRow, children: [
      deliveryLines.length > 0 ? /* @__PURE__ */ jsxs2(View2, { style: styles2.addressGroup, children: [
        /* @__PURE__ */ jsxs2(View2, { style: [styles2.customerBox, styles2.addressBoxHalf], children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerLabel, children: T.addrDelivery }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerNameDual, children: data.customer.companyName }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerDetail, children: deliveryLines.join("\n") })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: [styles2.customerBox, styles2.addressBoxHalf], children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerLabel, children: T.addrRecipient }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerNameDual, children: data.customer.companyName }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.customerDetail, children: customerLines.join("\n") })
        ] })
      ] }) : /* @__PURE__ */ jsxs2(View2, { style: styles2.customerBox, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.customerLabel, children: T.addrRecipient }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsxs2(View2, { style: styles2.metaBox, children: [
        /* @__PURE__ */ jsxs2(View2, { style: styles2.metaRow, children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.metaLabel, children: T.metaDate }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.metaValue, children: formatDate(data.documentDate) })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: styles2.metaRow, children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.metaLabel, children: T.metaValidUntil }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.metaValueHighlight, children: getValidityDate(data.documentDate) })
        ] })
      ] })
    ] }),
    isReverseCharge && /* @__PURE__ */ jsx2(View2, { style: styles2.verlegdBox, children: /* @__PURE__ */ jsxs2(Text2, { style: styles2.verlegdText, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles2.verlegdLabel, children: T.verlegdLabel }),
      T.verlegdBody,
      data.customer.vatNumber || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsxs2(View2, { style: styles2.table, children: [
      /* @__PURE__ */ jsxs2(View2, { style: styles2.tableHeader, children: [
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colNum], children: "#" }),
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colDesc], children: T.thDescription }),
        hasBox ? /* @__PURE__ */ jsxs2(Fragment2, { children: [
          /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colPiecePrice], children: T.thPiecePrice }),
          /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colBoxPrice], children: T.thBoxPrice })
        ] }) : /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colUnitPrice], children: T.thUnitPrice }),
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colQty], children: T.thQty }),
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colExclVat], children: T.thExclVat }),
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colVatAmt], children: T.thVat }),
        /* @__PURE__ */ jsx2(Text2, { style: [styles2.th, styles2.colInclVat], children: T.thInclVat })
      ] }),
      data.items.map((item, idx) => {
        const priceExclVat = item.unitPrice * item.quantity;
        const vatAmount = Math.round(priceExclVat * (item.vatRate / 100));
        const priceInclVat = priceExclVat + vatAmount;
        const isBoxLine = item.unitType === "doos";
        return /* @__PURE__ */ jsxs2(
          View2,
          {
            wrap: false,
            style: [
              styles2.tableRow,
              idx % 2 === 0 ? styles2.rowEven : styles2.rowOdd
            ],
            children: [
              /* @__PURE__ */ jsx2(Text2, { style: [styles2.tdBold, styles2.colNum], children: idx + 1 }),
              /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colDesc], children: item.description }),
              hasBox ? /* @__PURE__ */ jsxs2(Fragment2, { children: [
                /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colPiecePrice], children: isBoxLine ? item.piecePrice != null ? formatPrice(item.piecePrice) : "\u2014" : formatPrice(item.unitPrice) }),
                /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colBoxPrice], children: isBoxLine ? formatPrice(item.unitPrice) : "\u2014" })
              ] }) : /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colUnitPrice], children: formatPrice(item.unitPrice) }),
              /* @__PURE__ */ jsxs2(Text2, { style: [styles2.td, styles2.colQty], children: [
                item.quantity,
                " ",
                item.unit.toLowerCase()
              ] }),
              /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colExclVat], children: formatPrice(priceExclVat) }),
              /* @__PURE__ */ jsx2(Text2, { style: [styles2.td, styles2.colVatAmt], children: formatPrice(vatAmount) }),
              /* @__PURE__ */ jsx2(Text2, { style: [styles2.tdBold, styles2.colInclVat], children: formatPrice(priceInclVat) })
            ]
          },
          idx
        );
      })
    ] }),
    /* @__PURE__ */ jsx2(View2, { style: { marginTop: "auto" } }),
    /* @__PURE__ */ jsx2(View2, { style: styles2.totalsSection, wrap: false, children: /* @__PURE__ */ jsxs2(View2, { style: styles2.totalsBox, children: [
      /* @__PURE__ */ jsxs2(View2, { style: styles2.totalRow, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalLabel, children: T.tSubtotalExclVat }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalValue, children: formatPrice(data.subtotal) })
      ] }),
      data.discount > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs2(View2, { style: styles2.totalRow, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalLabel, children: T.tDiscount }),
        /* @__PURE__ */ jsxs2(Text2, { style: styles2.totalValue, children: [
          "-",
          formatPrice(data.discount)
        ] })
      ] }),
      data.shipping > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs2(View2, { style: styles2.totalRow, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalLabel, children: T.tShipping }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalValue, children: formatPrice(data.shipping) })
      ] }),
      data.vatBreakdown.map((vat, idx) => /* @__PURE__ */ jsxs2(View2, { style: styles2.totalRow, children: [
        /* @__PURE__ */ jsxs2(Text2, { style: styles2.totalLabel, children: [
          T.thVat,
          " ",
          vat.rate,
          "%"
        ] }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.totalValue, children: formatPrice(vat.amount) })
      ] }, idx)),
      /* @__PURE__ */ jsxs2(View2, { style: styles2.grandTotalRow, children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles2.grandTotalLabel, children: T.tGrandInclVat }),
        /* @__PURE__ */ jsx2(Text2, { style: styles2.grandTotalValue, children: formatPrice(data.grandTotal) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs2(View2, { style: styles2.conditionsSection, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles2.conditionsTitle, children: T.pfConditionsTitle }),
      /* @__PURE__ */ jsx2(Text2, { style: styles2.conditionsText, children: T.pfConditions(getValidityDate(data.documentDate)) })
    ] }),
    /* @__PURE__ */ jsxs2(View2, { style: styles2.footer, wrap: false, children: [
      /* @__PURE__ */ jsxs2(View2, { style: styles2.footerRow, children: [
        /* @__PURE__ */ jsxs2(View2, { children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.footerCompany, children: data.company.name }),
          /* @__PURE__ */ jsx2(Text2, { style: styles2.footerDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
          ].filter(Boolean).join(", ") })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { children: [
          /* @__PURE__ */ jsx2(Text2, { style: styles2.footerDetail, children: [
            data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
            data.company.vatNumber && `BTW: ${data.company.vatNumber}`
          ].filter(Boolean).join("  |  ") }),
          data.company.iban && /* @__PURE__ */ jsxs2(Text2, { style: styles2.footerIban, children: [
            "IBAN: ",
            data.company.iban,
            data.company.bic ? `  |  BIC: ${data.company.bic}` : ""
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2(Text2, { style: styles2.footerCenter, children: [
        T.pfContactPrefix,
        data.company.phone || data.company.email
      ] })
    ] })
  ] }) });
}

// src/components/documents/OrderConfirmationTemplate.tsx
import {
  Document as Document3,
  Page as Page3,
  View as View3,
  Text as Text3,
  Image as Image3,
  StyleSheet as StyleSheet3
} from "@react-pdf/renderer";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var styles3 = StyleSheet3.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    color: docBrand.orderConfirmation.primary
  },
  docNumber: {
    fontSize: 8.5,
    color: "#475569",
    backgroundColor: docBrand.orderConfirmation.tint,
    padding: 4,
    paddingHorizontal: 10
  },
  // Thank you banner (compact)
  thankYouBanner: {
    backgroundColor: "#ecfdf5",
    borderLeftWidth: 2,
    borderLeftColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6
  },
  thankYouTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    marginBottom: 1
  },
  thankYouText: {
    fontSize: 7.5,
    color: "#047857"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.orderConfirmation.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  // Dual-address layout — see InvoiceTemplate.tsx. Only rendered when the
  // customer has a delivery address that differs from the billing address.
  addressGroup: {
    width: "58%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addressBoxHalf: {
    width: "48.5%"
  },
  customerNameDual: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  metaValueHighlight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: docBrand.orderConfirmation.primary
  },
  // Order summary section (compact)
  orderSummary: {
    backgroundColor: docBrand.orderConfirmation.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.orderConfirmation.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6
  },
  summaryTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.orderConfirmation.primary,
    marginBottom: 4
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  summaryLabel: {
    fontSize: 8,
    color: "#475569"
  },
  summaryValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold"
  },
  table: {
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: docBrand.orderConfirmation.dark,
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0"
  },
  rowEven: {
    backgroundColor: "#f8fafc"
  },
  rowOdd: {
    backgroundColor: "#ffffff"
  },
  td: {
    fontSize: 7.5
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold"
  },
  colIdx: { width: 25, textAlign: "center" },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 70, textAlign: "center" },
  colUnitPrice: { width: 70, textAlign: "right" },
  colBoxPrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colTotal: { width: 70, textAlign: "right" },
  // Totals section (simplified)
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8
  },
  totalsBox: {
    width: "40%",
    backgroundColor: "#f8fafc",
    borderTopWidth: 2,
    borderTopColor: docBrand.orderConfirmation.primary,
    padding: 7
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  totalLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  totalValue: {
    fontSize: 7.5,
    textAlign: "right"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: docBrand.orderConfirmation.primary
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold"
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right"
  },
  // Next steps section (compact)
  nextSteps: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6
  },
  nextStepsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3
  },
  nextStepsText: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.4
  },
  // Contact section
  contactSection: {
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    marginBottom: 6
  },
  contactTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3
  },
  contactGrid: {
    flexDirection: "row",
    gap: 16
  },
  contactItem: {
    flexDirection: "row"
  },
  contactLabel: {
    fontSize: 7.5,
    color: "#64748b",
    marginRight: 4
  },
  contactValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold"
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.orderConfirmation.primary,
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  },
  footerIban: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.orderConfirmation.dark
  },
  footerCenter: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3
  }
});
function OrderConfirmationTemplate({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const hasBox = data.items.some((i) => i.unitType === "doos");
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  if (data.customer.street) customerLines.push(data.customer.street);
  const cityParts = [];
  if (data.customer.postalCode && data.customer.city) {
    cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
  } else if (data.customer.city) {
    cityParts.push(data.customer.city);
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    cityParts.push(data.customer.country);
  }
  if (cityParts.length) customerLines.push(cityParts.join(", "));
  const deliveryLines = data.customer.deliveryAddress ? [
    ...data.customer.contactPerson ? [data.customer.contactPerson] : [],
    ...buildAddressLines(data.customer.deliveryAddress)
  ] : [];
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
  return /* @__PURE__ */ jsx3(Document3, { children: /* @__PURE__ */ jsxs3(Page3, { size: "A4", style: styles3.page, children: [
    /* @__PURE__ */ jsxs3(View3, { style: styles3.header, children: [
      /* @__PURE__ */ jsxs3(View3, { style: styles3.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx3(Image3, { src: data.company.logoUrl, style: styles3.logo }),
        /* @__PURE__ */ jsxs3(View3, { style: styles3.companyInfo, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx3(Text3, { style: styles3.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null,
            data.company.email
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.headerRight, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.docTitle, children: data.labels.documentTitle }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.docNumber, children: data.documentNumber })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.thankYouBanner, children: [
      /* @__PURE__ */ jsx3(Text3, { style: styles3.thankYouTitle, children: T.ocThankTitle }),
      /* @__PURE__ */ jsx3(Text3, { style: styles3.thankYouText, children: T.ocThankText })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.infoRow, children: [
      deliveryLines.length > 0 ? /* @__PURE__ */ jsxs3(View3, { style: styles3.addressGroup, children: [
        /* @__PURE__ */ jsxs3(View3, { style: [styles3.customerBox, styles3.addressBoxHalf], children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerLabel, children: T.addrDelivery }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerNameDual, children: data.customer.companyName }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerDetail, children: deliveryLines.join("\n") })
        ] }),
        /* @__PURE__ */ jsxs3(View3, { style: [styles3.customerBox, styles3.addressBoxHalf], children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerLabel, children: T.addrCustomer }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerNameDual, children: data.customer.companyName }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.customerDetail, children: customerLines.join("\n") })
        ] })
      ] }) : /* @__PURE__ */ jsxs3(View3, { style: styles3.customerBox, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.customerLabel, children: T.addrCustomer }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.metaBox, children: [
        /* @__PURE__ */ jsxs3(View3, { style: styles3.metaRow, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaLabel, children: T.metaOrderNumber }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaValueHighlight, children: data.order.orderNumber })
        ] }),
        /* @__PURE__ */ jsxs3(View3, { style: styles3.metaRow, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaLabel, children: T.metaOrderDate }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaValue, children: formatDate(data.order.orderDate) })
        ] }),
        /* @__PURE__ */ jsxs3(View3, { style: styles3.metaRow, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaLabel, children: T.metaConfirmDate }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.metaValue, children: formatDate(data.documentDate) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.orderSummary, children: [
      /* @__PURE__ */ jsx3(Text3, { style: styles3.summaryTitle, children: T.ocSummaryTitle }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.summaryRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.summaryLabel, children: T.ocItemsLabel }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.summaryValue, children: T.ocItemsValue(data.items.length, totalItems) })
      ] }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.summaryRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.summaryLabel, children: T.ocTotalLabel }),
        /* @__PURE__ */ jsxs3(Text3, { style: styles3.summaryValue, children: [
          formatPrice(data.grandTotal),
          T.ocInclVatSuffix
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.table, children: [
      /* @__PURE__ */ jsxs3(View3, { style: styles3.tableHeader, children: [
        /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colIdx], children: "#" }),
        /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colDesc], children: T.thProduct }),
        /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colQty], children: T.thQty }),
        /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colUnitPrice], children: T.thPiecePrice }),
        hasBox && /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colBoxPrice], children: T.thBoxPrice }),
        /* @__PURE__ */ jsx3(Text3, { style: [styles3.th, styles3.colTotal], children: T.thTotal })
      ] }),
      data.items.map((item, idx) => {
        const isBoxLine = item.unitType === "doos";
        return /* @__PURE__ */ jsxs3(
          View3,
          {
            wrap: false,
            style: [
              styles3.tableRow,
              idx % 2 === 0 ? styles3.rowEven : styles3.rowOdd
            ],
            children: [
              /* @__PURE__ */ jsx3(Text3, { style: [styles3.td, styles3.colIdx], children: item.index }),
              /* @__PURE__ */ jsx3(Text3, { style: [styles3.td, styles3.colDesc], children: item.description }),
              /* @__PURE__ */ jsxs3(Text3, { style: [styles3.tdBold, styles3.colQty], children: [
                item.quantity,
                " ",
                item.unit.toLowerCase()
              ] }),
              /* @__PURE__ */ jsx3(Text3, { style: [styles3.td, styles3.colUnitPrice], children: isBoxLine ? item.piecePrice != null ? formatPrice(item.piecePrice) : "\u2014" : formatPrice(item.unitPrice) }),
              hasBox && /* @__PURE__ */ jsx3(Text3, { style: [styles3.td, styles3.colBoxPrice], children: isBoxLine ? formatPrice(item.unitPrice) : "\u2014" }),
              /* @__PURE__ */ jsx3(Text3, { style: [styles3.tdBold, styles3.colTotal], children: formatPrice(item.total) })
            ]
          },
          idx
        );
      })
    ] }),
    /* @__PURE__ */ jsx3(View3, { style: { marginTop: "auto" } }),
    /* @__PURE__ */ jsx3(View3, { style: styles3.totalsSection, wrap: false, children: /* @__PURE__ */ jsxs3(View3, { style: styles3.totalsBox, children: [
      /* @__PURE__ */ jsxs3(View3, { style: styles3.totalRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalLabel, children: T.tSubtotal }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalValue, children: formatPrice(data.subtotal) })
      ] }),
      data.discount > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs3(View3, { style: styles3.totalRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalLabel, children: T.tDiscount }),
        /* @__PURE__ */ jsxs3(Text3, { style: styles3.totalValue, children: [
          "-",
          formatPrice(data.discount)
        ] })
      ] }),
      data.shipping > 0 && data.documentType !== "credit_note" && /* @__PURE__ */ jsxs3(View3, { style: styles3.totalRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalLabel, children: T.tShipping }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalValue, children: formatPrice(data.shipping) })
      ] }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.totalRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalLabel, children: T.thVat }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.totalValue, children: formatPrice(data.totalVat) })
      ] }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.grandTotalRow, children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles3.grandTotalLabel, children: T.tGrandTotal }),
        /* @__PURE__ */ jsx3(Text3, { style: styles3.grandTotalValue, children: formatPrice(data.grandTotal) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.nextSteps, children: [
      /* @__PURE__ */ jsx3(Text3, { style: styles3.nextStepsTitle, children: T.ocNextTitle }),
      /* @__PURE__ */ jsx3(Text3, { style: styles3.nextStepsText, children: T.ocNextText })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.contactSection, children: [
      /* @__PURE__ */ jsx3(Text3, { style: styles3.contactTitle, children: T.ocContactTitle }),
      /* @__PURE__ */ jsxs3(View3, { style: styles3.contactGrid, children: [
        data.company.phone && /* @__PURE__ */ jsxs3(View3, { style: styles3.contactItem, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.contactLabel, children: T.ocPhone }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.contactValue, children: data.company.phone })
        ] }),
        data.company.email && /* @__PURE__ */ jsxs3(View3, { style: styles3.contactItem, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.contactLabel, children: T.ocEmail }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.contactValue, children: data.company.email })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3(View3, { style: styles3.footer, wrap: false, children: [
      /* @__PURE__ */ jsxs3(View3, { style: styles3.footerRow, children: [
        /* @__PURE__ */ jsxs3(View3, { children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.footerCompany, children: data.company.name }),
          /* @__PURE__ */ jsx3(Text3, { style: styles3.footerDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
          ].filter(Boolean).join(", ") })
        ] }),
        /* @__PURE__ */ jsxs3(View3, { children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles3.footerDetail, children: [
            data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
            data.company.vatNumber && `BTW: ${data.company.vatNumber}`
          ].filter(Boolean).join("  |  ") }),
          data.company.iban && /* @__PURE__ */ jsxs3(Text3, { style: styles3.footerIban, children: [
            "IBAN: ",
            data.company.iban,
            data.company.bic ? `  |  BIC: ${data.company.bic}` : ""
          ] })
        ] })
      ] }),
      data.footerText && /* @__PURE__ */ jsx3(Text3, { style: styles3.footerCenter, children: data.footerText })
    ] })
  ] }) });
}

// src/components/documents/PaymentReminderTemplate.tsx
import {
  Document as Document4,
  Page as Page4,
  View as View4,
  Text as Text4,
  Image as Image4,
  StyleSheet as StyleSheet4
} from "@react-pdf/renderer";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var styles4 = StyleSheet4.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    color: docBrand.paymentReminder.primary
  },
  docNumber: {
    fontSize: 8.5,
    color: "#475569",
    backgroundColor: docBrand.paymentReminder.tint,
    padding: 4,
    paddingHorizontal: 10
  },
  // Urgent banner (compact)
  urgentBanner: {
    backgroundColor: docBrand.paymentReminder.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.paymentReminder.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8
  },
  urgentTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: docBrand.paymentReminder.primary,
    textAlign: "center",
    marginBottom: 1
  },
  urgentText: {
    fontSize: 7.5,
    color: docBrand.paymentReminder.dark,
    textAlign: "center"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.paymentReminder.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  metaValueRed: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: docBrand.paymentReminder.primary
  },
  // Invoice reference box (compact)
  invoiceRefBox: {
    backgroundColor: docBrand.paymentReminder.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.paymentReminder.accent,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8
  },
  invoiceRefTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4
  },
  invoiceRefGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  invoiceRefItem: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 2
  },
  invoiceRefLabel: {
    fontSize: 7.5,
    color: "#64748b",
    width: 95
  },
  invoiceRefValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold"
  },
  // Amount due box (compact)
  amountDueBox: {
    backgroundColor: docBrand.paymentReminder.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: "center"
  },
  amountDueLabel: {
    fontSize: 8.5,
    color: "#ffffff",
    marginBottom: 1
  },
  amountDueValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff"
  },
  // Message section
  messageSection: {
    marginBottom: 8
  },
  messageTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4
  },
  messageText: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.4
  },
  // Bank details (prominent but compact)
  bankSection: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 2,
    borderLeftColor: "#22c55e",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8
  },
  bankTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    marginBottom: 5,
    textAlign: "center"
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center"
  },
  bankItem: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 3,
    justifyContent: "center"
  },
  bankLabel: {
    fontSize: 8,
    color: "#475569",
    marginRight: 6
  },
  bankValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold"
  },
  bankIban: {
    fontSize: 12,
    fontFamily: "Courier-Bold",
    color: "#16a34a",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 1
  },
  paymentRef: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 4,
    color: "#475569"
  },
  // Action section (compact)
  actionSection: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 2,
    borderLeftColor: "#fcd34d",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6
  },
  actionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 3
  },
  actionText: {
    fontSize: 7.5,
    color: "#92400e",
    lineHeight: 1.4
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.paymentReminder.primary,
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  },
  footerIban: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.paymentReminder.dark
  },
  footerCenter: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3
  }
});
function getDaysOverdue(dueDateString) {
  const dueDate = new Date(dueDateString);
  const today = /* @__PURE__ */ new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
function PaymentReminderTemplate({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const hasBankInfo = data.company.iban || data.company.bankName;
  const daysOverdue = getDaysOverdue(data.dueDate);
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  if (data.customer.street) customerLines.push(data.customer.street);
  const cityParts = [];
  if (data.customer.postalCode && data.customer.city) {
    cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
  } else if (data.customer.city) {
    cityParts.push(data.customer.city);
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    cityParts.push(data.customer.country);
  }
  if (cityParts.length) customerLines.push(cityParts.join(", "));
  const isUrgent = daysOverdue > 14;
  const isCritical = daysOverdue > 30;
  return /* @__PURE__ */ jsx4(Document4, { children: /* @__PURE__ */ jsxs4(Page4, { size: "A4", style: styles4.page, children: [
    /* @__PURE__ */ jsxs4(View4, { style: styles4.header, children: [
      /* @__PURE__ */ jsxs4(View4, { style: styles4.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx4(Image4, { src: data.company.logoUrl, style: styles4.logo }),
        /* @__PURE__ */ jsxs4(View4, { style: styles4.companyInfo, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx4(Text4, { style: styles4.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null,
            data.company.email
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs4(View4, { style: styles4.headerRight, children: [
        /* @__PURE__ */ jsx4(Text4, { style: styles4.docTitle, children: data.labels.documentTitle }),
        /* @__PURE__ */ jsx4(Text4, { style: styles4.docNumber, children: data.documentNumber })
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.urgentBanner, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.urgentTitle, children: isCritical ? T.prTitleFinal : isUrgent ? T.prTitleSecond : T.prTitleFirst }),
      /* @__PURE__ */ jsx4(Text4, { style: styles4.urgentText, children: daysOverdue > 0 ? T.prOverdue(daysOverdue) : T.prDueReached })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.infoRow, children: [
      /* @__PURE__ */ jsxs4(View4, { style: styles4.customerBox, children: [
        /* @__PURE__ */ jsx4(Text4, { style: styles4.customerLabel, children: T.addrDebtor }),
        /* @__PURE__ */ jsx4(Text4, { style: styles4.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx4(Text4, { style: styles4.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsxs4(View4, { style: styles4.metaBox, children: [
        /* @__PURE__ */ jsxs4(View4, { style: styles4.metaRow, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.metaLabel, children: T.prMetaReminderDate }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.metaValue, children: formatDate(data.documentDate) })
        ] }),
        /* @__PURE__ */ jsxs4(View4, { style: styles4.metaRow, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.metaLabel, children: T.prMetaDaysLate }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.metaValueRed, children: T.prDaysSuffix(daysOverdue) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefBox, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefTitle, children: T.prRefTitle }),
      /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefGrid, children: [
        /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefLabel, children: T.prRefInvoiceNumber }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefValue, children: data.invoiceNumber || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefLabel, children: T.prRefOrderDate }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefValue, children: formatDate(data.order.orderDate) })
        ] }),
        /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefLabel, children: T.prRefOrigDue }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefValue, children: formatDate(data.dueDate) })
        ] }),
        /* @__PURE__ */ jsxs4(View4, { style: styles4.invoiceRefItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefLabel, children: T.prRefItems }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.invoiceRefValue, children: data.items.length })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.amountDueBox, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.amountDueLabel, children: T.prAmountDueLabel }),
      /* @__PURE__ */ jsx4(Text4, { style: styles4.amountDueValue, children: formatPrice(data.grandTotal) })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.messageSection, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.messageTitle, children: T.prGreeting }),
      /* @__PURE__ */ jsx4(Text4, { style: styles4.messageText, children: isCritical ? T.prBodyCritical(formatPrice(data.grandTotal)) : isUrgent ? T.prBodyUrgent(formatPrice(data.grandTotal), daysOverdue) : T.prBodyNormal })
    ] }),
    /* @__PURE__ */ jsx4(View4, { style: { marginTop: "auto" } }),
    hasBankInfo && /* @__PURE__ */ jsxs4(View4, { style: styles4.bankSection, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.bankTitle, children: T.prBankTitle }),
      /* @__PURE__ */ jsxs4(View4, { style: styles4.bankGrid, children: [
        data.company.bankName && /* @__PURE__ */ jsxs4(View4, { style: styles4.bankItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.bankLabel, children: T.prBankBank }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.bankValue, children: data.company.bankName })
        ] }),
        data.company.accountHolder && /* @__PURE__ */ jsxs4(View4, { style: styles4.bankItem, children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.bankLabel, children: T.prBankHolder }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.bankValue, children: data.company.accountHolder })
        ] })
      ] }),
      data.company.iban && /* @__PURE__ */ jsx4(Text4, { style: styles4.bankIban, children: data.company.iban }),
      /* @__PURE__ */ jsx4(Text4, { style: styles4.paymentRef, children: T.prIbanRef(data.invoiceNumber || "\u2014") })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.actionSection, children: [
      /* @__PURE__ */ jsx4(Text4, { style: styles4.actionTitle, children: T.prActionTitle }),
      /* @__PURE__ */ jsx4(Text4, { style: styles4.actionText, children: T.prActionText(data.company.phone || void 0, data.company.email || void 0) })
    ] }),
    /* @__PURE__ */ jsxs4(View4, { style: styles4.footer, wrap: false, children: [
      /* @__PURE__ */ jsxs4(View4, { style: styles4.footerRow, children: [
        /* @__PURE__ */ jsxs4(View4, { children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.footerCompany, children: data.company.name }),
          /* @__PURE__ */ jsx4(Text4, { style: styles4.footerDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
          ].filter(Boolean).join(", ") })
        ] }),
        /* @__PURE__ */ jsxs4(View4, { children: [
          /* @__PURE__ */ jsx4(Text4, { style: styles4.footerDetail, children: [
            data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
            data.company.vatNumber && `BTW: ${data.company.vatNumber}`
          ].filter(Boolean).join("  |  ") }),
          data.company.iban && /* @__PURE__ */ jsxs4(Text4, { style: styles4.footerIban, children: [
            "IBAN: ",
            data.company.iban,
            data.company.bic ? `  |  BIC: ${data.company.bic}` : ""
          ] })
        ] })
      ] }),
      data.footerText && /* @__PURE__ */ jsx4(Text4, { style: styles4.footerCenter, children: data.footerText })
    ] })
  ] }) });
}

// src/components/documents/CreditNoteTemplate.tsx
import {
  Document as Document5,
  Page as Page5,
  View as View5,
  Text as Text5,
  Image as Image5,
  StyleSheet as StyleSheet5
} from "@react-pdf/renderer";
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var styles5 = StyleSheet5.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    color: docBrand.creditNote.primary
  },
  docNumber: {
    fontSize: 8.5,
    color: "#475569",
    backgroundColor: docBrand.creditNote.tint,
    padding: 4,
    paddingHorizontal: 10
  },
  // Credit banner (compact)
  creditBanner: {
    backgroundColor: docBrand.creditNote.tint,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.creditNote.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  creditBannerText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.creditNote.deep,
    textAlign: "center"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.creditNote.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  metaValueHighlight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: docBrand.creditNote.primary
  },
  // Reference section (compact, single line)
  referenceBox: {
    backgroundColor: docBrand.creditNote.tintSoft,
    borderLeftWidth: 2,
    borderLeftColor: docBrand.creditNote.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  referenceTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  referenceText: {
    fontSize: 7.5,
    color: docBrand.creditNote.accent
  },
  table: {
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: docBrand.creditNote.dark,
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0"
  },
  rowEven: {
    backgroundColor: docBrand.creditNote.tintSoft
  },
  rowOdd: {
    backgroundColor: "#ffffff"
  },
  td: {
    fontSize: 7.5
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold"
  },
  tdCredit: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a"
  },
  colNum: { width: 18, textAlign: "right", paddingRight: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colUnitPrice: { width: 70, textAlign: "right", paddingRight: 6 },
  colPiecePrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colBoxPrice: { width: 54, textAlign: "right", paddingRight: 6 },
  colQty: { width: 55, textAlign: "left", paddingLeft: 4 },
  colExclVat: { width: 70, textAlign: "right", paddingRight: 6 },
  colVatAmt: { width: 55, textAlign: "right", paddingRight: 6 },
  colCredit: { width: 70, textAlign: "right" },
  // Bottom section
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  // Reason box
  reasonBox: {
    width: "55%",
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    padding: 7
  },
  reasonTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 3
  },
  reasonText: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.35
  },
  // Totals
  totalsBox: {
    width: "40%",
    backgroundColor: "#f8fafc",
    borderTopWidth: 2,
    borderTopColor: docBrand.creditNote.primary,
    padding: 7
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  totalLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  totalValue: {
    fontSize: 7.5,
    textAlign: "right"
  },
  totalValueCredit: {
    fontSize: 7.5,
    textAlign: "right",
    color: "#16a34a"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: docBrand.creditNote.primary
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold"
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#16a34a"
  },
  // Processing info (compact)
  processingBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 2,
    borderLeftColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6
  },
  processingTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    marginBottom: 3
  },
  processingText: {
    fontSize: 7.5,
    color: "#166534",
    lineHeight: 1.4
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: docBrand.creditNote.primary,
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  },
  footerIban: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: docBrand.creditNote.deep
  },
  footerCenter: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3
  },
  // BTW verlegd notice (single-line, professional)
  verlegdBox: {
    borderLeftWidth: 2,
    borderLeftColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  verlegdText: {
    fontSize: 7.5,
    color: "#78350f",
    lineHeight: 1.35
  },
  verlegdLabel: {
    fontFamily: "Helvetica-Bold"
  }
});
function CreditNoteTemplate({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const isReverseCharge = !!data.customer.country && data.customer.country.trim().toUpperCase() !== "NL";
  const hasBox = data.items.some((i) => i.unitType === "doos");
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  if (data.customer.street) customerLines.push(data.customer.street);
  const cityParts = [];
  if (data.customer.postalCode && data.customer.city) {
    cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
  } else if (data.customer.city) {
    cityParts.push(data.customer.city);
  }
  if (data.customer.country && data.customer.country !== data.customer.city) {
    cityParts.push(data.customer.country);
  }
  if (cityParts.length) customerLines.push(cityParts.join(", "));
  if (data.customer.vatNumber) customerLines.push(`BTW: ${data.customer.vatNumber}`);
  return /* @__PURE__ */ jsx5(Document5, { children: /* @__PURE__ */ jsxs5(Page5, { size: "A4", style: styles5.page, children: [
    /* @__PURE__ */ jsxs5(View5, { style: styles5.header, children: [
      /* @__PURE__ */ jsxs5(View5, { style: styles5.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx5(Image5, { src: data.company.logoUrl, style: styles5.logo }),
        /* @__PURE__ */ jsxs5(View5, { style: styles5.companyInfo, children: [
          /* @__PURE__ */ jsx5(Text5, { style: styles5.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx5(Text5, { style: styles5.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null,
            data.company.email
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs5(View5, { style: styles5.headerRight, children: [
        /* @__PURE__ */ jsx5(Text5, { style: styles5.docTitle, children: data.labels.documentTitle }),
        /* @__PURE__ */ jsx5(Text5, { style: styles5.docNumber, children: data.documentNumber })
      ] })
    ] }),
    /* @__PURE__ */ jsx5(View5, { style: styles5.creditBanner, children: /* @__PURE__ */ jsx5(Text5, { style: styles5.creditBannerText, children: T.cnBanner }) }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.infoRow, children: [
      /* @__PURE__ */ jsxs5(View5, { style: styles5.customerBox, children: [
        /* @__PURE__ */ jsx5(Text5, { style: styles5.customerLabel, children: data.labels.invoiceAddress }),
        /* @__PURE__ */ jsx5(Text5, { style: styles5.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx5(Text5, { style: styles5.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsx5(View5, { style: styles5.metaBox, children: /* @__PURE__ */ jsxs5(View5, { style: styles5.metaRow, children: [
        /* @__PURE__ */ jsx5(Text5, { style: styles5.metaLabel, children: T.metaCreditDate }),
        /* @__PURE__ */ jsx5(Text5, { style: styles5.metaValue, children: formatDate(data.documentDate) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.referenceBox, children: [
      /* @__PURE__ */ jsx5(Text5, { style: styles5.referenceTitle, children: T.cnRefTitle }),
      /* @__PURE__ */ jsx5(Text5, { style: styles5.referenceText, children: T.cnRefText(data.order.orderNumber, formatDate(data.order.orderDate)) })
    ] }),
    isReverseCharge && /* @__PURE__ */ jsx5(View5, { style: styles5.verlegdBox, children: /* @__PURE__ */ jsxs5(Text5, { style: styles5.verlegdText, children: [
      /* @__PURE__ */ jsx5(Text5, { style: styles5.verlegdLabel, children: T.verlegdLabel }),
      T.verlegdBody,
      data.customer.vatNumber || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.table, children: [
      /* @__PURE__ */ jsxs5(View5, { style: styles5.tableHeader, children: [
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colNum], children: "#" }),
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colDesc], children: T.thDescription }),
        hasBox ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
          /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colPiecePrice], children: T.thPiecePrice }),
          /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colBoxPrice], children: T.thBoxPrice })
        ] }) : /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colUnitPrice], children: T.thUnitPrice }),
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colQty], children: T.thQty }),
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colExclVat], children: T.thExclVat }),
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colVatAmt], children: T.thVat }),
        /* @__PURE__ */ jsx5(Text5, { style: [styles5.th, styles5.colCredit], children: T.thCredit })
      ] }),
      data.items.map((item, idx) => {
        const priceExclVat = item.unitPrice * item.quantity;
        const vatAmount = Math.round(priceExclVat * (item.vatRate / 100));
        const priceInclVat = priceExclVat + vatAmount;
        const isBoxLine = item.unitType === "doos";
        return /* @__PURE__ */ jsxs5(
          View5,
          {
            wrap: false,
            style: [
              styles5.tableRow,
              idx % 2 === 0 ? styles5.rowEven : styles5.rowOdd
            ],
            children: [
              /* @__PURE__ */ jsx5(Text5, { style: [styles5.tdBold, styles5.colNum], children: idx + 1 }),
              /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colDesc], children: item.description }),
              hasBox ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
                /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colPiecePrice], children: isBoxLine ? item.piecePrice != null ? formatPrice(item.piecePrice) : "\u2014" : formatPrice(item.unitPrice) }),
                /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colBoxPrice], children: isBoxLine ? formatPrice(item.unitPrice) : "\u2014" })
              ] }) : /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colUnitPrice], children: formatPrice(item.unitPrice) }),
              /* @__PURE__ */ jsxs5(Text5, { style: [styles5.td, styles5.colQty], children: [
                item.quantity,
                " ",
                item.unit.toLowerCase()
              ] }),
              /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colExclVat], children: formatPrice(priceExclVat) }),
              /* @__PURE__ */ jsx5(Text5, { style: [styles5.td, styles5.colVatAmt], children: formatPrice(vatAmount) }),
              /* @__PURE__ */ jsxs5(Text5, { style: [styles5.tdCredit, styles5.colCredit], children: [
                "-",
                formatPrice(priceInclVat)
              ] })
            ]
          },
          idx
        );
      })
    ] }),
    /* @__PURE__ */ jsx5(View5, { style: { marginTop: "auto" } }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.bottomSection, wrap: false, children: [
      /* @__PURE__ */ jsxs5(View5, { style: styles5.reasonBox, children: [
        /* @__PURE__ */ jsx5(Text5, { style: styles5.reasonTitle, children: T.cnReasonTitle }),
        /* @__PURE__ */ jsx5(Text5, { style: styles5.reasonText, children: T.cnReasonText })
      ] }),
      /* @__PURE__ */ jsxs5(View5, { style: styles5.totalsBox, children: [
        /* @__PURE__ */ jsxs5(View5, { style: styles5.totalRow, children: [
          /* @__PURE__ */ jsx5(Text5, { style: styles5.totalLabel, children: T.tSubtotal }),
          /* @__PURE__ */ jsxs5(Text5, { style: styles5.totalValueCredit, children: [
            "-",
            formatPrice(data.subtotal)
          ] })
        ] }),
        data.vatBreakdown.map((vat, idx) => /* @__PURE__ */ jsxs5(View5, { style: styles5.totalRow, children: [
          /* @__PURE__ */ jsxs5(Text5, { style: styles5.totalLabel, children: [
            data.labels.vat,
            " ",
            vat.rate,
            "%"
          ] }),
          /* @__PURE__ */ jsxs5(Text5, { style: styles5.totalValueCredit, children: [
            "-",
            formatPrice(vat.amount)
          ] })
        ] }, idx)),
        /* @__PURE__ */ jsxs5(View5, { style: styles5.grandTotalRow, children: [
          /* @__PURE__ */ jsx5(Text5, { style: styles5.grandTotalLabel, children: T.tCreditTotal }),
          /* @__PURE__ */ jsxs5(Text5, { style: styles5.grandTotalValue, children: [
            "-",
            formatPrice(data.grandTotal)
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.processingBox, children: [
      /* @__PURE__ */ jsx5(Text5, { style: styles5.processingTitle, children: T.cnProcessTitle }),
      /* @__PURE__ */ jsx5(Text5, { style: styles5.processingText, children: T.cnProcessText(formatPrice(data.grandTotal)) })
    ] }),
    /* @__PURE__ */ jsxs5(View5, { style: styles5.footer, wrap: false, children: [
      /* @__PURE__ */ jsxs5(View5, { style: styles5.footerRow, children: [
        /* @__PURE__ */ jsxs5(View5, { children: [
          /* @__PURE__ */ jsx5(Text5, { style: styles5.footerCompany, children: data.company.name }),
          /* @__PURE__ */ jsx5(Text5, { style: styles5.footerDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
          ].filter(Boolean).join(", ") })
        ] }),
        /* @__PURE__ */ jsxs5(View5, { children: [
          /* @__PURE__ */ jsx5(Text5, { style: styles5.footerDetail, children: [
            data.company.kvkNumber && `KVK: ${data.company.kvkNumber}`,
            data.company.vatNumber && `BTW: ${data.company.vatNumber}`
          ].filter(Boolean).join("  |  ") }),
          data.company.iban && /* @__PURE__ */ jsxs5(Text5, { style: styles5.footerIban, children: [
            "IBAN: ",
            data.company.iban,
            data.company.bic ? `  |  BIC: ${data.company.bic}` : ""
          ] })
        ] })
      ] }),
      data.footerText && /* @__PURE__ */ jsx5(Text5, { style: styles5.footerCenter, children: data.footerText })
    ] })
  ] }) });
}

// src/components/documents/PackingSlipTemplate.tsx
import {
  Document as Document6,
  Page as Page6,
  View as View6,
  Text as Text6,
  Image as Image6,
  StyleSheet as StyleSheet6
} from "@react-pdf/renderer";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var styles6 = StyleSheet6.create({
  // PAGE
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyDetail: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.35
  },
  headerRight: {
    alignItems: "flex-end"
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3
  },
  docNumber: {
    fontSize: 8.5,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: 4,
    paddingHorizontal: 10
  },
  // INFO ROW
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: docBrand.packingSlip.accent,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1
  },
  customerDetail: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  metaBox: {
    width: "40%"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b"
  },
  metaValue: {
    fontSize: 8
  },
  // ITEMS TABLE
  table: {
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingVertical: 5,
    paddingHorizontal: 6
  },
  th: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    alignItems: "center"
  },
  rowEven: {
    backgroundColor: "#f8fafc"
  },
  rowOdd: {
    backgroundColor: "#ffffff"
  },
  td: {
    fontSize: 8
  },
  tdBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold"
  },
  // Column widths
  colIdx: { width: 28, textAlign: "center" },
  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 70, textAlign: "center" },
  colCheck: { width: 40, textAlign: "center" },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: "#94a3b8",
    marginHorizontal: "auto"
  },
  // TOTAL (quantity summary, per unit type)
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8
  },
  totalsBox: {
    minWidth: "45%",
    maxWidth: "70%",
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    backgroundColor: "#f8fafc",
    padding: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalsLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  totalsValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
    marginLeft: 10
  },
  // DELIVERY NOTES (compact)
  notesSection: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 2,
    borderLeftColor: "#fcd34d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8
  },
  notesTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 2
  },
  notesText: {
    fontSize: 7.5,
    color: "#92400e"
  },
  // SIGNATURE SECTION
  signatureSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8
  },
  signatureBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    padding: 7
  },
  signatureTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 6
  },
  sigField: {
    marginBottom: 5
  },
  sigLabel: {
    fontSize: 6.5,
    color: "#64748b",
    marginBottom: 1
  },
  sigLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    borderStyle: "dashed",
    height: 11
  },
  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 1
  },
  footerDetail: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.4
  }
});
function formatDate2(dateString) {
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function PackingSlipTemplate({ data }) {
  const T = getDocText(data.lang);
  const hasCompanyDetails = data.company.address || data.company.phone || data.company.email;
  const customerLines = [];
  if (data.customer.contactPerson) customerLines.push(data.customer.contactPerson);
  const shipTo = data.customer.deliveryAddress;
  if (shipTo) {
    customerLines.push(...buildAddressLines(shipTo));
  } else {
    if (data.customer.street) customerLines.push(data.customer.street);
    const cityParts = [];
    if (data.customer.postalCode && data.customer.city) {
      cityParts.push(`${data.customer.postalCode} ${data.customer.city}`);
    } else if (data.customer.city) {
      cityParts.push(data.customer.city);
    }
    if (data.customer.country && data.customer.country !== data.customer.city) {
      cityParts.push(data.customer.country);
    }
    if (cityParts.length) customerLines.push(cityParts.join(", "));
  }
  const isEn = data.lang === "en";
  const formatUnit = (unitType, quantity) => {
    const one = quantity === 1;
    switch (unitType?.toLowerCase()) {
      case "kg":
        return "kg";
      case "piece":
        return isEn ? one ? "pc" : "pcs" : one ? "stuk" : "stuks";
      case "zak":
        return isEn ? one ? "bag" : "bags" : one ? "zak" : "zakken";
      case "doos":
        return isEn ? one ? "box" : "boxes" : one ? "doos" : "dozen";
      case "package":
        return isEn ? one ? "pack" : "packs" : one ? "pak" : "pakken";
      default:
        return unitType;
    }
  };
  const fmtQty = (n) => Number.isInteger(n) ? String(n) : n.toLocaleString(isEn ? "en-US" : "nl-NL", { maximumFractionDigits: 3 });
  const unitOrder = [];
  const qtyByUnit = /* @__PURE__ */ new Map();
  for (const it of data.items) {
    const key = (it.unitType || it.unit || "").toLowerCase();
    if (!qtyByUnit.has(key)) {
      qtyByUnit.set(key, 0);
      unitOrder.push(key);
    }
    qtyByUnit.set(key, (qtyByUnit.get(key) ?? 0) + (Number(it.quantity) || 0));
  }
  const totalParts = unitOrder.map((u) => {
    const qty = qtyByUnit.get(u) ?? 0;
    return `${fmtQty(qty)} ${formatUnit(u, qty)}`;
  });
  return /* @__PURE__ */ jsx6(Document6, { children: /* @__PURE__ */ jsxs6(Page6, { size: "A4", style: styles6.page, children: [
    /* @__PURE__ */ jsxs6(View6, { style: styles6.header, children: [
      /* @__PURE__ */ jsxs6(View6, { style: styles6.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx6(Image6, { src: data.company.logoUrl, style: styles6.logo }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.companyInfo, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.companyName, children: data.company.name }),
          hasCompanyDetails && /* @__PURE__ */ jsx6(Text6, { style: styles6.companyDetail, children: [
            data.company.address,
            data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null,
            data.company.phone ? `Tel: ${data.company.phone}` : null
          ].filter(Boolean).join("\n") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs6(View6, { style: styles6.headerRight, children: [
        /* @__PURE__ */ jsx6(Text6, { style: styles6.docTitle, children: data.labels.documentTitle }),
        /* @__PURE__ */ jsx6(Text6, { style: styles6.docNumber, children: data.documentNumber })
      ] })
    ] }),
    /* @__PURE__ */ jsxs6(View6, { style: styles6.infoRow, children: [
      /* @__PURE__ */ jsxs6(View6, { style: styles6.customerBox, children: [
        /* @__PURE__ */ jsx6(Text6, { style: styles6.customerLabel, children: T.addrDelivery }),
        /* @__PURE__ */ jsx6(Text6, { style: styles6.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx6(Text6, { style: styles6.customerDetail, children: customerLines.join("\n") })
      ] }),
      /* @__PURE__ */ jsxs6(View6, { style: styles6.metaBox, children: [
        /* @__PURE__ */ jsxs6(View6, { style: styles6.metaRow, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.metaLabel, children: T.metaOrderNumberShort }),
          /* @__PURE__ */ jsx6(Text6, { style: styles6.metaValue, children: data.order.orderNumber })
        ] }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.metaRow, children: [
          /* @__PURE__ */ jsxs6(Text6, { style: styles6.metaLabel, children: [
            data.labels.date,
            ":"
          ] }),
          /* @__PURE__ */ jsx6(Text6, { style: styles6.metaValue, children: formatDate2(data.documentDate) })
        ] }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.metaRow, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.metaLabel, children: T.metaArticles }),
          /* @__PURE__ */ jsx6(Text6, { style: styles6.metaValue, children: data.items.length })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs6(View6, { style: styles6.table, children: [
      /* @__PURE__ */ jsxs6(View6, { style: styles6.tableHeader, children: [
        /* @__PURE__ */ jsx6(Text6, { style: [styles6.th, styles6.colIdx], children: "#" }),
        /* @__PURE__ */ jsx6(Text6, { style: [styles6.th, styles6.colDesc], children: T.thDescription }),
        /* @__PURE__ */ jsx6(Text6, { style: [styles6.th, styles6.colQty], children: T.thQty }),
        /* @__PURE__ */ jsx6(Text6, { style: [styles6.th, styles6.colCheck], children: T.thCheck })
      ] }),
      data.items.map((item, idx) => /* @__PURE__ */ jsxs6(
        View6,
        {
          wrap: false,
          style: [
            styles6.tableRow,
            idx % 2 === 0 ? styles6.rowEven : styles6.rowOdd
          ],
          children: [
            /* @__PURE__ */ jsx6(Text6, { style: [styles6.td, styles6.colIdx], children: item.index }),
            /* @__PURE__ */ jsx6(Text6, { style: [styles6.td, styles6.colDesc], children: item.description }),
            /* @__PURE__ */ jsxs6(Text6, { style: [styles6.tdBold, styles6.colQty], children: [
              item.quantity,
              " ",
              item.unit.toLowerCase()
            ] }),
            /* @__PURE__ */ jsx6(View6, { style: styles6.colCheck, children: /* @__PURE__ */ jsx6(View6, { style: styles6.checkbox }) })
          ]
        },
        idx
      ))
    ] }),
    totalParts.length > 0 && /* @__PURE__ */ jsx6(View6, { style: styles6.totalsWrap, wrap: false, children: /* @__PURE__ */ jsxs6(View6, { style: styles6.totalsBox, children: [
      /* @__PURE__ */ jsx6(Text6, { style: styles6.totalsLabel, children: T.psTotalLabel }),
      /* @__PURE__ */ jsx6(Text6, { style: styles6.totalsValue, children: totalParts.join(",  ") })
    ] }) }),
    /* @__PURE__ */ jsxs6(View6, { style: styles6.notesSection, children: [
      /* @__PURE__ */ jsx6(Text6, { style: styles6.notesTitle, children: T.psNotesTitle }),
      /* @__PURE__ */ jsx6(Text6, { style: styles6.notesText, children: T.psNotesText })
    ] }),
    /* @__PURE__ */ jsx6(View6, { style: { marginTop: "auto" } }),
    /* @__PURE__ */ jsxs6(View6, { style: styles6.signatureSection, wrap: false, children: [
      /* @__PURE__ */ jsxs6(View6, { style: styles6.signatureBox, children: [
        /* @__PURE__ */ jsx6(Text6, { style: styles6.signatureTitle, children: T.psSender }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.sigField, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.sigLabel, children: data.labels.name }),
          /* @__PURE__ */ jsx6(View6, { style: styles6.sigLine })
        ] }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.sigField, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.sigLabel, children: data.labels.signature }),
          /* @__PURE__ */ jsx6(View6, { style: styles6.sigLine })
        ] })
      ] }),
      /* @__PURE__ */ jsxs6(View6, { style: styles6.signatureBox, children: [
        /* @__PURE__ */ jsx6(Text6, { style: styles6.signatureTitle, children: T.psReceiver }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.sigField, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.sigLabel, children: data.labels.name }),
          /* @__PURE__ */ jsx6(View6, { style: styles6.sigLine })
        ] }),
        /* @__PURE__ */ jsxs6(View6, { style: styles6.sigField, children: [
          /* @__PURE__ */ jsx6(Text6, { style: styles6.sigLabel, children: data.labels.signature }),
          /* @__PURE__ */ jsx6(View6, { style: styles6.sigLine })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx6(View6, { style: styles6.footer, wrap: false, children: /* @__PURE__ */ jsxs6(View6, { style: styles6.footerRow, children: [
      /* @__PURE__ */ jsxs6(View6, { children: [
        /* @__PURE__ */ jsx6(Text6, { style: styles6.footerCompany, children: data.company.name }),
        /* @__PURE__ */ jsx6(Text6, { style: styles6.footerDetail, children: [
          data.company.address,
          data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null
        ].filter(Boolean).join(", ") })
      ] }),
      /* @__PURE__ */ jsx6(View6, { children: /* @__PURE__ */ jsx6(Text6, { style: styles6.footerDetail, children: [
        data.company.phone && `Tel: ${data.company.phone}`,
        data.company.email
      ].filter(Boolean).join("  |  ") }) })
    ] }) })
  ] }) });
}

// src/components/documents/getDocumentTemplate.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
function getDocumentTemplate(documentType, data) {
  switch (documentType) {
    case "invoice":
      return /* @__PURE__ */ jsx7(InvoiceTemplate, { data });
    case "proforma":
      return /* @__PURE__ */ jsx7(ProformaTemplate, { data });
    case "order_confirmation":
      return /* @__PURE__ */ jsx7(OrderConfirmationTemplate, { data });
    case "payment_reminder":
      return /* @__PURE__ */ jsx7(PaymentReminderTemplate, { data });
    case "credit_note":
      return /* @__PURE__ */ jsx7(CreditNoteTemplate, { data });
    case "packing_slip":
      return /* @__PURE__ */ jsx7(PackingSlipTemplate, { data });
    default:
      return /* @__PURE__ */ jsx7(InvoiceTemplate, { data });
  }
}

// src/components/documents/PaymentOverviewTemplate.tsx
import {
  Document as Document7,
  Page as Page7,
  View as View7,
  Text as Text7,
  Image as Image7,
  StyleSheet as StyleSheet7
} from "@react-pdf/renderer";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var BRAND = docBrand.paymentOverview;
var USABLE_WIDTH = 841.89 - 28 * 2;
var COL = {
  invoice: 0,
  // flex — computed below
  invoiceDate: 90,
  dueDate: 90,
  daysLate: 80,
  amount: 100
};
COL.invoice = USABLE_WIDTH - (COL.invoiceDate + COL.dueDate + COL.daysLate + COL.amount);
var styles7 = StyleSheet7.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#1e293b"
  },
  // --- HEADER --------------------------------------------------------------
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  headerLeft: { flexDirection: "row", alignItems: "flex-start" },
  logo: {
    width: 80,
    height: "auto",
    maxHeight: 36,
    objectFit: "contain",
    marginRight: 10
  },
  companyInfo: {},
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  companyDetail: { fontSize: 7, color: "#64748b", lineHeight: 1.35 },
  headerRight: { alignItems: "flex-end" },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: BRAND.primary
  },
  docNumberBadge: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND.dark,
    backgroundColor: BRAND.tint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4
  },
  // --- INFO ROW (customer + meta) -----------------------------------------
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  customerBox: {
    width: "55%",
    borderLeftWidth: 2,
    borderLeftColor: BRAND.accent,
    paddingLeft: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc"
  },
  customerLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  customerName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  customerDetail: { fontSize: 8, color: "#475569", lineHeight: 1.35 },
  metaBox: { width: "40%" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 1
  },
  metaLabel: { fontSize: 7.5, color: "#64748b" },
  metaValue: { fontSize: 8 },
  metaValueStrong: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  // --- INTRO ---------------------------------------------------------------
  introBox: {
    borderLeftWidth: 2,
    borderLeftColor: BRAND.accent,
    backgroundColor: BRAND.tintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  introText: { fontSize: 7.5, color: BRAND.dark, lineHeight: 1.35 },
  // --- TABLE ---------------------------------------------------------------
  table: { marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.dark,
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    paddingHorizontal: 2
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0"
  },
  rowEven: { backgroundColor: "#f8fafc" },
  rowOdd: { backgroundColor: "#ffffff" },
  td: { fontSize: 7.5, paddingHorizontal: 2 },
  tdBold: { fontSize: 7.5, fontFamily: "Helvetica-Bold", paddingHorizontal: 2 },
  // SEMANTIC, not brand: an overdue line is red on every tenant, same as the
  // invoice's overdue due-date. Do not repoint this at BRAND.
  tdOverdue: { fontSize: 7.5, color: "#dc2626", paddingHorizontal: 2 },
  tdMuted: { fontSize: 7.5, color: "#94a3b8", paddingHorizontal: 2 },
  // --- TOTALS --------------------------------------------------------------
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  totalsBox: {
    width: 280,
    borderTopWidth: 2,
    borderTopColor: BRAND.primary,
    backgroundColor: BRAND.tintSoft,
    padding: 7
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  totalsLabel: { fontSize: 7.5, color: "#475569" },
  totalsValue: { fontSize: 7.5 },
  totalsValueOverdue: { fontSize: 7.5, color: "#dc2626" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: BRAND.primary
  },
  grandLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND.dark },
  // --- IBAN CALLOUT --------------------------------------------------------
  ibanCallout: {
    borderWidth: 0.5,
    borderColor: BRAND.primary,
    backgroundColor: BRAND.tintSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: "center"
  },
  ibanCalloutLabel: { fontSize: 8, color: BRAND.dark, marginBottom: 2 },
  ibanCalloutIban: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND.dark,
    letterSpacing: 0.5
  },
  ibanCalloutHolder: { fontSize: 7.5, color: BRAND.dark, marginTop: 1 },
  ibanCalloutRef: { fontSize: 7, color: "#64748b", marginTop: 2 },
  noteText: { fontSize: 7, color: "#64748b", lineHeight: 1.35, marginBottom: 6 },
  emptyText: { fontSize: 9, color: "#475569", marginBottom: 8 },
  // --- FOOTER --------------------------------------------------------------
  footer: {
    borderTopWidth: 1,
    borderTopColor: BRAND.primary,
    paddingTop: 6,
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  footerCompany: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  footerDetail: { fontSize: 6.5, color: "#64748b", lineHeight: 1.4 },
  pageNumber: { fontSize: 6.5, color: "#64748b" }
});
function PaymentOverviewPage({ data }) {
  const T = getDocText(data.lang);
  const isEn = data.lang === "en";
  const companyLines = [
    data.company.address,
    data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : data.company.city,
    data.company.phone ? `Tel: ${data.company.phone}` : null,
    data.company.email
  ].filter(Boolean).join("\n");
  const customerLines = buildAddressLines({
    street: data.customer.street,
    postalCode: data.customer.postalCode,
    city: data.customer.city,
    country: data.customer.country
  });
  const footerDetail = [
    data.company.vatNumber ? `BTW: ${data.company.vatNumber}` : null,
    data.company.kvkNumber ? `KvK: ${data.company.kvkNumber}` : null,
    data.company.website
  ].filter(Boolean).join(" \xB7 ");
  const pageLabel = isEn ? "Page" : "Pagina";
  const ofLabel = isEn ? "of" : "van";
  return /* @__PURE__ */ jsxs7(Page7, { size: "A4", orientation: "landscape", style: styles7.page, children: [
    /* @__PURE__ */ jsxs7(View7, { style: styles7.header, fixed: true, children: [
      /* @__PURE__ */ jsxs7(View7, { style: styles7.headerLeft, children: [
        data.company.logoUrl && /* @__PURE__ */ jsx8(Image7, { src: data.company.logoUrl, style: styles7.logo }),
        /* @__PURE__ */ jsxs7(View7, { style: styles7.companyInfo, children: [
          /* @__PURE__ */ jsx8(Text7, { style: styles7.companyName, children: data.company.name }),
          companyLines ? /* @__PURE__ */ jsx8(Text7, { style: styles7.companyDetail, children: companyLines }) : null
        ] })
      ] }),
      /* @__PURE__ */ jsxs7(View7, { style: styles7.headerRight, children: [
        /* @__PURE__ */ jsx8(Text7, { style: styles7.docTitle, children: T.poTitle }),
        /* @__PURE__ */ jsx8(Text7, { style: styles7.docNumberBadge, children: formatDate(data.asAtDate) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs7(View7, { style: styles7.infoRow, children: [
      /* @__PURE__ */ jsxs7(View7, { style: styles7.customerBox, children: [
        /* @__PURE__ */ jsx8(Text7, { style: styles7.customerLabel, children: T.poAddrLabel }),
        /* @__PURE__ */ jsx8(Text7, { style: styles7.customerName, children: data.customer.companyName }),
        /* @__PURE__ */ jsx8(Text7, { style: styles7.customerDetail, children: [data.customer.contactPerson, ...customerLines].filter(Boolean).join("\n") })
      ] }),
      /* @__PURE__ */ jsxs7(View7, { style: styles7.metaBox, children: [
        /* @__PURE__ */ jsxs7(View7, { style: styles7.metaRow, children: [
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaLabel, children: T.poMetaDate }),
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaValue, children: formatDate(data.asAtDate) })
        ] }),
        /* @__PURE__ */ jsxs7(View7, { style: styles7.metaRow, children: [
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaLabel, children: T.poMetaCount }),
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaValue, children: data.lines.length })
        ] }),
        /* @__PURE__ */ jsxs7(View7, { style: styles7.metaRow, children: [
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaLabel, children: T.poTotalLabel }),
          /* @__PURE__ */ jsx8(Text7, { style: styles7.metaValueStrong, children: formatPrice(data.totalCents) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx8(View7, { style: styles7.introBox, children: /* @__PURE__ */ jsx8(Text7, { style: styles7.introText, children: T.poIntro(formatDate(data.asAtDate)) }) }),
    data.lines.length === 0 ? /* @__PURE__ */ jsx8(Text7, { style: styles7.emptyText, children: T.poEmpty }) : /* @__PURE__ */ jsxs7(View7, { style: styles7.table, children: [
      /* @__PURE__ */ jsxs7(View7, { style: styles7.tableHeader, fixed: true, children: [
        /* @__PURE__ */ jsx8(Text7, { style: [styles7.th, { width: COL.invoice }], children: T.poThInvoice }),
        /* @__PURE__ */ jsx8(Text7, { style: [styles7.th, { width: COL.invoiceDate }], children: T.poThInvoiceDate }),
        /* @__PURE__ */ jsx8(Text7, { style: [styles7.th, { width: COL.dueDate }], children: T.poThDueDate }),
        /* @__PURE__ */ jsx8(Text7, { style: [styles7.th, { width: COL.daysLate, textAlign: "right" }], children: T.poThDaysLate }),
        /* @__PURE__ */ jsx8(Text7, { style: [styles7.th, { width: COL.amount, textAlign: "right" }], children: T.poThAmount })
      ] }),
      data.lines.map((line, i) => {
        const overdue = line.days_overdue > 0;
        return /* @__PURE__ */ jsxs7(
          View7,
          {
            style: [styles7.tableRow, i % 2 === 0 ? styles7.rowEven : styles7.rowOdd],
            wrap: false,
            children: [
              /* @__PURE__ */ jsx8(Text7, { style: [styles7.tdBold, { width: COL.invoice }], children: line.invoice_number }),
              /* @__PURE__ */ jsx8(Text7, { style: [styles7.td, { width: COL.invoiceDate }], children: line.order_date ? formatDate(line.order_date) : "\u2014" }),
              /* @__PURE__ */ jsx8(Text7, { style: [styles7.td, { width: COL.dueDate }], children: line.invoice_due_date ? formatDate(line.invoice_due_date) : "\u2014" }),
              /* @__PURE__ */ jsx8(
                Text7,
                {
                  style: [
                    overdue ? styles7.tdOverdue : styles7.tdMuted,
                    { width: COL.daysLate, textAlign: "right" }
                  ],
                  children: overdue ? String(line.days_overdue) : "\u2014"
                }
              ),
              /* @__PURE__ */ jsx8(Text7, { style: [styles7.tdBold, { width: COL.amount, textAlign: "right" }], children: formatPrice(line.amount_cents) })
            ]
          },
          line.order_id
        );
      })
    ] }),
    /* @__PURE__ */ jsx8(View7, { style: styles7.totalsWrap, wrap: false, children: /* @__PURE__ */ jsx8(View7, { style: styles7.totalsBox, children: /* @__PURE__ */ jsxs7(View7, { style: styles7.grandRow, children: [
      /* @__PURE__ */ jsx8(Text7, { style: styles7.grandLabel, children: T.poTotalLabel }),
      /* @__PURE__ */ jsx8(Text7, { style: styles7.grandValue, children: formatPrice(data.totalCents) })
    ] }) }) }),
    data.lines.length > 0 && data.company.iban ? /* @__PURE__ */ jsxs7(View7, { style: styles7.ibanCallout, wrap: false, children: [
      /* @__PURE__ */ jsx8(Text7, { style: styles7.ibanCalloutLabel, children: T.ibanPay }),
      /* @__PURE__ */ jsx8(Text7, { style: styles7.ibanCalloutIban, children: data.company.iban }),
      data.company.accountHolder ? /* @__PURE__ */ jsxs7(Text7, { style: styles7.ibanCalloutHolder, children: [
        T.ibanHolderPrefix,
        data.company.accountHolder
      ] }) : null,
      /* @__PURE__ */ jsx8(Text7, { style: styles7.ibanCalloutRef, children: T.poIbanRef })
    ] }) : null,
    data.lines.length > 0 && /* @__PURE__ */ jsx8(Text7, { style: styles7.noteText, wrap: false, children: T.poAlreadyPaid }),
    /* @__PURE__ */ jsxs7(View7, { style: styles7.footer, fixed: true, children: [
      /* @__PURE__ */ jsxs7(View7, { children: [
        /* @__PURE__ */ jsx8(Text7, { style: styles7.footerCompany, children: data.company.name }),
        footerDetail ? /* @__PURE__ */ jsx8(Text7, { style: styles7.footerDetail, children: footerDetail }) : null
      ] }),
      /* @__PURE__ */ jsx8(
        Text7,
        {
          style: styles7.pageNumber,
          render: ({ pageNumber, totalPages }) => `${pageLabel} ${pageNumber} ${ofLabel} ${totalPages}`
        }
      )
    ] })
  ] });
}
function PaymentOverviewTemplate({ data }) {
  return /* @__PURE__ */ jsx8(Document7, { children: /* @__PURE__ */ jsx8(PaymentOverviewPage, { data }) });
}

// api-src/render-invoice.tsx
import { jsx as jsx9 } from "react/jsx-runtime";
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const secret = process.env.RENDER_SECRET;
  if (!secret || req.headers["x-render-secret"] !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const type = String(body.type ?? "invoice");
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ error: "supabase env not configured (need SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL/VITE_SUPABASE_URL)" });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    if (type === "payment_overview") {
      const overviewId = String(body.overviewId ?? "");
      if (!overviewId) return res.status(400).json({ error: "missing overviewId" });
      const { data: row, error: error2 } = await admin.from("payment_overviews").select("snapshot, period").eq("id", overviewId).maybeSingle();
      if (error2) return res.status(500).json({ error: `db: ${error2.message}` });
      if (!row?.snapshot) return res.status(404).json({ error: "no snapshot for overview" });
      const data = row.snapshot;
      const buffer2 = await renderToBuffer(
        /* @__PURE__ */ jsx9(PaymentOverviewTemplate, { data })
      );
      const pdf_base642 = Buffer.from(buffer2).toString("base64");
      const safeName = (data.customer?.companyName ?? "klant").replace(/[^\w-]+/g, "-");
      const filename2 = `Betaaloverzicht-${safeName}-${row.period}.pdf`;
      return res.status(200).json({ pdf_base64: pdf_base642, filename: filename2 });
    }
    const orderId = String(body.orderId ?? "");
    if (!orderId) return res.status(400).json({ error: "missing orderId" });
    const { data: doc, error } = await admin.from("documents").select("document_number, snapshot").eq("order_id", orderId).eq("document_type", "invoice").order("generated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return res.status(500).json({ error: `db: ${error.message}` });
    if (!doc?.snapshot) return res.status(404).json({ error: "no invoice snapshot for order" });
    const element = getDocumentTemplate("invoice", doc.snapshot);
    const buffer = await renderToBuffer(element);
    const pdf_base64 = Buffer.from(buffer).toString("base64");
    const filename = `Factuur-${doc.document_number ?? orderId}.pdf`;
    return res.status(200).json({ pdf_base64, filename });
  } catch (e) {
    const err = e;
    console.error("render-invoice failed:", err?.stack ?? err);
    return res.status(500).json({ error: `render failed: ${err?.message ?? String(e)}` });
  }
}
export {
  handler as default
};
