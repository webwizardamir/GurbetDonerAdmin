-- ============================================================================
-- 00043: Backfill product_code for products that existed before 00042
-- ============================================================================
-- Migration 00042 added `product_code` and an INSERT trigger that assigns
-- MHF-NNNNN to new rows. Existing rows kept product_code = NULL, which is
-- why the Products page shows an empty ID column for legacy data.
--
-- This migration fills every NULL value with the next sequence number,
-- ordered oldest-first so that the lowest IDs go to the oldest products.
--
-- Safe to re-run: only updates rows where product_code IS NULL.
-- ============================================================================

WITH ordered AS (
  SELECT id
  FROM products
  WHERE product_code IS NULL
  ORDER BY created_at ASC, id ASC
)
UPDATE products p
SET product_code = 'MHF-' || lpad(nextval('product_code_seq')::text, 5, '0')
FROM ordered
WHERE p.id = ordered.id;

-- Sanity check (no rows should remain unfilled)
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining FROM products WHERE product_code IS NULL;
  IF remaining > 0 THEN
    RAISE WARNING 'Backfill left % products with NULL product_code', remaining;
  END IF;
END $$;
