-- Customer-portal security hardening.
--
-- BEFORE: orders/order_items/documents had broad `USING (true)` SELECT policies for the
-- `authenticated` role, so ANY logged-in user — including a portal customer — could read
-- EVERY customer's orders/items/documents (cross-customer leak), and `products` /
-- `order_items` exposed `cost_cents` (COGS) plus `internal_notes`. The app didn't surface
-- these, but they were reachable by a crafted PostgREST query.
--
-- AFTER: portal customers have NO direct SELECT on these tables. They read their own data
-- only through the SECURITY DEFINER `get_portal_*` RPCs below, which return column-whitelisted
-- JSON (no cost_cents / internal_notes), scoped to the logged-in customer + non-trashed orders.
-- Staff (is_admin_user) keep full SELECT.
--
-- NOTE: applied to live in two steps (RPCs first, then the policy lockdown) so the portal
-- client could be switched to the RPCs around the deploy. The portal services now call these
-- RPCs; the admin app is unaffected (it reads via the is_admin_user() policies).

-- ── Resolve the logged-in portal customer's id (active account only), server-side ──
CREATE OR REPLACE FUNCTION get_portal_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT customer_id FROM customer_accounts
  WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_portal_customer_id() TO authenticated;

-- ── Safe portal reads (no cost_cents / internal_notes; deleted_at IS NULL) ──
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
  WHERE o.customer_id = get_portal_customer_id() AND o.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_portal_orders() TO authenticated;

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
  WHERE o.id = p_id AND o.customer_id = get_portal_customer_id() AND o.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_portal_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_portal_documents()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', d.id, 'document_type', d.document_type::text, 'document_number', d.document_number,
    'snapshot', d.snapshot, 'generated_at', d.generated_at,
    'order', json_build_object('id', o.id, 'order_number', o.order_number, 'total', o.total)
  ) ORDER BY d.generated_at DESC), '[]'::json)
  FROM documents d JOIN orders o ON o.id = d.order_id
  WHERE o.customer_id = get_portal_customer_id() AND o.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_portal_documents() TO authenticated;

CREATE OR REPLACE FUNCTION get_portal_customer()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'id', c.id, 'company_name', c.company_name, 'contact_person', c.contact_person,
    'email', c.email, 'phone', c.phone, 'vat_number', c.vat_number,
    'address', c.address, 'city', c.city, 'postal_code', c.postal_code, 'country', c.country,
    'billing_street', c.billing_street, 'billing_city', c.billing_city,
    'billing_postal_code', c.billing_postal_code, 'billing_country', c.billing_country,
    'shipping_same_as_billing', c.shipping_same_as_billing,
    'shipping_street', c.shipping_street, 'shipping_city', c.shipping_city,
    'shipping_postal_code', c.shipping_postal_code, 'shipping_country', c.shipping_country,
    'price_list_id', c.price_list_id,
    'price_list', (SELECT json_build_object('id', pl.id, 'name', pl.name)
                   FROM price_lists pl WHERE pl.id = c.price_list_id)
  )
  FROM customers c WHERE c.id = get_portal_customer_id();
$$;
GRANT EXECUTE ON FUNCTION get_portal_customer() TO authenticated;

CREATE OR REPLACE FUNCTION get_portal_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'totalOrders', count(*),
    'pendingOrders', count(*) FILTER (WHERE status IN ('pending','processing','pending_payment','on_hold')),
    'completedOrders', count(*) FILTER (WHERE status IN ('completed','delivered')),
    'totalSpent', COALESCE(sum(total) FILTER (WHERE status IN ('completed','delivered')), 0)
  )
  FROM orders WHERE customer_id = get_portal_customer_id() AND deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_portal_stats() TO authenticated;

-- ── Lockdown: remove portal customers' direct SELECT on the base tables ──
DROP POLICY IF EXISTS "Portal customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders" ON orders;
CREATE POLICY "orders_select_admin" ON orders FOR SELECT TO authenticated USING (is_admin_user());

DROP POLICY IF EXISTS "Portal customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
CREATE POLICY "order_items_select_admin" ON order_items FOR SELECT TO authenticated USING (is_admin_user());

DROP POLICY IF EXISTS "Portal customers can view own documents" ON documents;
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select_admin" ON documents FOR SELECT TO authenticated USING (is_admin_user());

DROP POLICY IF EXISTS "Portal customers can view own record" ON customers;  -- admin keeps via customers_select_policy

DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "products_select_admin" ON products FOR SELECT TO authenticated USING (is_admin_user());
