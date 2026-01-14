-- Add email column to customer_accounts to store portal login email
ALTER TABLE customer_accounts
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);

-- Comment for documentation
COMMENT ON COLUMN customer_accounts.email IS 'Portal login email for this customer account';
