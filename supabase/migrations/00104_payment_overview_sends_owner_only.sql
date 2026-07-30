-- 00104: hide Betaaloverzicht mails from Shop Managers in the Outbox
--
-- THE HOLE: 00095 gates `document_sends` with
--   is_admin_user() AND (is_owner() OR NOT order_is_hidden(order_id))
-- and `order_is_hidden()` returns FALSE for a NULL order_id (it COALESCEs a
-- missing row to "not hidden"). A payment_overview row has order_id NULL by
-- design — a statement spans many orders and belongs to none — so it sailed
-- straight through the gate and was readable by a Shop Manager in /outbox.
--
-- WHY THAT MATTERS: the statement's stored `body` carries the customer's TOTAL
-- OUTSTANDING, and that total INCLUDES orders flagged hidden_from_managers. A
-- manager can see every non-hidden order's amount in the Orders list, so the
-- hidden amount is one subtraction away — exactly the disclosure 00095 exists
-- to prevent. The tab, the RPCs and payment_overviews itself were already
-- owner-only; this was the one surface left open.
--
-- The whole policy is REPLACED, not added to: RLS policies are OR'd, so leaving
-- the old permissive one in place would defeat the new predicate entirely.

DROP POLICY IF EXISTS "Admins view document sends" ON public.document_sends;

CREATE POLICY "Admins view document sends" ON public.document_sends
  FOR SELECT
  USING (
    is_admin_user()
    AND (
      (SELECT is_owner())
      -- A statement is owner-only regardless of order_id; every other type keeps
      -- the 00095 per-order rule verbatim.
      OR (document_type <> 'payment_overview' AND NOT order_is_hidden(order_id))
    )
  );

-- Post-apply assertion (BOTH databases) — impersonate a real shop_manager in a
-- rolled-back transaction and confirm zero statement rows are visible:
--   BEGIN;
--     SET LOCAL role authenticated;
--     SET LOCAL request.jwt.claims TO '{"sub":"<shop_manager profile id>","role":"authenticated"}';
--     SELECT count(*) FROM document_sends WHERE document_type = 'payment_overview'; -- expect 0
--   ROLLBACK;
