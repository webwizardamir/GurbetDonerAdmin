-- 00091_customer_type.sql
-- Admin-only customer classification: horeca | supermarkt | other.
-- NULL means: untagged (existing rows stay NULL, no backfill).
-- Never shown on customer-facing documents (invoices/proforma/portal).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type TEXT
  CHECK (customer_type IN ('horeca','supermarkt','other'));

COMMENT ON COLUMN customers.customer_type IS
  'Admin-only classification: horeca | supermarkt | other. NULL = untagged. Never on customer-facing documents.';
