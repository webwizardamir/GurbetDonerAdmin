-- ============================================================================
-- 00097  Close four legacy RLS holes surfaced by the 00095/00096 security review
-- ============================================================================
--
-- All four are PRE-EXISTING (none introduced by the hidden-orders work) and all
-- four are the same defect class 00095 fixed for order_refunds: a `USING (true)`
-- SELECT policy left over from before 00035.
--
-- 🚨 THE TWO TENANTS WERE NOT EQUALLY EXPOSED — do not assume symmetry.
-- Gurbet was rebuilt from the repo migrations and already carried the correct
-- 00035-lineage `rls_*_admin_select` policies, so sections 1-2 were a live leak
-- on **Melek only**. This file is still applied to BOTH (and was): every
-- statement is IF EXISTS-guarded and idempotent, section 3 adds a hidden-order
-- gate Gurbet also lacked, and section 4 (get_customer_orders) was ungated on
-- both. Applied 2026-07-26 to pnimvwconhhmcwxcuxcz and dvpnvulxkccurqkpqqnx.
--
-- Verified before writing this: neither apps/web (which does not touch Supabase
-- at all) nor the customer portal nor any edge function reads
-- product_unit_prices or customer_prices, so locking them to is_admin_user()
-- breaks no read path. The admin app reads them as authenticated staff.
--
-- ---------------------------------------------------------------------------
-- 1. product_unit_prices — COGS was readable by `anon`   [CRITICAL, Melek only]
-- ---------------------------------------------------------------------------
-- `product_unit_prices_select_all` was FOR SELECT TO public USING (true).
-- `public` includes `anon`, and the anon key ships in the client bundle — so
-- 372 rows of product cost_cents were readable by anyone on the internet.
-- This is the exact table migration 00070 exists to protect.
--
-- Only the SELECT policy is replaced. The owner/manager-split write policies
-- are deliberately left alone: they encode the "shop_manager may only write
-- cost_cents IS NULL" rule from 00033, and rewriting them here would risk
-- silently dropping that restriction for no security gain (they are per-command
-- INSERT/UPDATE/DELETE policies, so none of them grants SELECT).
DROP POLICY IF EXISTS product_unit_prices_select_all ON product_unit_prices;
DROP POLICY IF EXISTS rls_product_unit_prices_admin_select ON product_unit_prices;
CREATE POLICY rls_product_unit_prices_admin_select ON product_unit_prices
  FOR SELECT TO authenticated USING (is_admin_user());

-- ---------------------------------------------------------------------------
-- 2. customer_prices — every customer's negotiated prices      [Melek only]
-- ---------------------------------------------------------------------------
-- USING (true) for `authenticated`, which includes portal customers: any
-- logged-in customer could read all 42 rows, i.e. every OTHER customer's
-- negotiated per-product pricing. Same shape as the cross-customer leak 00071
-- closed on orders.
DROP POLICY IF EXISTS "Users can view customer prices" ON customer_prices;
DROP POLICY IF EXISTS rls_customer_prices_admin_select ON customer_prices;
CREATE POLICY rls_customer_prices_admin_select ON customer_prices
  FOR SELECT TO authenticated USING (is_admin_user());

-- ---------------------------------------------------------------------------
-- 3. order_discounts / order_fees — ungated CHILDREN of orders  [Melek only]
-- ---------------------------------------------------------------------------
-- USING (true) for authenticated. Both are empty and unused today (the live app
-- uses orders.discount / orders.delivery_fee), so nothing leaks right now — but
-- they carry order_id + amount, so the moment either is used they would expose
-- a hidden order's amounts to a shop manager AND to portal customers. This is
-- precisely the "another table hanging off orders" case 00095 warns about, so
-- they get both the admin guard and the hidden-order gate.
DROP POLICY IF EXISTS "Users can view order discounts" ON order_discounts;
DROP POLICY IF EXISTS rls_order_discounts_admin_select ON order_discounts;
CREATE POLICY rls_order_discounts_admin_select ON order_discounts
  FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_discounts.order_id)));

DROP POLICY IF EXISTS "Users can view order fees" ON order_fees;
DROP POLICY IF EXISTS rls_order_fees_admin_select ON order_fees;
CREATE POLICY rls_order_fees_admin_select ON order_fees
  FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_fees.order_id)));

-- Deliberately NOT touched: the legacy `invoices` table. It is empty and unused,
-- and its policy shape differs between the two tenants (Melek: one FOR ALL with
-- a staff role check, which excludes portal customers, so it does not leak;
-- Gurbet: a proper split including a customer-scoped policy). Rewriting it would
-- add risk for no gain. Drop the table when someone confirms it is dead.

-- ---------------------------------------------------------------------------
-- 4. get_customer_orders — ungated COGS                        [BOTH databases]
-- ---------------------------------------------------------------------------
-- `total_cost` was returned raw while `profit` and `profit_margin` beside it are
-- is_owner()-gated. The function's only guard is is_admin_user(), which a shop
-- manager passes — and since `subtotal` is returned in the same row, margin was
-- trivially derivable, recovering exactly the number the profit gate withholds.
--
-- Pre-existing since 00069 (00070 never touched this function), and carried
-- forward by 00095's "copy the live body verbatim" rule. It violates the project
-- invariant "gate cost in the RPC, not just the UI". The UI already gates the
-- column behind isOwner, so this is visually a no-op for both roles.
CREATE OR REPLACE FUNCTION public.get_customer_orders(p_customer_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(order_id uuid, order_number text, order_date date, status text, subtotal bigint, total_cost bigint, profit bigint, profit_margin numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;
  RETURN QUERY
  WITH sold AS (
    SELECT o.id AS order_id, o.order_number, o.order_date, o.status::text AS status,
      o.subtotal::bigint AS subtotal_gross,
      COALESCE(SUM(oi.cost_cents * oi.quantity), 0)::bigint AS cogs
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY o.id, o.order_number, o.order_date, o.status, o.subtotal
  ),
  refunded AS (
    SELECT r.order_id, SUM(ori.amount)::bigint AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o        ON o.id = r.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY r.order_id
  )
  SELECT s.order_id, s.order_number, s.order_date, s.status,
    (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))::bigint,
    -- COGS is owner-only, like the profit columns below it.
    CASE WHEN is_owner() THEN s.cogs ELSE NULL::bigint END,
    CASE WHEN is_owner()
      THEN (s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint END,
    CASE WHEN is_owner() AND (s.subtotal_gross - COALESCE(rf.amount_refunded, 0)) > 0
      THEN ROUND(((s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::numeric
            / (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))) * 100, 1)
      ELSE NULL::numeric END
  FROM sold s
  LEFT JOIN refunded rf ON rf.order_id = s.order_id
  ORDER BY s.order_date DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_customer_orders(uuid, date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_customer_orders(uuid, date, date) TO authenticated;
