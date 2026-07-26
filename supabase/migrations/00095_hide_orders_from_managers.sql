-- ============================================================================
-- 00095  Hide orders from Shop Managers  (owner-only per-order privacy flag)
-- ============================================================================
--
-- WHY
-- The business sometimes places very large orders whose amounts a Shop Manager
-- has no need to know. Until now every order was visible to all staff and its
-- money flowed into every total they could see (dashboard tiles, Sold Products,
-- the invoice list). This adds an owner-only `hidden_from_managers` flag.
--
-- ENFORCEMENT IS IN RLS, NOT THE UI.
-- The app also hides the row, but that is belt-and-braces. A shop manager must
-- not be able to reach the data with a hand-rolled PostgREST call either.
--
-- The customer portal is DELIBERATELY UNAFFECTED: the order is hidden from
-- staff, not from the customer who placed it. get_portal_* are SECURITY DEFINER
-- and are intentionally NOT gated here.
--
-- ACCEPTED LIMITATION (documented for the owner):
-- order_number and invoice numbers come from global sequences, so a hidden
-- order burns a number. A shop manager who sees 1041 and 1043 can infer that
-- 1042 exists. Stock also still moves. This flag hides AMOUNTS AND CONTENT,
-- not existence-by-arithmetic.
--
-- ----------------------------------------------------------------------------
-- THIS MIGRATION ALSO FIXES FOUR PRE-EXISTING SECURITY DEFECTS
-- found while auditing the functions it had to rewrite anyway. Each is a live
-- leak on Melek today, and each would additionally have defeated this feature.
--
--   1. order_refunds / order_refund_items SELECT policies were USING (true).
--      ANY authenticated user -- including a portal customer -- could read
--      every refund row in the system.
--
--   2. get_customer_items_summary on Melek had regressed to a pre-00070 body:
--      LANGUAGE sql, no is_admin_user() guard and no is_owner() profit gate.
--      Any authenticated user (again: including portal customers) could pass an
--      arbitrary customer id and read that customer's per-product revenue AND
--      profit. Gurbet still has the correct guarded version. Restored here.
--
--   3. get_inventory_turnover and get_slow_movers likewise had no admin guard
--      and no owner gate while returning cost/stock-value figures.
--
--   4. empty_order_trash had no owner gate, so after this feature a Shop
--      Manager clicking "Prullenbak legen" would permanently purge hidden
--      trashed orders they cannot see -- silent data loss.
--
-- ----------------------------------------------------------------------------
-- APPLY TO BOTH DATABASES (see MULTI-TENANT.md):
--   Melek  pnimvwconhhmcwxcuxcz
--   Gurbet dvpnvulxkccurqkpqqnx
-- Committing this file is NOT applying it, and the repo-root CLI is linked to
-- Melek, so always pass an explicit --project-ref.
--
-- The two databases carry DIFFERENT POLICY NAMES for the same policies (Melek
-- has the 00016-era names plus a legacy `orders_all` catch-all; Gurbet has the
-- 00035 `rls_*` names). Every DROP below is written defensively for both.
-- Function bodies were verified byte-identical (modulo comments/whitespace)
-- across the two databases before this was written, except
-- get_customer_items_summary as described above.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS hidden_from_managers boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.hidden_from_managers IS
  'Owner-only order. When true only is_owner() may see the row, its items, its '
  'documents, its email sends and its refunds, and its money is excluded from '
  'every aggregate a shop manager can reach. The customer portal is '
  'deliberately unaffected.';

-- Partial index: the hidden set is tiny and the visible set is ~100% of the
-- table, so only the "show me the hidden ones" direction is worth indexing.
-- Column order matches the Orders list sort (order_date DESC, created_at DESC).
CREATE INDEX IF NOT EXISTS idx_orders_hidden_from_managers
  ON orders (order_date DESC, created_at DESC)
  WHERE hidden_from_managers;

-- ---------------------------------------------------------------------------
-- 2. RLS: orders
-- ---------------------------------------------------------------------------
-- The whole policy set is replaced rather than patched, because policies are
-- OR'd: Melek's permissive `orders_all` (FOR ALL) and Gurbet's second
-- `rls_orders_admin_select` would each independently bypass the new predicate.
--
-- The canonical predicate, used verbatim everywhere so it is greppable:
--     (NOT hidden_from_managers OR (SELECT is_owner()))
-- The (SELECT ...) wrapper turns the VOLATILE is_owner() into an uncorrelated
-- scalar subquery, so the planner evaluates it ONCE per statement as an
-- InitPlan instead of once per row.
--
-- Dropping `orders_all` costs exactly one thing: it checked the role directly
-- while is_admin_user() also requires profiles.is_active. A DEACTIVATED staff
-- member currently retains full CRUD on orders and will lose it. There are zero
-- inactive staff rows today, so this is a strict security improvement with no
-- live effect.
DROP POLICY IF EXISTS orders_all                ON orders;   -- Melek legacy catch-all
DROP POLICY IF EXISTS orders_select_admin       ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;
DROP POLICY IF EXISTS rls_orders_admin_select   ON orders;   -- Gurbet / 00035 lineage
DROP POLICY IF EXISTS rls_orders_admin_insert   ON orders;
DROP POLICY IF EXISTS rls_orders_admin_update   ON orders;
DROP POLICY IF EXISTS rls_orders_admin_delete   ON orders;
-- ...and the names this file itself creates below, so a re-apply is idempotent.
-- Without these, a second run drops every policy above, then aborts on the first
-- duplicate CREATE — leaving `orders` with a SELECT policy and NOTHING else, i.e.
-- no staff member can place an order. This file is not wrapped in a transaction
-- (apply_migration runs the statements as-is), so that state would persist.
DROP POLICY IF EXISTS orders_insert_admin       ON orders;
DROP POLICY IF EXISTS orders_update_admin       ON orders;
DROP POLICY IF EXISTS orders_delete_admin       ON orders;

