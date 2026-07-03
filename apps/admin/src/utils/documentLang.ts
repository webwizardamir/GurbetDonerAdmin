// Language selection for customer-facing output (documents, emails, reminders).
//
// Rule (client-driven): customers in NL or BE get Dutch; everyone else gets
// English. This is a DIFFERENT axis than VAT reverse charge (utils/vat.ts,
// which is `country !== 'NL'`) — a BE customer receives a Dutch document that
// still carries the reverse-charge notice. Keep the two rules separate.

import type { DocLang } from '../services/documentLabels'

const DUTCH_COUNTRIES = new Set(['NL', 'BE'])

export function resolveDocumentLang(country: string | null | undefined): DocLang {
  const code = (country || 'NL').trim().toUpperCase()
  return DUTCH_COUNTRIES.has(code) ? 'nl' : 'en'
}
