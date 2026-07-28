// One-off import: Gurbet Doner customer list (xlsx) -> customers table.
//
// TARGET DB IS GURBET (father tenant) `dvpnvulxkccurqkpqqnx` — NOT Melek.
// The script itself NEVER writes to a database: it emits SQL + audit CSVs, and the
// INSERT is executed separately against an explicit project ref. `.env.local` in this
// folder points at MELEK, so a script that read SUPABASE_URL would hit the wrong tenant.
//
// Usage (from apps/admin):
//   node scripts/import-gurbet-customers.mjs
//
// Outputs into migration-data/:
//   gurbet-customers-<date>.csv        every row exactly as it will land in the DB
//   gurbet-customers-flags-<date>.csv  the rows a human still has to confirm
//   gurbet-customers-<date>.sql        the INSERT statements

import ExcelJS from 'exceljs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const SRC = resolve('../../customers-2026-GURBET DONER (1).xlsx')
const today = new Date().toISOString().slice(0, 10)

// --- helpers ---------------------------------------------------------

const cell = (v) => {
  if (v == null) return ''
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text)
    if (v.result != null) return String(v.result)
    if (v.richText) return v.richText.map((r) => r.text).join('')
    return ''
  }
  return String(v)
}
// The sheet is full of trailing/double spaces from decades of manual entry.
const squash = (s) => cell(s).replace(/\s+/g, ' ').trim()

// Dutch particles stay lowercase mid-name ("Katwijk aan Zee", "Alphen aan den Rijn").
const PARTICLES = new Set(['van', 'de', 'den', 'der', 'het', 'aan', 'op', 'in', 'bij', 'ter', 'te', 'tot', 'en', "'t"])

