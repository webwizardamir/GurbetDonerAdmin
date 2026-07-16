-- ============================================================================
-- 00088: documents_list view for server-side Invoices search/sort/pagination
-- ============================================================================
-- The Invoices page needs to search & sort by customer name and order number,
-- which live inside the documents.snapshot JSONB. Filtering/ordering on JSON
-- paths through PostgREST is fragile, so expose them as real columns via a view.
--
-- security_invoker = true => the view runs with the QUERYING user's privileges,
-- so the documents RLS (admin-only SELECT, migration 00071) still applies. Do
-- NOT drop security_invoker or this would leak documents to any authenticated
-- user (incl. portal customers).
--
-- Applied to live DB 2026-07-16.
-- ============================================================================

CREATE OR REPLACE VIEW documents_list
WITH (security_invoker = true) AS
SELECT
  d.*,
  d.snapshot->'customer'->>'companyName' AS customer_name,
  d.snapshot->'order'->>'orderNumber'    AS order_number
FROM documents d;
