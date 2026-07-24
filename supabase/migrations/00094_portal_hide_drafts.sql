-- Hide Concept (draft) orders from the customer portal.
--
-- A `draft` order is unfinalised work in progress (see the "Draft orders" section in
-- CLAUDE.md): it is excluded from analytics revenue/profit, gets no automatic email, is
-- never a delivery-route stop and is skipped by the Day Close batch. The customer portal
-- was the one surface that still showed it — `get_portal_*` filtered only on
-- `customer_id` + `deleted_at IS NULL` (migration 00071), so a customer could see an
-- order the shop had not yet committed to.
--
-- Documents matter as much as the order itself: drafts CAN carry an issued invoice
-- (an order invoiced first and set back to Concept afterwards). At the time of writing
-- all 3 live drafts on the Melek database had one, so `get_portal_documents` is filtered
-- too — otherwise the invoice PDF of a draft order would still be downloadable from the
-- portal's Documents page.
--
-- Bodies below are copied VERBATIM from the live definitions with a single added
-- predicate, so nothing else about the column whitelist / scoping changes.
--
-- ⚠️ SECURITY: recreating a SECURITY DEFINER function re-grants EXECUTE to PUBLIC via
-- Supabase's default privileges, and `REVOKE ... FROM PUBLIC` alone does NOT cover the
-- `anon` role. Every function below is explicitly revoked from PUBLIC **and** anon and
-- re-granted to `authenticated`. (Same trap as migration 00092.)

-- ── Orders list ──
CREATE OR REPLACE FUNCTION get_portal_orders()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id,
    'status', o.status::text, 'payment_method', o.payment_method::text,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'order_date', o.order_date, 'delivery_notes', o.delivery_notes,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', COALESCE((SELECT json_agg(json_build_object(
        'id', oi.id, 'product_name', oi.product_name, 'product_sku', oi.product_sku,
        'unit_type', oi.unit_type, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
        'discount_amount', oi.discount_amount, 'tax_rate', oi.tax_rate, 'tax_amount', oi.tax_amount,
        'line_total_cents', oi.total, 'notes', oi.notes))
      FROM order_items oi WHERE oi.order_id = o.id), '[]'::json)
  ) ORDER BY o.created_at DESC), '[]'::json)
  FROM orders o
  WHERE o.customer_id = get_portal_customer_id()
    AND o.deleted_at IS NULL
    AND o.status <> 'draft';
$$;

-- ── Single order (a guessed/bookmarked draft id now returns nothing) ──
CREATE OR REPLACE FUNCTION get_portal_order(p_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id,
    'status', o.status::text, 'payment_method', o.payment_method::text,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'order_date', o.order_date, 'delivery_notes', o.delivery_notes,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', COALESCE((SELECT json_agg(json_build_object(
        'id', oi.id, 'product_name', oi.product_name, 'product_sku', oi.product_sku,
        'unit_type', oi.unit_type, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
        'discount_amount', oi.discount_amount, 'tax_rate', oi.tax_rate, 'tax_amount', oi.tax_amount,
        'line_total_cents', oi.total, 'notes', oi.notes))
      FROM order_items oi WHERE oi.order_id = o.id), '[]'::json),
    'documents', COALESCE((SELECT json_agg(json_build_object(
        'id', d.id, 'document_type', d.document_type::text, 'document_number', d.document_number,
        'snapshot', d.snapshot, 'generated_at', d.generated_at, 'created_at', d.generated_at)
      ORDER BY d.generated_at DESC)
      FROM documents d WHERE d.order_id = o.id), '[]'::json)
  )
  FROM orders o
  WHERE o.id = p_id
    AND o.customer_id = get_portal_customer_id()
    AND o.deleted_at IS NULL
    AND o.status <> 'draft';
$$;

-- ── Documents list ──
CREATE OR REPLACE FUNCTION get_portal_documents()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', d.id, 'document_type', d.document_type::text, 'document_number', d.document_number,
    'snapshot', d.snapshot, 'generated_at', d.generated_at,
    'order', json_build_object('id', o.id, 'order_number', o.order_number, 'total', o.total)
  ) ORDER BY d.generated_at DESC), '[]'::json)
  FROM documents d JOIN orders o ON o.id = d.order_id
  WHERE o.customer_id = get_portal_customer_id()
    AND o.deleted_at IS NULL
    AND o.status <> 'draft';
$$;

-- ── Dashboard stats (kept consistent with the list above) ──
CREATE OR REPLACE FUNCTION get_portal_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'totalOrders', count(*),
    'pendingOrders', count(*) FILTER (WHERE status IN ('pending','processing','pending_payment','on_hold')),
    'completedOrders', count(*) FILTER (WHERE status IN ('completed','delivered')),
    'totalSpent', COALESCE(sum(total) FILTER (WHERE status IN ('completed','delivered')), 0)
  )
  FROM orders
  WHERE customer_id = get_portal_customer_id()
    AND deleted_at IS NULL
    AND status <> 'draft';
$$;

-- ── Re-assert grants (see the SECURITY note in the header) ──
REVOKE EXECUTE ON FUNCTION get_portal_orders()        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_portal_order(uuid)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_portal_documents()     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_portal_stats()         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION get_portal_orders()         TO authenticated;
GRANT EXECUTE ON FUNCTION get_portal_order(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION get_portal_documents()      TO authenticated;
GRANT EXECUTE ON FUNCTION get_portal_stats()          TO authenticated;