function titleCase(input) {
  const words = squash(input).toLowerCase().split(' ')
  return words
    .map((w, i) => {
      if (!w) return w
      // House numbers and suffixes ("125h", "3312", "a/d") keep their own shape.
      if (/\d/.test(w)) return w.toUpperCase()
      if (i > 0 && PARTICLES.has(w)) return w
      // "ij" is a single Dutch letter — IJsselstein, IJmuiden.
      if (w.startsWith('ij')) return 'IJ' + w.slice(2)
      // Initials keep their dots: "b.meester" -> "B.Meester"
      return w.replace(/(^|[.\-/])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
    })
    .join(' ')
}

// Spelling corrections for city names. Left side is the squashed uppercase source.
const CITY_FIX = {
  AMTERDAM: 'Amsterdam',
  DENHAAG: 'Den Haag',
  NIUEWEGEIN: 'Nieuwegein',
  'NUEUW VENNEP': 'Nieuw Vennep',
  LEIDERDROP: 'Leiderdorp',
  'KAATWIJK AAN ZEE': 'Katwijk aan Zee',
  IJSSELTEIN: 'IJsselstein',
  VOORCHOTEN: 'Voorschoten',
  ZOTERMEER: 'Zoetermeer',
  MAASLUIS: 'Maassluis',
  'ALPHEN A/N RIJN': 'Alphen aan den Rijn',
  'ALPHEN AAN DE RIJN': 'Alphen aan den Rijn',
  // "<district> / <city>" was written for the driver's benefit; the district is the
  // actual municipality for postcode/geocoding purposes.
  'HOOGVLIET / ROTTERDAM': 'Hoogvliet',
  'DEURNE / ANTWERPEN': 'Deurne',
  'EKEREN / ANTWERPEN': 'Ekeren',
  'MERKSEM / ANTWERPEN': 'Merksem',
  'KAPPELLEN ANTWERPEN': 'Kapellen',
  'OOSTENDE/BELGIE': 'Oostende',
}

// Per-row corrections. Each one is reported in the flags CSV so it can be vetoed.
const ROW_FIX = {
  109: { billing_postal_code: '2571 HR', _why: 'postcode "25171 HR" has a digit too many; Paul Krugerlaan 234 Den Haag is 2571 HR' },
  133: { billing_city: 'Zeist', billing_street: 'De Clomp 3312', _why: 'city column held the postcode "3704 KB"; De Clomp 3312 is in Zeist. Street misspelled "DE CLOMB"' },
  61: { billing_street: 'Kloosterstraat', _why: 'street misspelled "KLOOSTERSTAAT" (house number still missing)' },
}

function fixEmail(raw) {
  let e = squash(raw).toLowerCase().replace(/\s+/g, '')
  if (!e) return { email: '', note: '' }
  const before = e
  e = e.replace(/@{2,}/g, '@') // goncagulkizir27@@hotmail.com
  e = e.replace(/@(?=\.)/g, '') // info@bakkerijtanthof@.nl -> info@bakkerijtanthof.nl
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
  return { email: e, note: e !== before ? `email repaired from "${before}"` : '', valid }
}

function cleanVat(raw, country) {
  const v = squash(raw)
  if (!v) return { vat: null, note: '' }
  const digits = v.replace(/^BTW\s*:?\s*/i, '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
  const bare = digits.replace(/^BE/, '')
  if (country !== 'BE') return { vat: digits || null, note: '' }
  // A 10-digit Belgian number only gains its country prefix — no digit is invented.
  if (/^\d{10}$/.test(bare)) return { vat: 'BE' + bare, note: '' }
  // Anything else is stored verbatim. A wrong VAT number on a reverse-charge invoice
  // is a legal problem, and there is no way to derive the missing/extra digit here —
  // do NOT "helpfully" pad a 9-digit number with a leading zero.
  return { vat: bare, note: `VAT "${v}" is not a valid Belgian number (${bare.length} digits, expected 10) — imported verbatim, NEEDS CONFIRMATION from the customer` }
}

function fixZip(raw, country) {
  const z = squash(raw).toUpperCase()
  if (!z) return { zip: null, note: '' }
  if (country === 'BE') {
    return /^\d{4}$/.test(z) ? { zip: z, note: '' } : { zip: z, note: `postcode "${z}" is not a 4-digit Belgian code` }
  }
  const m = z.replace(/\s+/g, '').match(/^(\d{4})([A-Z]{2})$/)
  if (m) return { zip: `${m[1]} ${m[2]}`, note: '' }
  return { zip: z, note: `postcode "${z}" is not in NL 1234 AB format` }
}

// --- read ------------------------------------------------------------

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(SRC)
const ws = wb.worksheets[0]

const COLS = ['company', 'contact', 'email', 'phone', 'vat', 'street', 'zip', 'city', 'country', 's_street', 's_zip', 's_city', 's_country']

const raw = []
for (let r = 2; r <= ws.rowCount; r++) {
  const vals = ws.getRow(r).values
  const o = { _row: r }
  COLS.forEach((k, i) => { o[k] = cell(vals[i + 1]) })
  if (COLS.some((k) => squash(o[k]) !== '')) raw.push(o)
}

// --- transform -------------------------------------------------------

const flags = []
const flag = (row, company, kind, detail) => flags.push({ row, company, kind, detail })

const seenEmail = new Map() // lc(email) -> first row that claimed it
const payloads = []

for (const r of raw) {
  const country = squash(r.country).toUpperCase() || 'NL'
  const company = squash(r.company)
  const fix = ROW_FIX[r._row] || {}

  const { email: emailFixed, note: emailNote, valid: emailValid } = fixEmail(r.email)
  let email = emailFixed
  if (emailNote) flag(r._row, company, 'email repaired', emailNote)
  if (email && !emailValid) flag(r._row, company, 'email still invalid', `"${email}" — imported anyway`)

  // One mailbox may sit on only one active customer (partial unique index on
  // lower(email)). Second and later claimants are imported without an email.
  if (email) {
    const key = email
    if (seenEmail.has(key)) {
      flag(r._row, company, 'duplicate email blanked', `"${email}" already used by row ${seenEmail.get(key)} — this customer imported with no email`)
      email = ''
    } else {
      seenEmail.set(key, r._row)
    }
  }

  const { vat, note: vatNote } = cleanVat(r.vat, country)
  if (vatNote) flag(r._row, company, 'VAT', vatNote)

  const { zip: zipRaw, note: zipNote } = fixZip(fix.billing_postal_code ?? r.zip, country)
  if (zipNote && !fix.billing_postal_code) flag(r._row, company, 'postcode', zipNote)

  const citySrc = fix.billing_city ?? r.city
  const cityKey = squash(citySrc).toUpperCase()
  const city = fix.billing_city ?? (CITY_FIX[cityKey] || titleCase(citySrc))
  if (!fix.billing_city && CITY_FIX[cityKey]) flag(r._row, company, 'city corrected', `"${squash(citySrc)}" -> "${city}"`)

  const street = fix.billing_street ?? titleCase(r.street)
  if (street && !/\d/.test(street)) flag(r._row, company, 'no house number', `street "${street}" has no house number — will not geocode for route planning`)

  if (fix._why) flag(r._row, company, 'manual correction', fix._why)

  payloads.push({
    _row: r._row,
    company_name: company,
    contact_person: squash(r.contact) || null,
    email,                                   // '' when unknown (column is NOT NULL)
    phone: squash(r.phone) || null,
    vat_number: vat,
    billing_street: street || null,
    billing_city: city || null,
    billing_postal_code: zipRaw,
    billing_country: country,
    // legacy mirrors — `country` defaults to 'Turkey' on this DB, so always set it
    address: street || null,
    city: city || null,
    postal_code: zipRaw,
    country,
    // the sheet has no delivery addresses at all
    shipping_same_as_billing: true,
    shipping_street: null,
    shipping_city: null,
    shipping_postal_code: null,
    shipping_country: country,
    customer_type: null,                     // left untagged; Gurbet's staff classify later
    is_active: true,
  })
}

// --- write outputs ---------------------------------------------------

mkdirSync(resolve('migration-data'), { recursive: true })
const csv = (rows) => rows.map((r) => r.map((x) => {
  const s = x == null ? '' : String(x)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\n')

const FIELDS = ['company_name', 'contact_person', 'email', 'phone', 'vat_number', 'billing_street', 'billing_postal_code', 'billing_city', 'billing_country', 'customer_type', 'is_active']
const dataPath = resolve('migration-data', `gurbet-customers-${today}.csv`)
writeFileSync(dataPath, csv([['xlsx_row', ...FIELDS], ...payloads.map((p) => [p._row, ...FIELDS.map((f) => p[f])])]))

const flagPath = resolve('migration-data', `gurbet-customers-flags-${today}.csv`)
writeFileSync(flagPath, csv([['xlsx_row', 'company', 'kind', 'detail'], ...flags.map((f) => [f.row, f.company, f.kind, f.detail])]))

const q = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replace(/'/g, "''")}'`
}
// Only the authored fields go in the INSERT; the legacy mirrors (address/city/
// postal_code/country) and the shipping columns are derived in one UPDATE afterwards.
// `country` defaults to 'Turkey' on this DB, so it must be written, not left alone.
const SQL_FIELDS = ['company_name', 'contact_person', 'email', 'phone', 'vat_number', 'billing_street', 'billing_city', 'billing_postal_code', 'billing_country']
const sql = [
  '-- Gurbet Doner customer import. TARGET: dvpnvulxkccurqkpqqnx (father tenant).',
  `-- Generated ${today} from customers-2026-GURBET DONER (1).xlsx by scripts/import-gurbet-customers.mjs`,
  `INSERT INTO customers (${SQL_FIELDS.join(', ')}) VALUES`,
  payloads.map((p) => '(' + SQL_FIELDS.map((f) => q(p[f])).join(',') + ')').join(',\n') + ';',
  '',
  'UPDATE customers SET address = billing_street, city = billing_city,',
  '  postal_code = billing_postal_code, country = billing_country,',
  '  shipping_same_as_billing = true, shipping_country = billing_country;',
].join('\n')
const sqlPath = resolve('migration-data', `gurbet-customers-${today}.sql`)
writeFileSync(sqlPath, sql)

// --- summary ---------------------------------------------------------

const n = payloads.length
const count = (fn) => payloads.filter(fn).length
console.log(`\nRows to insert:        ${n}`)
console.log(`  with email:          ${count((p) => p.email)}   (no email: ${count((p) => !p.email)})`)
console.log(`  with contact person: ${count((p) => p.contact_person)}`)
console.log(`  with phone:          ${count((p) => p.phone)}`)
console.log(`  with VAT number:     ${count((p) => p.vat_number)}`)
console.log(`  BE (0% reverse chg): ${count((p) => p.billing_country === 'BE')}`)
console.log(`  full billing addr:   ${count((p) => p.billing_street && p.billing_city && p.billing_postal_code)}`)

const byKind = {}
for (const f of flags) byKind[f.kind] = (byKind[f.kind] || 0) + 1
console.log(`\nFlags (${flags.length}):`)
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`)

console.log(`\nSample (first 8, as they will land):`)
for (const p of payloads.slice(0, 8)) {
  console.log(`  ${String(p._row).padStart(3)}  ${p.company_name.padEnd(30).slice(0, 30)}  ${(p.billing_street || '').padEnd(26).slice(0, 26)}  ${(p.billing_postal_code || '').padEnd(8)} ${(p.billing_city || '').padEnd(14).slice(0, 14)} ${p.billing_country}  ${p.email || '—'}`)
}

console.log(`\n  data:  ${dataPath}`)
console.log(`  flags: ${flagPath}`)
console.log(`  sql:   ${sqlPath}`)
console.log('\nNothing was written to any database.')
