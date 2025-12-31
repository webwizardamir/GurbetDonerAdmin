-- =====================================================
-- Fix Orders Schema - Add missing columns
-- =====================================================

-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure customer_id column exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add missing columns to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,3);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create order_discounts if not exists
CREATE TABLE IF NOT EXISTS order_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  applied_to_item_id UUID
);

-- Create order_fees if not exists
CREATE TABLE IF NOT EXISTS order_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL
);

-- Indexes (ignore if they fail)
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

-- RLS Policies for orders (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

CREATE POLICY "Users can view orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete orders" ON orders FOR DELETE TO authenticated USING (true);

-- RLS Policies for order_items
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;

CREATE POLICY "Users can view order items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create order items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update order items" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete order items" ON order_items FOR DELETE TO authenticated USING (true);

-- RLS Policies for order_discounts
DROP POLICY IF EXISTS "Users can view order discounts" ON order_discounts;
DROP POLICY IF EXISTS "Users can create order discounts" ON order_discounts;
DROP POLICY IF EXISTS "Users can delete order discounts" ON order_discounts;

CREATE POLICY "Users can view order discounts" ON order_discounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create order discounts" ON order_discounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete order discounts" ON order_discounts FOR DELETE TO authenticated USING (true);

-- RLS Policies for order_fees
DROP POLICY IF EXISTS "Users can view order fees" ON order_fees;
DROP POLICY IF EXISTS "Users can create order fees" ON order_fees;
DROP POLICY IF EXISTS "Users can delete order fees" ON order_fees;

CREATE POLICY "Users can view order fees" ON order_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create order fees" ON order_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete order fees" ON order_fees FOR DELETE TO authenticated USING (true);

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

-- Trigger for updated_at
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

-- Stock deduction trigger
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
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

-- Stock restoration trigger
CREATE OR REPLACE FUNCTION restore_stock_on_delete()
RETURNS TRIGGER AS $$
BEGIN
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

-- Status change trigger for stock
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'refunded') AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'refunded')) THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

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
