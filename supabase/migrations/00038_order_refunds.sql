-- Order refunds — mirrors the WooCommerce model where refunds are separate
-- records with their own line items, and the parent order's total stays
-- unchanged (pre-refund). Net revenue = orders.total − SUM(order_refunds.amount).

CREATE TABLE IF NOT EXISTS order_refunds (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  woo_refund_id           INTEGER UNIQUE,           -- WC refund post ID (dedup key for re-runs)
  woo_credit_note_number  INTEGER,                  -- WP Overnight credit note number
  refund_date             TIMESTAMPTZ NOT NULL,
  amount                  INTEGER NOT NULL,         -- cents, positive
  reason                  TEXT,
  created_by              UUID REFERENCES profiles(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON order_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_date  ON order_refunds(refund_date);

COMMENT ON TABLE order_refunds IS 'One row per refund event. Parent order.total is NOT adjusted; analytics should subtract SUM(amount).';

CREATE TABLE IF NOT EXISTS order_refund_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id          UUID NOT NULL REFERENCES order_refunds(id) ON DELETE CASCADE,
  order_item_id      UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id         UUID REFERENCES products(id),
  product_name       TEXT NOT NULL,                 -- snapshot, for display when order_item/product was deleted
  product_sku        TEXT,
  quantity           DECIMAL(10,3) NOT NULL,        -- positive (units refunded)
  amount             INTEGER NOT NULL,              -- cents, positive (subtotal of this refund line)
  tax_amount         INTEGER NOT NULL DEFAULT 0,    -- cents
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_refund_items_refund      ON order_refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_order_refund_items_order_item  ON order_refund_items(order_item_id);

-- RLS: follow the same pattern as orders/order_items (owner + shop manager can read/write)
ALTER TABLE order_refunds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_refund_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (matches orders_select policy)
DROP POLICY IF EXISTS order_refunds_select      ON order_refunds;
DROP POLICY IF EXISTS order_refund_items_select ON order_refund_items;
CREATE POLICY order_refunds_select      ON order_refunds      FOR SELECT TO authenticated USING (true);
CREATE POLICY order_refund_items_select ON order_refund_items FOR SELECT TO authenticated USING (true);

-- Only owner/manager can write (service_role bypasses RLS)
DROP POLICY IF EXISTS order_refunds_write      ON order_refunds;
DROP POLICY IF EXISTS order_refund_items_write ON order_refund_items;
CREATE POLICY order_refunds_write ON order_refunds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('owner','shop_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('owner','shop_manager')));
CREATE POLICY order_refund_items_write ON order_refund_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('owner','shop_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('owner','shop_manager')));

-- Attach audit triggers (consistent with other tables in migration 00028)
DROP TRIGGER IF EXISTS audit_order_refunds      ON order_refunds;
DROP TRIGGER IF EXISTS audit_order_refund_items ON order_refund_items;
CREATE TRIGGER audit_order_refunds      AFTER INSERT OR UPDATE OR DELETE ON order_refunds      FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_order_refund_items AFTER INSERT OR UPDATE OR DELETE ON order_refund_items FOR EACH ROW EXECUTE FUNCTION log_audit_event();
