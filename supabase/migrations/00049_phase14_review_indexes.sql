-- ============================================================================
-- 00049: Indexes to keep the new Phase 3-4 RPCs fast at scale
-- ============================================================================
-- The post-Phase-4 performance review flagged two index gaps that hurt the
-- "all-time" date range on get_customer_items_summary and
-- get_sold_products_breakdown:
--
-- 1. orders has idx_orders_customer (customer_id) and idx_orders_date
--    (order_date) separately, but neither covers the very common
--    customer_id + order_date range scan. The summary RPC hits this pattern
--    for every customer drill-down.
--
-- 2. order_refund_items only has indexes on refund_id and order_item_id.
--    The breakdown / summary RPCs aggregate refunds by product_id, which
--    forces a full scan of order_refund_items even for small date ranges.
--
-- Safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_date
  ON orders (customer_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_order_refund_items_product
  ON order_refund_items (product_id);
