-- ============================================================================
-- 00096  Close the gaps 00095 left in "hide orders from shop managers"
-- ============================================================================
--
-- Found by an adversarial review of 00095, verified by impersonating a real
-- shop_manager against live data. Two findings that chain into one exploit, plus
-- two integrity holes.
--
-- ---------------------------------------------------------------------------
-- THE CHAIN (a shop manager could permanently delete an owner-only order)
--
--   1. invoice_reminders / invoice_reminder_state carry `order_id` and were NOT
--      gated by 00095 — their SELECT is bare is_admin_user(). The reminder cron
--      runs on the service role and correctly keeps dunning hidden orders (the
--      customer still owes the money), writing a row keyed on the hidden
--      order_id. So the manager reads the UUID of an order they cannot see,
--      plus its dunning timeline.
--
--   2. trash_order / restore_order / purge_order are SECURITY DEFINER guarded
--      only by is_admin_user(). 00095 left them alone on the stated reasoning
--      that they are "owner actions on a row the caller already reached" —
--      that premise is WRONG. The argument is a bare uuid and the function
--      bypasses RLS, so nothing requires the caller to have reached anything.
--
--   Chain: read order_id from invoice_reminders -> order_is_hidden(id) confirms
--   it -> purge_order(id) hard-deletes it and its items. Silent, and invisible
--   to the manager before and after.
--
--   Note 00095 DID fix exactly this class for the bulk empty_order_trash
--   (its defect #4) and simply missed the three singular RPCs.
--
-- ---------------------------------------------------------------------------
-- ALSO CLOSED HERE (integrity, not disclosure — blind writes that succeeded):
--   * documents INSERT had no hidden predicate, so a manager could attach a
--     fabricated document row to a hidden order, burning or colliding an
--     invoice number they cannot see. 00095 assumed "a new document is always
--     for an order the actor can already see"; nothing enforced it.
--   * invoice_reminder_state INSERT/UPDATE likewise, letting a manager silently
--     snooze dunning on a hidden invoice.
--
-- create_order_refund keeps its is_admin_user()-only guard but gains the
-- predicate for symmetry; it was already effectively unreachable (it needs an
-- order_item_id, and order_items for a hidden order return no rows).
--
-- APPLY TO BOTH DATABASES: pnimvwconhhmcwxcuxcz + dvpnvulxkccurqkpqqnx.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. invoice_reminders / invoice_reminder_state — gate on the parent order
-- ---------------------------------------------------------------------------
-- Mirrors the document_sends policy from 00095. Also re-scoped {public} ->
-- {authenticated}; a tightening with no live effect, since anon fails
-- is_admin_user() anyway.
DROP POLICY IF EXISTS "Admins view invoice reminders" ON invoice_reminders;
CREATE POLICY "Admins view invoice reminders" ON invoice_reminders FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminders.order_id)));

DROP POLICY IF EXISTS "Admins insert invoice reminders" ON invoice_reminders;
CREATE POLICY "Admins insert invoice reminders" ON invoice_reminders FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminders.order_id)));

DROP POLICY IF EXISTS "Admins update invoice reminders" ON invoice_reminders;
CREATE POLICY "Admins update invoice reminders" ON invoice_reminders FOR UPDATE TO authenticated
  USING      (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminders.order_id)))
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminders.order_id)));

DROP POLICY IF EXISTS "Admins view reminder state" ON invoice_reminder_state;
CREATE POLICY "Admins view reminder state" ON invoice_reminder_state FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminder_state.order_id)));

DROP POLICY IF EXISTS "Admins insert reminder state" ON invoice_reminder_state;
CREATE POLICY "Admins insert reminder state" ON invoice_reminder_state FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminder_state.order_id)));

DROP POLICY IF EXISTS "Admins update reminder state" ON invoice_reminder_state;
CREATE POLICY "Admins update reminder state" ON invoice_reminder_state FOR UPDATE TO authenticated
  USING      (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminder_state.order_id)))
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(invoice_reminder_state.order_id)));

-- ---------------------------------------------------------------------------
-- 2. documents INSERT — a manager must not attach a document to a hidden order
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS documents_insert           ON documents;
DROP POLICY IF EXISTS rls_documents_admin_insert ON documents;
CREATE POLICY documents_insert ON documents FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(documents.order_id)));

-- ---------------------------------------------------------------------------
-- 3. The three targeted trash RPCs
-- ---------------------------------------------------------------------------
-- The predicate goes on the row lookup, so the existing IF NOT FOUND / IS NULL
-- paths raise the same generic error a missing order already produces — a
-- manager cannot tell "hidden" from "does not exist".
CREATE OR REPLACE FUNCTION public.trash_order(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_status order_status;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status FROM orders
   WHERE id = p_id AND deleted_at IS NULL
     AND (NOT hidden_from_managers OR is_owner())
   FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found or already trashed';
  END IF;
  IF v_status NOT IN ('draft','pending','pending_payment','on_hold','cancelled') THEN
    RAISE EXCEPTION 'Only draft / pending / on-hold / cancelled orders can be trashed';
  END IF;

  -- status -> cancelled fires handle_order_status_change (restores stock). For an
  -- already-cancelled order this is a no-op (OLD = NEW = 'cancelled'), so stock
  -- is left untouched (it was already restored when the order was cancelled).
  UPDATE orders
  SET pre_trash_status = v_status,
      status = 'cancelled',
      deleted_at = now()
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_order(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pre order_status;
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT pre_trash_status INTO v_pre FROM orders
   WHERE id = p_id AND deleted_at IS NOT NULL
     AND (NOT hidden_from_managers OR is_owner())
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in trash'; END IF;
  UPDATE orders SET status = COALESCE(v_pre, 'draft'), pre_trash_status = NULL, deleted_at = NULL WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_order(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pre order_status;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT pre_trash_status INTO v_pre FROM orders
   WHERE id = p_id AND deleted_at IS NOT NULL
     AND (NOT hidden_from_managers OR is_owner())
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found in trash';
  END IF;

  -- The trashed order is currently 'cancelled' (stock restored). Re-deduct by
  -- leaving 'cancelled' via a NON-cancelled status, then hard delete (cascade
  -- order_items-delete restores) -> net zero. If pre_trash was itself
  -- 'cancelled', substitute 'draft' so the re-deduct actually fires.
  UPDATE orders
  SET status = CASE WHEN COALESCE(v_pre, 'draft') = 'cancelled' THEN 'draft'::order_status
                    ELSE COALESCE(v_pre, 'draft') END
  WHERE id = p_id;
  DELETE FROM orders WHERE id = p_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Grants (recreating a SECURITY DEFINER fn re-grants anon via Supabase
--    default privileges — see 00070/00095)
-- ---------------------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('trash_order','restore_order','purge_order')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;
