-- Add unique constraint on customer email (case-insensitive)
-- Clean up any duplicates first, then add the constraint

-- Clean up duplicates (keep the one with better formatted name)
-- This is idempotent - will do nothing if no duplicates exist
WITH duplicates AS (
  SELECT id, email, company_name,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(email)
      ORDER BY
        CASE WHEN company_name LIKE '% %' THEN 0 ELSE 1 END,
        LENGTH(company_name) DESC,
        created_at ASC
    ) as rn
  FROM customers
  WHERE email IS NOT NULL AND email != ''
)
DELETE FROM customers
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique index (only applies to non-null, non-empty emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique
ON customers (LOWER(email))
WHERE email IS NOT NULL AND email != '';