CREATE POLICY orders_select_admin ON orders FOR SELECT TO authenticated
  USING (is_admin_user() AND (NOT hidden_from_managers OR (SELECT is_owner())));

-- The three write policies below ARE the entire enforcement of "only the owner
-- may set or unset the flag" -- no trigger needed:
--   INSERT WITH CHECK  -> a non-owner cannot create a hidden order
--   UPDATE WITH CHECK  -> a non-owner cannot flip false -> true
--   UPDATE USING       -> a non-owner cannot target a hidden row at all,
--                         so true -> false is unreachable
--   DELETE USING       -> a non-owner cannot delete a hidden order
CREATE POLICY orders_insert_admin ON orders FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND (NOT hidden_from_managers OR (SELECT is_owner())));

CREATE POLICY orders_update_admin ON orders FOR UPDATE TO authenticated
  USING      (is_admin_user() AND (NOT hidden_from_managers OR (SELECT is_owner())))
  WITH CHECK (is_admin_user() AND (NOT hidden_from_managers OR (SELECT is_owner())));

CREATE POLICY orders_delete_admin ON orders FOR DELETE TO authenticated
  USING (is_admin_user() AND (NOT hidden_from_managers OR (SELECT is_owner())));

-- ---------------------------------------------------------------------------
-- 2b. Child-table hiddenness lookup  (SECURITY DEFINER, on purpose)
-- ---------------------------------------------------------------------------
-- ⚠️ THE NON-OBVIOUS PART OF THIS MIGRATION. The child tables cannot ask
-- "is my parent order hidden?" with a plain subquery:
--
--   NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = <child>.order_id
--                                        AND o.hidden_from_managers)   -- WRONG
--
-- That subquery is ITSELF subject to the orders SELECT policy. A shop manager
-- cannot see the hidden order, so the subquery matches nothing, NOT EXISTS
-- evaluates TRUE, and the child row stays visible. The first version of this
-- migration had exactly that bug: with an order hidden, a shop manager still
-- read its line items (prices + COGS) and its invoice. Caught by impersonation
-- testing, not by reading the SQL.
--
-- These helpers bypass RLS so the lookup actually sees the parent row. They
-- return a bare boolean about the flag -- never any order content -- and return
-- false for a NULL/missing order_id, which is what keeps orphaned documents
-- (order_id nulled by purge_order) visible.
--
-- If you ever add another table hanging off orders, gate it with these, NOT
-- with a NOT EXISTS subquery.
CREATE OR REPLACE FUNCTION public.order_is_hidden(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT o.hidden_from_managers FROM orders o WHERE o.id = p_order_id), false);
$function$;

CREATE OR REPLACE FUNCTION public.refund_is_hidden(p_refund_id uuid)
 RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT o.hidden_from_managers
    FROM order_refunds r JOIN orders o ON o.id = r.order_id
    WHERE r.id = p_refund_id), false);
$function$;

REVOKE EXECUTE ON FUNCTION public.order_is_hidden(uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_is_hidden(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.order_is_hidden(uuid)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_is_hidden(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS: order_items
-- ---------------------------------------------------------------------------
-- Gated independently rather than relying on the orders embed, because
-- services/analyticsHelpers.ts (fetchOrderItemsCostChunked) and
-- services/customers.ts query order_items DIRECTLY. Without this a shop manager
-- could read a hidden order's line prices and COGS.
--
-- (SELECT is_owner()) is written FIRST so the owner path short-circuits and
-- never calls the helper at all.
DROP POLICY IF EXISTS order_items_all                ON order_items;
DROP POLICY IF EXISTS order_items_select_admin       ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;
DROP POLICY IF EXISTS rls_order_items_admin_select   ON order_items;
DROP POLICY IF EXISTS rls_order_items_admin_insert   ON order_items;
DROP POLICY IF EXISTS rls_order_items_admin_update   ON order_items;
DROP POLICY IF EXISTS rls_order_items_admin_delete   ON order_items;
DROP POLICY IF EXISTS order_items_insert_admin       ON order_items;  -- created below
DROP POLICY IF EXISTS order_items_update_admin       ON order_items;
DROP POLICY IF EXISTS order_items_delete_admin       ON order_items;

CREATE POLICY order_items_select_admin ON order_items FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_items.order_id)));

CREATE POLICY order_items_insert_admin ON order_items FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_items.order_id)));

CREATE POLICY order_items_update_admin ON order_items FOR UPDATE TO authenticated
  USING      (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_items.order_id)))
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_items.order_id)));

