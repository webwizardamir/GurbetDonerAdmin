-- 00053_customer_payment_due_days.sql
-- Per-customer payment term override for invoices.
-- NULL means: fall back to the global document_settings.payment_terms_days default.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS payment_due_days INTEGER;

COMMENT ON COLUMN customers.payment_due_days IS
  'Per-customer invoice payment term in days. NULL = use the global document_settings.payment_terms_days default (e.g. 7).';
