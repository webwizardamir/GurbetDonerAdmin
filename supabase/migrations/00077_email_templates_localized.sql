-- ============================================================================
-- 00077: Localize email templates by language
-- ============================================================================
-- Customers outside NL + BE now receive English emails/reminders (and English
-- PDF documents). The email template store on the document_settings singleton
-- moves from a FLAT map { <type>: {subject, body} } to a LANGUAGE-NESTED map
-- { "nl": { ... }, "en": { ... } }. Existing (Dutch) templates are wrapped
-- under "nl"; "en" starts empty and falls back to built-in English defaults
-- until the owner customizes them in Settings → Email / Reminders (NL/EN tabs).
--
-- The app + edge function both tolerate the legacy flat shape (treated as NL),
-- so this migration is a convenience/normalization step and is idempotent.
-- Safe to re-run.
-- ============================================================================

UPDATE document_settings
SET email_templates = jsonb_build_object('nl', COALESCE(email_templates, '{}'::jsonb), 'en', '{}'::jsonb)
WHERE email_templates IS NULL
   OR NOT (email_templates ? 'nl' OR email_templates ? 'en');

COMMENT ON COLUMN document_settings.email_templates IS
  'Language-nested map { nl: {type:{subject,body}}, en: {...} } with {{placeholder}} support. Legacy flat maps are treated as the nl bucket.';
