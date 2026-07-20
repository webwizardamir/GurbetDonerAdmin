// Shared strong-password policy for every place a password is SET (admin
// reset, staff creation, portal provisioning, portal self-service change).
// Enforcement lives here so the rule can't drift between forms; the server
// (edge functions create-user / manage-portal-account) mirrors the SAME rule
// so a browser-side check can never be bypassed.
//
// Policy: at least 12 characters, with at least one uppercase letter, one
// lowercase letter and one number.

export const PASSWORD_MIN_LENGTH = 12

export interface PasswordChecks {
  length: boolean
  upper: boolean
  lower: boolean
  digit: boolean
}

/** Per-requirement booleans — drives the requirements checklist UI. */
export function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
  }
}

/** True when the password satisfies every requirement. */
export function isStrongPassword(pw: string): boolean {
  const c = checkPassword(pw)
  return c.length && c.upper && c.lower && c.digit
}

/**
 * Returns the i18n key of the FIRST unmet requirement, or null when the
 * password is strong. Callers render it with `t(key)`.
 */
export function passwordProblemKey(pw: string): string | null {
  const c = checkPassword(pw)
  if (!c.length) return 'auth.passwordPolicy.errorLength'
  if (!c.upper) return 'auth.passwordPolicy.errorUpper'
  if (!c.lower) return 'auth.passwordPolicy.errorLower'
  if (!c.digit) return 'auth.passwordPolicy.errorDigit'
  return null
}
