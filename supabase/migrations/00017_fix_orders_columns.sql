-- =====================================================
-- Fix Orders Schema - Align with Phase 5 requirements
-- =====================================================

-- Add missing values to order_status enum
DO $$
BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'on_hold';
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0;

-- Add integer cents columns alongside existing decimal columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cents INTEGER DEFAULT 0;

-- Ensure order_items has all required columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'piece';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total_cents INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make product_sku nullable (it was NOT NULL in original)
DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN product_sku DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop old triggers that may conflict
DROP TRIGGER IF EXISTS set_order_number ON orders;

-- Set default status to draft
DO $$
BEGIN
  ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'draft'::order_status;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create generate_order_number function (idempotent)
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

-- Stock deduction trigger (idempotent)
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

-- Stock restoration on delete trigger
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

-- Status change trigger for stock management
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::TEXT IN ('cancelled', 'refunded') AND (OLD.status IS NULL OR OLD.status::TEXT NOT IN ('cancelled', 'refunded')) THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

  IF OLD.status::TEXT IN ('cancelled', 'refunded') AND NEW.status::TEXT NOT IN ('cancelled', 'refunded') THEN
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
