-- ============================================================================
-- 00057: Invoice due-date + paid-at on orders (reminder-system foundation)
-- ============================================================================
-- The reminder system needs an INDEXABLE "outstanding & overdue" set. Today the
-- due date is computed client-side in src/services/documents.ts at the moment an
-- invoice is generated (order_date + COALESCE(customer.payment_due_days,
-- document_settings.payment_terms_days, 14)) and is never stored, and "paid" is
-- only inferred from order status. This migration persists both:
--
--   * orders.invoice_due_date  — derived due date (order_date + effective terms)
--   * orders.invoice_paid_at   — stamped when the order becomes 'completed'
--                                (= PAID, whether by bank or cash) and cleared
--                                if it ever leaves 'completed'.
--
-- A BEFORE trigger keeps invoice_due_date in sync and is the source of truth so
-- the value is correct even for SQL/imported status changes — not only the app.
-- The formula MUST stay in parity with documents.ts (buildInvoiceData, ~line 468).
--
-- "Outstanding invoice" (chased by the queue/cron) is then:
--   invoice_due_date < CURRENT_DATE
--   AND status NOT IN ('completed','cancelled','refunded')
--   AND an invoice document exists for the order  (checked in the RPC, 00060)
--
-- Safe to re-run.
-- ============================================================================

-- 1. Columns ----------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_due_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_paid_at  TIMESTAMPTZ;

COMMENT ON COLUMN orders.invoice_due_date IS
  'Derived: order_date + COALESCE(customer.payment_due_days, document_settings.payment_terms_days, 14). Kept in sync by trg_orders_invoice_due_paid. Source of truth for overdue detection.';
COMMENT ON COLUMN orders.invoice_paid_at IS
  'Stamped when status becomes completed (= paid, bank or cash); cleared if it leaves completed. Drives "paid => stop reminders".';

-- 2. Sync trigger -----------------------------------------------------------
-- Computes the due date and maintains the paid stamp. Mirrors documents.ts.
CREATE OR REPLACE FUNCTION set_invoice_due_and_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_global_days  INTEGER;
  v_cust_days    INTEGER;
  v_eff_days     INTEGER;
  v_base_date    DATE;
BEGIN
  -- Recompute due date on insert, or when order_date changes, or when it is
  -- still NULL (backfill / first invoice). Customer-term changes are NOT
  -- retro-applied here on purpose (invoice terms are a snapshot at sale).
  IF TG_OP = 'INSERT'
     OR NEW.invoice_due_date IS NULL
     OR NEW.order_date IS DISTINCT FROM OLD.order_date THEN

    SELECT COALESCE(payment_terms_days, 14) INTO v_global_days
    FROM public.document_settings
    LIMIT 1;
    v_global_days := COALESCE(v_global_days, 14);

    SELECT payment_due_days INTO v_cust_days
    FROM public.customers WHERE id = NEW.customer_id;

    v_eff_days  := COALESCE(v_cust_days, v_global_days);
    v_base_date := COALESCE(NEW.order_date, NEW.created_at::date, CURRENT_DATE);
    NEW.invoice_due_date := v_base_date + (v_eff_days || ' days')::interval;
  END IF;

  -- Paid stamp follows the 'completed' status (idempotent).
  IF NEW.status = 'completed' THEN
    IF NEW.invoice_paid_at IS NULL THEN
      NEW.invoice_paid_at := NOW();
    END IF;
  ELSE
    NEW.invoice_paid_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_invoice_due_paid ON orders;
CREATE TRIGGER trg_orders_invoice_due_paid
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_due_and_paid();

-- 3. Backfill existing rows -------------------------------------------------
UPDATE orders o
SET
  invoice_due_date = COALESCE(o.order_date, o.created_at::date, CURRENT_DATE)
                     + (COALESCE(c.payment_due_days, cfg.global_days) || ' days')::interval,
  invoice_paid_at  = CASE WHEN o.status = 'completed'
                          THEN COALESCE(o.invoice_paid_at, o.updated_at, o.created_at)
                          ELSE NULL END
FROM customers c
CROSS JOIN (
  SELECT COALESCE((SELECT payment_terms_days FROM document_settings LIMIT 1), 14) AS global_days
) cfg
WHERE c.id = o.customer_id;

-- 4. Partial index for the overdue scan ------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_overdue
  ON orders(invoice_due_date)
  WHERE status NOT IN ('completed', 'cancelled', 'refunded');
