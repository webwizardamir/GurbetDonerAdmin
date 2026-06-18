-- ============================================================================
-- 00060: Overdue-invoice work-queue RPCs
-- ============================================================================
-- Single source of truth for "which invoices are overdue and need chasing",
-- used by both the Overdue work-queue page and the dashboard widget. Also the
-- snooze/dismiss mutators. All SECURITY DEFINER + is_admin_user() guarded so a
-- shop_manager can work the queue (settings stay owner-only at the UI layer).
--
-- An invoice is "overdue / outstanding" when:
--   * an invoice document exists for the order, AND
--   * orders.invoice_due_date < CURRENT_DATE, AND
--   * status NOT IN ('completed','cancelled','refunded')   (completed = paid), AND
--   * neither the customer nor the order has opted out.
--
-- Snoozed invoices are still returned (with snoozed_until set) so the UI can
-- show a "snoozed" filter; the client treats snoozed_until > now() as hidden
-- from the active queue.
--
-- Safe to re-run.
-- ============================================================================

-- reminders_sent / last_reminder_at are counted from document_sends so that BOTH
-- manual sends (via the Send dialog) and automated sends (via the edge function)
-- advance the schedule uniformly — both log a 'payment_reminder' send there.
CREATE OR REPLACE FUNCTION get_overdue_invoices()
RETURNS TABLE (
  order_id         UUID,
  order_number     TEXT,
  customer_id      UUID,
  customer_name    TEXT,
  customer_email   TEXT,
  total            INTEGER,
  invoice_due_date DATE,
  days_overdue     INTEGER,
  invoice_number   TEXT,
  reminders_sent   INTEGER,
  last_reminder_at TIMESTAMPTZ,
  snoozed_until    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    c.id,
    c.company_name,
    c.email,
    o.total,
    o.invoice_due_date,
    (CURRENT_DATE - o.invoice_due_date)::INTEGER         AS days_overdue,
    inv.document_number                                   AS invoice_number,
    COALESCE(r.cnt, 0)::INTEGER                           AS reminders_sent,
    r.last_reminder_at,
    st.snoozed_until
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  -- latest invoice document for the order (must exist)
  JOIN LATERAL (
    SELECT d.document_number
    FROM documents d
    WHERE d.order_id = o.id AND d.document_type = 'invoice'
    ORDER BY d.generated_at DESC NULLS LAST
    LIMIT 1
  ) inv ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)            AS cnt,
           MAX(ds.created_at)  AS last_reminder_at
    FROM document_sends ds
    WHERE ds.order_id = o.id
      AND ds.document_type = 'payment_reminder'
      AND ds.status = 'sent'
  ) r ON TRUE
  LEFT JOIN invoice_reminder_state st ON st.order_id = o.id
  WHERE o.invoice_due_date < CURRENT_DATE
    AND o.status NOT IN ('completed', 'cancelled', 'refunded')
    AND o.reminders_opted_out = false
    AND c.reminders_opted_out = false
  ORDER BY o.invoice_due_date ASC;
END;
$$;

REVOKE ALL ON FUNCTION get_overdue_invoices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_overdue_invoices() TO authenticated;

-- Snooze an invoice's queue presence until a given moment ------------------
CREATE OR REPLACE FUNCTION snooze_invoice_reminder(p_order_id UUID, p_until TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO invoice_reminder_state (order_id, snoozed_until, updated_by, updated_at)
  VALUES (p_order_id, p_until, auth.uid(), NOW())
  ON CONFLICT (order_id)
  DO UPDATE SET snoozed_until = EXCLUDED.snoozed_until,
                updated_by    = auth.uid(),
                updated_at    = NOW();
END;
$$;

REVOKE ALL ON FUNCTION snooze_invoice_reminder(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION snooze_invoice_reminder(UUID, TIMESTAMPTZ) TO authenticated;

-- Clear a snooze (bring the invoice back to the active queue now) -----------
CREATE OR REPLACE FUNCTION clear_invoice_reminder_snooze(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM invoice_reminder_state WHERE order_id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION clear_invoice_reminder_snooze(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clear_invoice_reminder_snooze(UUID) TO authenticated;
