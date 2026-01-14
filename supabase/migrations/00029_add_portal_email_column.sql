-- Add email column to customer_accounts to store portal login email
ALTER TABLE customer_accounts
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);

-- Comment for documentation
COMMENT ON COLUMN customer_accounts.email IS 'Portal login email for this customer account';

-- Backfill email from auth.users for existing accounts
UPDATE customer_accounts ca
SET email = u.email
FROM auth.users u
WHERE ca.user_id = u.id
AND ca.email IS NULL;

-- Allow customers to update their own last_login_at (fixes login tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customer_accounts'
    AND policyname = 'Customers can update own last_login'
  ) THEN
    CREATE POLICY "Customers can update own last_login"
    ON customer_accounts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
