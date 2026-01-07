-- =====================================================
-- Migration: Customer Portal
-- =====================================================
-- Enables customers to log in and view their orders/documents
-- Separate from admin authentication

-- Step 1: Create customer_accounts table
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id),
  UNIQUE(user_id)
);

-- Step 2: Add index for faster lookups
CREATE INDEX idx_customer_accounts_user_id ON customer_accounts(user_id);
CREATE INDEX idx_customer_accounts_customer_id ON customer_accounts(customer_id);

-- Step 3: Create trigger for updated_at
CREATE TRIGGER update_customer_accounts_updated_at
  BEFORE UPDATE ON customer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Enable RLS on customer_accounts
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for customer_accounts
-- Admins can see all
CREATE POLICY "Admins can manage customer_accounts"
  ON customer_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'shop_manager')
    )
  );

-- Customers can only see their own account
CREATE POLICY "Customers can view own account"
  ON customer_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 6: RLS Policies for customers table (portal access)
-- Customers can view their own customer record
CREATE POLICY "Portal customers can view own record"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts
      WHERE customer_accounts.customer_id = customers.id
      AND customer_accounts.user_id = auth.uid()
      AND customer_accounts.is_active = true
    )
  );

-- Step 7: RLS Policies for orders table (portal access)
-- Customers can view their own orders
CREATE POLICY "Portal customers can view own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_accounts
      WHERE customer_accounts.customer_id = orders.customer_id
      AND customer_accounts.user_id = auth.uid()
      AND customer_accounts.is_active = true
    )
  );

-- Step 8: RLS Policies for order_items table (portal access)
-- Customers can view items from their own orders
CREATE POLICY "Portal customers can view own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN customer_accounts ON customer_accounts.customer_id = orders.customer_id
      WHERE orders.id = order_items.order_id
      AND customer_accounts.user_id = auth.uid()
      AND customer_accounts.is_active = true
    )
  );

-- Step 9: RLS Policies for documents table (portal access)
-- Customers can view documents from their own orders
CREATE POLICY "Portal customers can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN customer_accounts ON customer_accounts.customer_id = orders.customer_id
      WHERE orders.id = documents.order_id
      AND customer_accounts.user_id = auth.uid()
      AND customer_accounts.is_active = true
    )
  );

-- Step 10: Add comments
COMMENT ON TABLE customer_accounts IS 'Links customers to auth.users for portal access';
COMMENT ON COLUMN customer_accounts.customer_id IS 'The customer this account belongs to';
COMMENT ON COLUMN customer_accounts.user_id IS 'The auth.users id for login';
COMMENT ON COLUMN customer_accounts.is_active IS 'Whether portal access is enabled';
