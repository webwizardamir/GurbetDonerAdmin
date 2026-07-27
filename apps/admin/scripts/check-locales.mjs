#!/usr/bin/env node
/**
 * Locale parity check — run from apps/admin: `node scripts/check-locales.mjs`
 *
 * The three locale files must hold the SAME keys with the SAME {{placeholders}}.
 * Both failure modes are silent in the browser, which is why this exists:
 *
 *   - a missing key renders the Dutch fallback — no error, no console warning,
 *     just a Dutch string sitting in an otherwise Turkish screen;
 *   - a dropped/renamed placeholder renders an EMPTY STRING into live UI
 *     ("Order  moved to trash"), because i18next substitutes nothing for an
 *     interpolation value it was never given.
 *
 * `nl` is the source of truth (project rule: Dutch first). Exits non-zero on any
 * mismatch so it can be wired into a pre-commit hook or the build if wanted.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const LOCALES = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales')
const BASE = 'nl'
const OTHERS = ['en', 'tr']

const load = lng => JSON.parse(readFileSync(join(LOCALES, `${lng}.json`), 'utf8'))

const flatten = (obj, prefix = '', out = new Map()) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out.set(key, v)
  }
  return out
}

const placeholders = s => new Set(String(s).match(/\{\{[^}]+\}\}/g) ?? [])

const base = flatten(load(BASE))
let failed = false

for (const lng of OTHERS) {
  const other = flatten(load(lng))
  const missing = [...base.keys()].filter(k => !other.has(k))
  const extra = [...other.keys()].filter(k => !base.has(k))

  const badPlaceholders = []
  for (const [key, value] of other) {
    if (!base.has(key)) continue
    const want = placeholders(base.get(key))
    const got = placeholders(value)
    const diff = [...want].filter(p => !got.has(p)).concat([...got].filter(p => !want.has(p)))
    if (diff.length) badPlaceholders.push(`      ${key}\n        ${BASE}: [${[...want]}]\n        ${lng}: [${[...got]}]`)
  }

  const problems = missing.length + extra.length + badPlaceholders.length
  console.log(`${problems ? '✗' : '✓'} ${lng}.json — ${other.size} keys (${BASE} has ${base.size})`)
  if (missing.length) console.log(`    missing ${missing.length}:\n      ${missing.join('\n      ')}`)
  if (extra.length) console.log(`    not in ${BASE} (${extra.length}):\n      ${extra.join('\n      ')}`)
  if (badPlaceholders.length) console.log(`    placeholder mismatch ${badPlaceholders.length}:\n${badPlaceholders.join('\n')}`)
  if (problems) failed = true
}

process.exit(failed ? 1 : 0)