CREATE POLICY order_items_delete_admin ON order_items FOR DELETE TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_items.order_id)));

-- ---------------------------------------------------------------------------
-- 4. RLS: documents  (a hidden order's invoice must not appear either)
-- ---------------------------------------------------------------------------
-- RLS rather than filtering in documents_list: that view is security_invoker,
-- so it inherits this for free, while the many DIRECT readers of `documents`
-- (services/documents.ts, pages/Invoices.tsx, and services/search.ts's global
-- search by invoice number) would otherwise still leak.
--
-- documents.order_id is NULLABLE, and order_is_hidden() returns false for a
-- NULL/missing id -- correct: orphaned documents left behind by purge_order
-- (which nulls order_id) must stay visible.
DROP POLICY IF EXISTS documents_select_admin     ON documents;
DROP POLICY IF EXISTS rls_documents_admin_select ON documents;

CREATE POLICY documents_select_admin ON documents FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(documents.order_id)));

-- UPDATE too, so a manager cannot rewrite a hidden invoice's snapshot.
-- (The enforce_document_snapshot_only_update trigger from 00081 still applies
-- on top of this; it only inspects columns and is unaffected.)
DROP POLICY IF EXISTS documents_update           ON documents;
DROP POLICY IF EXISTS rls_documents_admin_update ON documents;

CREATE POLICY documents_update ON documents FOR UPDATE TO authenticated
  USING      (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(documents.order_id)))
  WITH CHECK (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(documents.order_id)));

-- INSERT is left as-is (is_admin_user()): a new document is always for an order
-- the actor can already see. DELETE is already is_owner()-only on both DBs.

-- ---------------------------------------------------------------------------
-- 5. RLS: document_sends  (the Outbox)
-- ---------------------------------------------------------------------------
-- Also re-scoped from {public} to {authenticated}; a tightening with no live
-- effect, since anon fails is_admin_user() anyway.
DROP POLICY IF EXISTS "Admins view document sends" ON document_sends;

CREATE POLICY "Admins view document sends" ON document_sends FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(document_sends.order_id)));

-- ---------------------------------------------------------------------------
-- 6. RLS: order_refunds / order_refund_items
-- ---------------------------------------------------------------------------
-- PRE-EXISTING LEAK (defect 1 in the header): both SELECT policies were
-- USING (true) for `authenticated`, so any logged-in user -- including a portal
-- customer -- could read every refund row. Also directly defeats this feature,
-- since services/orders.ts embeds refunds:order_refunds(...).
--
-- The `*_write` policies must be replaced too, NOT just the `*_select` ones:
-- they are FOR ALL, and in Postgres a FOR ALL policy also grants SELECT, so
-- leaving them would OR straight past the new read predicate -- the same trap
-- as Melek's `orders_all`. Split into explicit INSERT/UPDATE/DELETE.
-- (create_order_refund is SECURITY DEFINER and bypasses RLS, so the refund flow
-- itself is unaffected by narrowing these.)
DROP POLICY IF EXISTS order_refunds_write  ON order_refunds;
DROP POLICY IF EXISTS order_refunds_select ON order_refunds;
DROP POLICY IF EXISTS order_refunds_insert ON order_refunds;  -- created below
DROP POLICY IF EXISTS order_refunds_update ON order_refunds;
DROP POLICY IF EXISTS order_refunds_delete ON order_refunds;

CREATE POLICY order_refunds_insert ON order_refunds FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());
CREATE POLICY order_refunds_update ON order_refunds FOR UPDATE TO authenticated
  USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY order_refunds_delete ON order_refunds FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY order_refunds_select ON order_refunds FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT order_is_hidden(order_refunds.order_id)));

DROP POLICY IF EXISTS order_refund_items_write  ON order_refund_items;
DROP POLICY IF EXISTS order_refund_items_select ON order_refund_items;
DROP POLICY IF EXISTS order_refund_items_insert ON order_refund_items;  -- created below
DROP POLICY IF EXISTS order_refund_items_update ON order_refund_items;
DROP POLICY IF EXISTS order_refund_items_delete ON order_refund_items;

CREATE POLICY order_refund_items_insert ON order_refund_items FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());
CREATE POLICY order_refund_items_update ON order_refund_items FOR UPDATE TO authenticated
  USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY order_refund_items_delete ON order_refund_items FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY order_refund_items_select ON order_refund_items FOR SELECT TO authenticated
  USING (is_admin_user() AND ((SELECT is_owner()) OR NOT refund_is_hidden(order_refund_items.refund_id)));

