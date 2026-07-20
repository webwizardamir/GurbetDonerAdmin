-- Customer soft-delete (archive) support.
--
-- Problem 1 — deletion impossible: deleteCustomer did a HARD delete, but
-- orders.customer_id is ON DELETE NO ACTION, so any customer with at least one
-- order raised a foreign-key violation (109 of 253 customers). Customers are now
-- ARCHIVED (soft-deleted) instead, preserving order/invoice history — required by
-- Dutch 7-year retention — exactly like the Orders trash pattern.
--
-- Problem 2 — email reuse blocked: the email unique index spanned ALL customers,
-- so an archived customer's email blocked creating a NEW customer with the same
-- email. The index is rewritten to apply to ACTIVE customers only, so archiving a
-- customer frees their email for reuse by a new active customer.

-- 1) is_active becomes the archive flag: NOT NULL, default true.
ALTER TABLE public.customers ALTER COLUMN is_active SET DEFAULT true;
UPDATE public.customers SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.customers ALTER COLUMN is_active SET NOT NULL;

-- 2) When the customer was archived (NULL = active).
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 3) Email uniqueness (case-insensitive) applies to ACTIVE customers only.
--    Archived customers are excluded, so their email can be reused.
DROP INDEX IF EXISTS idx_customers_email_unique;
CREATE UNIQUE INDEX idx_customers_email_unique
  ON public.customers (lower(email))
  WHERE email IS NOT NULL AND email <> '' AND is_active;

-- 4) Fast active/archived filtering for the list + trash view.
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers (is_active);
