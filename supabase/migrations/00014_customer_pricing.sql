-- =====================================================
-- Phase 4: Customer-Specific Pricing
-- =====================================================

-- Customer prices table - stores custom prices per customer/product
CREATE TABLE IF NOT EXISTS customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  custom_price INTEGER NOT NULL, -- cents

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, product_id)
);

-- Price history table - tracks all price changes
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_price_id UUID REFERENCES customer_prices(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product ON customer_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_customer_price ON price_history(customer_price_id);

-- Enable RLS
ALTER TABLE customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_prices
CREATE POLICY "Users can view customer prices"
  ON customer_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create customer prices"
  ON customer_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update customer prices"
  ON customer_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete customer prices"
  ON customer_prices FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for price_history (read-only for most, append-only)
CREATE POLICY "Users can view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_prices_updated_at ON customer_prices;
CREATE TRIGGER customer_prices_updated_at
  BEFORE UPDATE ON customer_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_prices_updated_at();

-- Trigger to auto-log price changes to history
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO price_history (customer_price_id, old_price, new_price, changed_by)
    VALUES (NEW.id, NULL, NEW.custom_price, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND OLD.custom_price != NEW.custom_price THEN
    INSERT INTO price_history (customer_price_id, old_price, new_price, changed_by)
    VALUES (NEW.id, OLD.custom_price, NEW.custom_price, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_prices_log_change ON customer_prices;
CREATE TRIGGER customer_prices_log_change
  AFTER INSERT OR UPDATE ON customer_prices
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- Function to get effective price for a customer/product
-- Returns customer price if exists, otherwise base price
CREATE OR REPLACE FUNCTION get_effective_price(p_customer_id UUID, p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_custom_price INTEGER;
  v_base_price INTEGER;
BEGIN
  -- Try to get customer-specific price
  SELECT custom_price INTO v_custom_price
  FROM customer_prices
  WHERE customer_id = p_customer_id AND product_id = p_product_id;

  IF v_custom_price IS NOT NULL THEN
    RETURN v_custom_price;
  END IF;

  -- Fall back to base price
  SELECT base_price INTO v_base_price
  FROM products
  WHERE id = p_product_id;

  RETURN COALESCE(v_base_price, 0);
END;
$$ LANGUAGE plpgsql;
