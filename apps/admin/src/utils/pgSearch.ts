/**
 * Sanitise a free-text search term for use inside a PostgREST `.or()` filter.
 * Commas and parentheses are grammar characters in the or() syntax and would
 * break the query (or worse, be interpreted as extra conditions), so strip
 * them. Percent signs are collapsed so a user typing `%` can't turn the term
 * into a match-all. The result is wrapped by the caller as `%<term>%`.
 */
export function sanitizeOrTerm(raw: string): string {
  return raw.replace(/[,()%\\]/g, ' ').trim()
}
