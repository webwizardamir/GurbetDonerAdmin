-- =====================================================
-- Phase 5: Orders
-- =====================================================

-- Create order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'draft',
    'pending_payment',
    'on_hold',
    'cancelled',
    'refunded',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('bank', 'cash', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),

  status order_status NOT NULL DEFAULT 'draft',
  payment_method payment_method,

  -- All amounts in cents
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,

  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_date DATE,
  delivery_notes TEXT,
  internal_notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table (immutable snapshot at time of sale)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),

  -- Snapshot at time of sale (immutable)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  unit_type TEXT NOT NULL,

  quantity DECIMAL(10,3) NOT NULL,
  unit_price INTEGER NOT NULL, -- cents (price at sale)
  discount_amount INTEGER NOT NULL DEFAULT 0, -- cents
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount INTEGER NOT NULL, -- cents
  line_total INTEGER NOT NULL, -- cents

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order discounts table
CREATE TABLE IF NOT EXISTS order_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed_cart', 'fixed_product'
  description TEXT,
  amount INTEGER NOT NULL, -- cents or percentage (x100)
  applied_to_item_id UUID REFERENCES order_items(id)
);

-- Order fees table
CREATE TABLE IF NOT EXISTS order_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL, -- 'delivery', 'custom'
  description TEXT,
  amount INTEGER NOT NULL -- cents
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for order_items
CREATE POLICY "Users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for order_discounts
CREATE POLICY "Users can view order discounts"
  ON order_discounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create order discounts"
  ON order_discounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete order discounts"
  ON order_discounts FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for order_fees
CREATE POLICY "Users can view order fees"
  ON order_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create order fees"
  ON order_fees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete order fees"
  ON order_fees FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM orders
  WHERE order_number LIKE 'ORD-' || v_year || '-%';

  v_number := 'ORD-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct stock when order is created
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct stock if product tracks stock
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id
    AND track_stock = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_deduct_stock ON order_items;
CREATE TRIGGER order_items_deduct_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION deduct_stock_on_order();

-- Function to restore stock when order item is deleted
CREATE OR REPLACE FUNCTION restore_stock_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore stock if product tracks stock
  UPDATE products
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE id = OLD.product_id
    AND track_stock = true;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_restore_stock ON order_items;
CREATE TRIGGER order_items_restore_stock
  BEFORE DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_delete();

-- Function to restore stock when order is cancelled or refunded
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to cancelled or refunded, restore stock
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

  -- When status changes FROM cancelled/refunded to something else, deduct stock again
  IF OLD.status IN ('cancelled', 'refunded') AND NEW.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_status_change ON orders;
CREATE TRIGGER orders_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_change();
