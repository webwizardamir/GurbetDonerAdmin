-- ============================================================================
-- 00113: documents_list hides documents whose order is in the Prullenbak
-- ============================================================================
-- The Invoices register listed the invoice of every TRASHED order. A trashed
-- order has had its stock restored and is sitting in the bin waiting to be
-- restored or purged -- it is not a live sale, so its invoice has no business
-- in the register the owner reads to see what is outstanding.
--
-- This is very easy to hit since auto-invoicing landed (2026-07-13):
-- `ensureOrderInvoice` issues a document the moment ANY non-imported order is
-- saved, and `trash_order` accepts exactly the statuses those orders are in
-- (draft/pending/pending_payment/on_hold). So every trashed order that was not
-- a Concept carries an invoice document, and every one of them showed up here.
--
-- Fixing the VIEW rather than the page repairs all four consumers at once --
-- the paged table, the stat cards, the customer-filter dropdown and the
-- "all results" export (services/documents.ts, all of which run through
-- applyDocumentFilters). A page-level filter would have to be repeated in each
-- and would drift.
--
-- `d.order_id IS NULL` must stay visible: `purge_order` NULLs the FK instead of
-- deleting the document (00095), so an orphaned invoice is the record of a
-- permanently-deleted order and is the LAST thing to hide. With a LEFT JOIN the
-- `o.deleted_at IS NULL` test already admits those rows (o.* is NULL), but it
-- is spelled out so a future edit cannot quietly turn this into an INNER JOIN
-- and drop them.
--
-- NOT a security boundary and deliberately not written as one: this is a
-- relevance filter. The hidden-order gate lives in the `documents` RLS policy
-- (00095) and still applies, because the view keeps security_invoker.
--
-- security_invoker = true => the view runs with the QUERYING user's privileges,
-- so the documents RLS (admin-only SELECT, 00071) still applies. Do NOT drop
-- security_invoker or this leaks documents to any authenticated user (incl.
-- portal customers). It also means the join to `orders` runs under the caller's
-- RLS -- which is fine here: the admin orders policy does not filter
-- `deleted_at`, so a trashed order is always found and always excluded. A
-- manager cannot see a *hidden* order, but that order's document was already
-- removed from the base table by the documents policy, so nothing leaks
-- through the resulting NULL.
--
-- Column list, types and order are byte-identical to 00088, so CREATE OR
-- REPLACE succeeds without dropping dependents.
-- ============================================================================

CREATE OR REPLACE VIEW documents_list
WITH (security_invoker = true) AS
SELECT
  d.*,
  d.snapshot->'customer'->>'companyName' AS customer_name,
  d.snapshot->'order'->>'orderNumber'    AS order_number
FROM documents d
LEFT JOIN orders o ON o.id = d.order_id
WHERE d.order_id IS NULL OR o.deleted_at IS NULL;