-- ===========================================================================
-- 7. SECURITY DEFINER functions
-- ===========================================================================
-- These BYPASS RLS, so each needs the predicate written in by hand.
--
-- Deliberately NOT done with the 00089 DO-block/pg_get_functiondef/replace()
-- trick, for four reasons:
--   * the insertion shape differs per site (FROM orders o / JOIN orders o ON /
--     bare FROM orders WHERE), so there is no single literal to match;
--   * the refund CTEs in get_today_stats and get_weekly_stats contain NO
--     reference to `orders` at all, so a string edit physically cannot fix them
--     -- and they are load-bearing (revenue = GREATEST(revenue - refunded, 0),
--     so an ungated refund silently drops a manager's revenue tile);
--   * Gurbet's whitespace differs, so a literal replace() would silently no-op
--     there -- the worst possible failure mode: migration reports success,
--     Gurbet leaks;
--   * chained replace() calls re-match their own output for the bare
--     `FROM orders` case.
-- An explicit body is reviewable; a regex mutation is not.
--
-- Bodies below are copied VERBATIM from the live Melek definitions, with only
-- the predicate (and, where noted, a restored guard) added. Melek and Gurbet
-- were verified identical modulo comments/whitespace, except
-- get_customer_items_summary -- see its note.
--
-- Every function is re-granted at the end of this file: recreating a SECURITY
-- DEFINER function re-grants EXECUTE to `anon` via Supabase's default
-- privileges, which would regress 00070.
--
-- NOT touched, on purpose:
--   get_portal_orders / _order / _stats / _documents  -- the customer must
--     still see their own order; hiding is from STAFF, not from the buyer.
--   trash_order / restore_order / purge_order / create_order_refund -- owner
--     actions on a row the caller already reached.
-- ---------------------------------------------------------------------------

-- 7.1 get_dashboard_revenue -------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_revenue()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(total - COALESCE(refund_amount, 0)), 0)::bigint
  FROM orders
  WHERE status NOT IN ('cancelled', 'refunded', 'draft')
    AND (NOT hidden_from_managers OR (SELECT is_owner()));
$function$;

-- 7.2 get_action_required ---------------------------------------------------
-- Two sites: the pending_payment and on_hold count subqueries. (The products
-- zero-stock subquery is untouched.)
CREATE OR REPLACE FUNCTION public.get_action_required()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'overdue_payments', COALESCE(op.cnt, 0),
    'zero_stock_count', COALESCE(zs.cnt, 0),
    'orders_on_hold', COALESCE(oh.cnt, 0)
  ) INTO result
  FROM
    (SELECT COUNT(*)::int AS cnt
     FROM orders
     WHERE status = 'pending_payment'
       AND created_at < (NOW() - interval '3 days')
       AND (NOT hidden_from_managers OR (SELECT is_owner()))
    ) op,
    (SELECT COUNT(*)::int AS cnt
     FROM products
     WHERE track_stock = true
       AND stock_quantity <= 0
    ) zs,
    (SELECT COUNT(*)::int AS cnt
     FROM orders
     WHERE status = 'on_hold'
       AND (NOT hidden_from_managers OR (SELECT is_owner()))
    ) oh;

  RETURN result;
END;
$function$;

-- 7.3 get_today_orders_by_status --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_today_orders_by_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb) INTO result
  FROM (
    SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::bigint AS total_amount
    FROM orders
    WHERE order_date = CURRENT_DATE AND deleted_at IS NULL
      AND (NOT hidden_from_managers OR (SELECT is_owner()))
    GROUP BY status
    ORDER BY CASE status
        WHEN 'draft' THEN 1 WHEN 'pending_payment' THEN 2 WHEN 'on_hold' THEN 3
        WHEN 'completed' THEN 4 WHEN 'refunded' THEN 5 WHEN 'cancelled' THEN 6 ELSE 7 END
  ) s;
  RETURN result;
END;
$function$;

-- 7.4 get_slow_movers -------------------------------------------------------
-- Also restores the missing is_admin_user() guard (defect 3): this returns
-- stock_value, i.e. cost x quantity, and was callable by ANY authenticated
-- user including portal customers. Converted to plpgsql to carry the guard.
CREATE OR REPLACE FUNCTION public.get_slow_movers(p_days_since_last_sale integer DEFAULT 60)
 RETURNS TABLE(product_id uuid, product_name text, sku text, current_stock numeric, stock_value bigint, last_sale_date date, days_since_last_sale integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.stock_quantity::numeric,
    -- Stock value is a cost figure: owner only.
    CASE WHEN is_owner()
      THEN (p.stock_quantity * COALESCE(p.cost_cents, 0))::bigint
      ELSE NULL::bigint END,
    ls.last_sale_date,
    CASE WHEN ls.last_sale_date IS NOT NULL
      THEN (CURRENT_DATE - ls.last_sale_date)::integer ELSE NULL END
  FROM products p
  LEFT JOIN LATERAL (
    SELECT MAX(o.order_date) AS last_sale_date
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR is_owner())
  ) ls ON true
  WHERE p.track_stock = true
    AND p.is_active = true
    AND p.stock_quantity > 0
    AND (ls.last_sale_date IS NULL OR ls.last_sale_date < CURRENT_DATE - p_days_since_last_sale)
  ORDER BY ls.last_sale_date ASC NULLS FIRST;
END;
$function$;

-- 7.5 empty_order_trash -----------------------------------------------------
-- Not a read path, but this feature makes it dangerous: without the gate a shop
-- manager clicking "Prullenbak legen" would PERMANENTLY PURGE hidden trashed
-- orders they cannot see (defect 4). Everything else is unchanged, including
-- the deliberate set-status-then-DELETE order that keeps stock correct.
CREATE OR REPLACE FUNCTION public.empty_order_trash()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; n int := 0;
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOR r IN SELECT id, pre_trash_status FROM orders
           WHERE deleted_at IS NOT NULL
             AND (NOT hidden_from_managers OR is_owner())
           FOR UPDATE LOOP
    UPDATE orders
    SET status = CASE WHEN COALESCE(r.pre_trash_status, 'draft') = 'cancelled' THEN 'draft'::order_status
                      ELSE COALESCE(r.pre_trash_status, 'draft') END
    WHERE id = r.id;
    DELETE FROM orders WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

