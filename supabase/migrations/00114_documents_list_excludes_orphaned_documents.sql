-- ============================================================================
-- 00114: documents_list also hides documents whose order no longer exists
-- ============================================================================
-- Follow-on to 00113, and a deliberate reversal of the one exception it made.
--
-- 00113 kept `order_id IS NULL` rows on the reasoning that `purge_order` NULLs
-- the FK rather than deleting the document, so an orphaned invoice is the last
-- surviving record of a permanently-deleted order. True, but it is the wrong
-- place to keep that record: emptying the Prullenbak turned the trashed rows
-- 00113 had just hidden straight back into VISIBLE orphans, and the owner met
-- them again in the bulk-send dialog as "Order unavailable"
-- (documents.bulkSend.reason.noOrder, raised by the `no_order` block when
-- order_id is NULL). Hiding a document only until the bin is emptied is the
-- worst of both worlds.
--
-- Owner's call, made twice: a document whose order does not exist is not a
-- sale and does not belong in the register you read to see what is owed.
--
-- 🚨 UNLIKE 00113, THIS IS NOT REVERSIBLE FROM THE UI. A trashed order can be
-- restored and its invoice returns; a purged order is gone, so these documents
-- can never come back into the list by any user action. The rows are NOT
-- deleted -- `documents` is untouched and every snapshot is intact -- but the
-- only way to see them again is to query the base table or revert this view.
-- The invoice numbers stay consumed either way (numbering is a global
-- sequence), so the register now has unexplained gaps: Melek 11 documents
-- (8 invoices incl. FC-08642/FC-08641/FC-08497, 2 proformas, 1 packing slip),
-- Gurbet 3 invoices (GD00042, GD00035, FC-00015). If an accountant ever asks
-- about a gap, the answer is "that order was purged" and the evidence is:
--   SELECT * FROM documents WHERE order_id IS NULL;
--
-- INNER JOIN does both jobs at once -- it drops the NULL-FK rows by
-- construction, so the `d.order_id IS NULL OR ...` term from 00113 is gone
-- rather than merely unused.
--
-- security_invoker = true => the view runs with the QUERYING user's privileges,
-- so the documents RLS (admin-only SELECT, 00071) and the 00095 hidden-order
-- gate still apply. Do NOT drop it or this leaks documents to any
-- authenticated user (incl. portal customers).
--
-- ⚠️ The join is now INNER under security_invoker, which means a row the caller
-- cannot see in `orders` also removes the document. That is currently harmless
-- -- the only orders predicate is `hidden_from_managers`, and the documents
-- policy already removes those same documents for a manager -- but if a future
-- orders policy hides rows the documents policy does not, this turns into a
-- silent per-role difference in the register. Re-check both policies together.
--
-- Column list, types and order are unchanged from 00088/00113, so CREATE OR
-- REPLACE succeeds without dropping dependents.
-- ============================================================================

CREATE OR REPLACE VIEW documents_list
WITH (security_invoker = true) AS
SELECT
  d.*,
  d.snapshot->'customer'->>'companyName' AS customer_name,
  d.snapshot->'order'->>'orderNumber'    AS order_number
FROM documents d
JOIN orders o ON o.id = d.order_id
WHERE o.deleted_at IS NULL;