-- 7.6 get_today_stats -------------------------------------------------------
-- EIGHT sites. Six are ordinary `orders` predicates; the interesting two are
-- the rt/ry refund CTEs, which aggregate order_refund_items x order_refunds and
-- never mention `orders` at all. They MUST be gated: revenue_today is
-- GREATEST(revenue - refunded, 0), so a hidden order's refund left in place
-- would silently reduce a shop manager's revenue tile by an amount they cannot
-- account for -- both a wrong number and an inference leak.
CREATE OR REPLACE FUNCTION public.get_today_stats(p_is_owner boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
    t AS (
      SELECT
        COUNT(*)::int AS orders_today,
        COALESCE(SUM(subtotal), 0)::bigint AS revenue_today,
        COALESCE((
          SELECT SUM(oi.cost_cents * oi.quantity)::bigint
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.order_date = CURRENT_DATE
            AND o.status NOT IN ('cancelled', 'refunded', 'draft')
            AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
        ), 0)::bigint AS cost_today,
        COALESCE((
          SELECT COUNT(*)::int
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.order_date = CURRENT_DATE
            AND o.status IN ('pending_payment', 'on_hold', 'draft')
            AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
        ), 0) AS items_to_pick
      FROM orders
      WHERE order_date = CURRENT_DATE
        AND status NOT IN ('cancelled', 'refunded', 'draft')
        AND (NOT hidden_from_managers OR (SELECT is_owner()))
    ),
    rt AS (
      SELECT COALESCE(SUM(ori.amount), 0)::bigint AS refunded_today
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      JOIN orders o        ON o.id = r.order_id
      WHERE r.refund_date::date = CURRENT_DATE
        AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    ),
    ry AS (
      SELECT COALESCE(SUM(ori.amount), 0)::bigint AS refunded_yesterday
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      JOIN orders o        ON o.id = r.order_id
      WHERE r.refund_date::date = CURRENT_DATE - 1
        AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    ),
    y  AS (SELECT COALESCE(SUM(subtotal), 0)::bigint AS yesterday_revenue FROM orders WHERE order_date = CURRENT_DATE - 1 AND status NOT IN ('cancelled', 'refunded', 'draft') AND (NOT hidden_from_managers OR (SELECT is_owner()))),
    p  AS (SELECT COUNT(*)::int AS pending_count FROM orders WHERE status IN ('pending_payment', 'on_hold', 'draft') AND (NOT hidden_from_managers OR (SELECT is_owner()))),
    d  AS (SELECT COUNT(*)::int AS deliveries_today FROM orders WHERE order_date = CURRENT_DATE AND status = 'completed' AND (NOT hidden_from_managers OR (SELECT is_owner())))
  SELECT CASE WHEN (p_is_owner AND is_owner()) THEN
    jsonb_build_object(
      'orders_today',      t.orders_today,
      'revenue_today',     GREATEST(t.revenue_today - rt.refunded_today, 0),
      'profit_today',      GREATEST(t.revenue_today - rt.refunded_today, 0) - t.cost_today,
      'pending_count',     p.pending_count,
      'yesterday_revenue', GREATEST(y.yesterday_revenue - ry.refunded_yesterday, 0)
    )
  ELSE
    jsonb_build_object(
      'orders_today',     t.orders_today,
      'items_to_pick',    t.items_to_pick,
      'pending_count',    p.pending_count,
      'deliveries_today', d.deliveries_today
    )
  END
  FROM t, rt, ry, y, p, d;
$function$;

-- 7.7 get_weekly_stats ------------------------------------------------------
-- Four sites. rtw/rlw read order_refunds directly, which does carry order_id,
-- so they get a join to orders rather than the EXISTS shape used above.
CREATE OR REPLACE FUNCTION public.get_weekly_stats(p_is_owner boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
    tw AS (
      SELECT
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE order_date >= date_trunc('week', CURRENT_DATE)::date
        AND order_date <= CURRENT_DATE
        AND status NOT IN ('cancelled', 'refunded', 'draft')
        AND (NOT hidden_from_managers OR (SELECT is_owner()))
    ),
    lw AS (
      SELECT
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE order_date >= (date_trunc('week', CURRENT_DATE) - interval '7 days')::date
        AND order_date <= (date_trunc('week', CURRENT_DATE) - interval '1 day')::date
        AND status NOT IN ('cancelled', 'refunded', 'draft')
        AND (NOT hidden_from_managers OR (SELECT is_owner()))
    ),
    rtw AS (
      SELECT COALESCE(SUM(rf.amount), 0)::bigint AS refunded
      FROM order_refunds rf
      JOIN orders o ON o.id = rf.order_id
      WHERE rf.refund_date::date BETWEEN date_trunc('week', CURRENT_DATE)::date AND CURRENT_DATE
        AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    ),
    rlw AS (
      SELECT COALESCE(SUM(rf.amount), 0)::bigint AS refunded
      FROM order_refunds rf
      JOIN orders o ON o.id = rf.order_id
      WHERE rf.refund_date::date BETWEEN (date_trunc('week', CURRENT_DATE) - interval '7 days')::date
                                     AND (date_trunc('week', CURRENT_DATE) - interval '1 day')::date
        AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    )
  SELECT jsonb_build_object(
    'this_week_revenue',  GREATEST(tw.revenue - rtw.refunded, 0),
    'this_week_orders',   tw.order_count,
    'last_week_revenue',  GREATEST(lw.revenue - rlw.refunded, 0),
    'last_week_orders',   lw.order_count,
    'revenue_change_pct', CASE
      WHEN GREATEST(lw.revenue - rlw.refunded, 0) > 0
      THEN ROUND(
        ((GREATEST(tw.revenue - rtw.refunded, 0) - GREATEST(lw.revenue - rlw.refunded, 0))::numeric
         / GREATEST(lw.revenue - rlw.refunded, 1)) * 100, 1)
      WHEN GREATEST(tw.revenue - rtw.refunded, 0) > 0 THEN 100
      ELSE 0
    END,
    'orders_change_pct', CASE
      WHEN lw.order_count > 0
      THEN ROUND(((tw.order_count - lw.order_count)::numeric / lw.order_count) * 100, 1)
      WHEN tw.order_count > 0 THEN 100
      ELSE 0
    END
  )
  FROM tw, lw, rtw, rlw;
$function$;

-- 7.8 get_overdue_invoices --------------------------------------------------
-- One site on the main FROM; the inv/r LATERALs are already scoped by o.id.
CREATE OR REPLACE FUNCTION public.get_overdue_invoices()
 RETURNS TABLE(order_id uuid, order_number text, customer_id uuid, customer_name text, customer_email text, total integer, invoice_due_date date, days_overdue integer, invoice_number text, reminders_sent integer, last_reminder_at timestamp with time zone, snoozed_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- NOT status = 'sent' — the sync-email-status cron rewrites 'sent' in
      -- place to the real Resend outcome. Mirrors NOT_YET_SENT_STATUSES in
      -- the process-invoice-reminders edge function; keep the two in sync.
      AND ds.status NOT IN ('pending', 'failed')
  ) r ON TRUE
  LEFT JOIN invoice_reminder_state st ON st.order_id = o.id
  WHERE o.invoice_due_date < CURRENT_DATE
    AND o.status NOT IN ('completed', 'cancelled', 'refunded')
    AND o.reminders_opted_out = false
    AND c.reminders_opted_out = false
    AND (NOT o.hidden_from_managers OR is_owner())
  ORDER BY o.invoice_due_date ASC;
END;
$function$;

-- 7.9 get_customer_orders ---------------------------------------------------
-- Two sites: the `sold` CTE and the `refunded` CTE.
CREATE OR REPLACE FUNCTION public.get_customer_orders(p_customer_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(order_id uuid, order_number text, order_date date, status text, subtotal bigint, total_cost bigint, profit bigint, profit_margin numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
  WITH sold AS (
    SELECT
      o.id                                       AS order_id,
      o.order_number,
      o.order_date,
      o.status::text                             AS status,
      o.subtotal::bigint                         AS subtotal_gross,
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
  SELECT
    s.order_id,
    s.order_number,
    s.order_date,
    s.status,
    (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))::bigint AS subtotal,
    s.cogs                                                       AS total_cost,
    CASE WHEN is_owner()
      THEN (s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint
    END                                                         AS profit,
    CASE
      WHEN is_owner() AND (s.subtotal_gross - COALESCE(rf.amount_refunded, 0)) > 0
      THEN ROUND(((s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::numeric
            / (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))) * 100, 1)
      ELSE NULL::numeric
    END                                                         AS profit_margin
  FROM sold s
  LEFT JOIN refunded rf ON rf.order_id = s.order_id
  ORDER BY s.order_date DESC;
END;
$function$;

-- 7.10 get_inventory_turnover -----------------------------------------------
-- Also restores the missing is_admin_user() guard and adds the is_owner() gate
-- (defect 3): every figure this returns except the product name and stock count
-- is derived from cost_cents, and it was callable by ANY authenticated user.
CREATE OR REPLACE FUNCTION public.get_inventory_turnover(p_start_date date, p_end_date date)
 RETURNS TABLE(product_name text, stock_qty numeric, stock_value bigint, cogs_in_period bigint, turnover_ratio numeric, days_to_sell numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.name,
    p.stock_quantity::numeric,
    CASE WHEN is_owner()
      THEN (p.stock_quantity * COALESCE(p.cost_cents, 0))::bigint
      ELSE NULL::bigint END                                AS stock_value,
    CASE WHEN is_owner()
      THEN COALESCE(ic.cogs, 0)::bigint
      ELSE NULL::bigint END                                AS cogs_in_period,
    CASE WHEN is_owner() AND (p.stock_quantity * COALESCE(p.cost_cents, 0)) > 0
      THEN ROUND(COALESCE(ic.cogs, 0)::numeric
            / (p.stock_quantity * COALESCE(p.cost_cents, 0)), 2)
      WHEN is_owner() THEN 0
      ELSE NULL END                                        AS turnover_ratio,
    CASE WHEN is_owner() AND COALESCE(ic.cogs, 0) > 0
      THEN ROUND((p_end_date - p_start_date)::numeric
            / (COALESCE(ic.cogs, 0)::numeric
               / NULLIF(p.stock_quantity * COALESCE(p.cost_cents, 0), 0)), 1)
      ELSE NULL END                                        AS days_to_sell
  FROM products p
  LEFT JOIN LATERAL (
    SELECT SUM(oi.cost_cents * oi.quantity) AS cogs
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR is_owner())
  ) ic ON true
  WHERE p.track_stock = true
    AND p.is_active = true
  ORDER BY 5 DESC NULLS LAST;
END;
$function$;

-- 7.11 get_sold_products_breakdown ------------------------------------------
-- Two sites: the `sold` CTE and the `refunded` CTE. This one matters most for
-- day-to-day use -- it drives the Sold Products page a shop manager works from.
CREATE OR REPLACE FUNCTION public.get_sold_products_breakdown(p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, unit_type text, category_name text, customer_id uuid, customer_name text, customer_type text, city text, total_quantity numeric, total_revenue bigint, order_count integer, current_stock numeric, track_stock boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH sold AS (
    SELECT oi.product_id, oi.product_name, oi.product_sku, oi.unit_type, o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '') AS city,
      SUM(oi.quantity)::numeric AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross,
      COUNT(DISTINCT o.id)::integer AS order_count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN customers c ON c.id = o.customer_id
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    GROUP BY oi.product_id, oi.product_name, oi.product_sku, oi.unit_type,
             o.customer_id, COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  ),
  refunded AS (
    SELECT ori.product_id, o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '') AS city,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o ON o.id = r.order_id
    JOIN customers c ON c.id = o.customer_id
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
      AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    GROUP BY ori.product_id, o.customer_id, COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  )
  SELECT s.product_id, s.product_name, s.product_sku, s.unit_type,
    COALESCE(cat.name, '') AS category_name,
    s.customer_id, cust.company_name AS customer_name, cust.customer_type AS customer_type, s.city,
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric AS total_quantity,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint AS total_revenue,
    s.order_count, p.stock_quantity::numeric AS current_stock,
    COALESCE(p.track_stock, FALSE) AS track_stock
  FROM sold s
  LEFT JOIN refunded rf ON rf.product_id = s.product_id AND rf.customer_id = s.customer_id AND rf.city = s.city
  LEFT JOIN products p ON p.id = s.product_id
  LEFT JOIN categories cat ON cat.id = p.category_id
  LEFT JOIN customers cust ON cust.id = s.customer_id
  WHERE (s.qty_gross - COALESCE(rf.qty_refunded, 0)) > 0
  ORDER BY total_revenue DESC NULLS LAST;
$function$;

-- 7.12 get_revenue_by_category ----------------------------------------------
-- One site. NOTE the gate is appended as a SIBLING of the whole p_statuses
-- OR-group, not inside a branch -- putting it inside either branch would leave
-- the other one ungated.
CREATE OR REPLACE FUNCTION public.get_revenue_by_category(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[])
 RETURNS TABLE(category_name text, total_revenue bigint, total_cogs bigint, total_profit bigint, profit_margin numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(c.name,''), SUM(oi.unit_price*oi.quantity)::bigint,
    CASE WHEN is_owner() THEN SUM(oi.cost_cents*oi.quantity)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN (SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND SUM(oi.unit_price*oi.quantity)>0 THEN ROUND(((SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::numeric/SUM(oi.unit_price*oi.quantity))*100,2) ELSE NULL END
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN categories c ON c.id=p.category_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
  GROUP BY c.name ORDER BY SUM(oi.unit_price*oi.quantity) DESC;
$function$;

-- 7.13 get_product_performance ----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_product_performance(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_product_id uuid DEFAULT NULL::uuid, p_unit_type text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(product_name text, category_name text, total_revenue bigint, total_cogs bigint, total_profit bigint, profit_margin numeric, total_quantity numeric, order_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_name, COALESCE(c.name,''),
    SUM(oi.unit_price*oi.quantity)::bigint,
    CASE WHEN is_owner() THEN SUM(oi.cost_cents*oi.quantity)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN (SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND SUM(oi.unit_price*oi.quantity)>0 THEN ROUND(((SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::numeric/SUM(oi.unit_price*oi.quantity))*100,2) ELSE NULL END,
    SUM(oi.quantity)::numeric, COUNT(DISTINCT o.id)::integer
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN categories c ON c.id=p.category_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id=p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text=p_unit_type)
    AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type))
    AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
  GROUP BY oi.product_name, c.name ORDER BY SUM(oi.unit_price*oi.quantity) DESC;
$function$;

-- 7.14 get_top_products -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_products(p_start_date date, p_end_date date, p_limit integer DEFAULT 10, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_product_id uuid DEFAULT NULL::uuid, p_unit_type text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(product_name text, total_quantity numeric, total_revenue bigint, total_profit bigint, unit_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_name, SUM(oi.quantity)::numeric, SUM(oi.unit_price*oi.quantity)::bigint,
    CASE WHEN is_owner() THEN (SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::bigint ELSE NULL END,
    COALESCE(MAX(oi.unit_type),'piece')
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id=p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text=p_unit_type)
    AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type))
    AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
  GROUP BY oi.product_name ORDER BY SUM(oi.unit_price*oi.quantity) DESC LIMIT p_limit;
$function$;

-- 7.15 get_customer_items_summary -------------------------------------------
-- DEFECT 2. Melek's live copy had regressed to a pre-00070 body: LANGUAGE sql,
-- no is_admin_user() guard, no is_owner() profit gate. Because it is SECURITY
-- DEFINER and EXECUTE is granted to `authenticated`, ANY logged-in user --
-- including a customer-portal account -- could pass an arbitrary customer id
-- and read that customer's per-product revenue AND profit. Gurbet still had the
-- correct guarded version; this restores it on both, with the hidden predicate
-- added to the sold and refunded CTEs.
CREATE OR REPLACE FUNCTION public.get_customer_items_summary(p_customer_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_code text, product_name text, category_name text, unit_type text, total_quantity numeric, order_count integer, last_ordered timestamp with time zone, avg_unit_price bigint, total_revenue bigint, total_profit bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
  WITH sold AS (
    SELECT
      oi.product_id,
      oi.product_name,
      oi.unit_type,
      SUM(oi.quantity)::numeric              AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross,
      SUM(oi.cost_cents * oi.quantity)::bigint AS cogs,
      COUNT(DISTINCT o.id)::integer          AS order_count,
      MAX(o.order_date)                      AS last_ordered
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY oi.product_id, oi.product_name, oi.unit_type
  ),
  refunded AS (
    SELECT
      ori.product_id,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint    AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o        ON o.id = r.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY ori.product_id
  )
  SELECT
    s.product_id,
    p.product_code,
    s.product_name,
    COALESCE(c.name, ''),
    -- Explicit casts REQUIRED: unit_type is an ENUM (declared text) and
    -- last_ordered is MAX(order_date), a DATE (declared timestamptz). LANGUAGE
    -- sql cast both implicitly; plpgsql's RETURN QUERY type-checks strictly and
    -- raises 42804 on the first row produced. Missing these shipped a broken
    -- function to production -- see 00096.
    s.unit_type::text,
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric,
    s.order_count,
    s.last_ordered::timestamptz,
    CASE
      WHEN s.qty_gross > 0
      THEN ROUND(s.revenue_gross::numeric / s.qty_gross)::bigint
      ELSE 0::bigint
    END,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint,
    -- Profit hidden for non-owner roles. Shop Manager sees NULL even
    -- when calling the RPC directly via supabase.rpc(...).
    CASE
      WHEN is_owner()
      THEN (s.revenue_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint
    END
  FROM sold s
  LEFT JOIN refunded   rf ON rf.product_id = s.product_id
  LEFT JOIN products   p  ON p.id          = s.product_id
  LEFT JOIN categories c  ON c.id          = p.category_id
  ORDER BY (s.revenue_gross - COALESCE(rf.amount_refunded, 0)) DESC NULLS LAST;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
-- MANDATORY. Recreating a SECURITY DEFINER function re-grants EXECUTE to
-- `anon` through Supabase's default privileges, which would regress 00070 and
-- re-leak COGS to unauthenticated callers. REVOKE FROM PUBLIC alone is NOT
-- enough -- `anon` must be named explicitly.
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'get_dashboard_revenue','get_action_required','get_today_orders_by_status',
      'get_slow_movers','empty_order_trash','get_today_stats','get_weekly_stats',
      'get_overdue_invoices','get_customer_orders','get_inventory_turnover',
      'get_sold_products_breakdown','get_revenue_by_category',
      'get_product_performance','get_top_products','get_customer_items_summary')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Post-apply assertions (run these after applying, on BOTH databases)
-- ---------------------------------------------------------------------------
-- a) every gated function actually carries the predicate -- must return 0 rows
--    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.proname IN (<the 15 above>)
--      AND pg_get_functiondef(p.oid) NOT LIKE '%hidden_from_managers%';
--
-- b) no SECURITY DEFINER function still reads orders ungated. Expected residue
--    is exactly: get_portal_orders/_order/_stats/_documents, trash_order,
--    restore_order, purge_order, create_order_refund, staff_delete_blockers.
--    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosecdef AND p.prosrc ILIKE '%orders%'
--      AND pg_get_functiondef(p.oid) NOT LIKE '%hidden_from_managers%';
--
-- c) anon can execute nothing -- every row must be false
--    SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE')
--    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosecdef;
--
-- d) no permissive policy left behind -- every SELECT/UPDATE/DELETE qual on the
--    six tables must mention hidden_from_managers, and orders_all /
--    order_items_all / order_refunds_write / order_refund_items_write /
--    rls_*_admin_select must be GONE.
--    SELECT tablename, policyname, cmd, qual FROM pg_policies
--    WHERE tablename IN ('orders','order_items','documents','document_sends',
--                        'order_refunds','order_refund_items') ORDER BY 1,3,2;
