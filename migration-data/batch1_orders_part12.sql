WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-450', m.new_id, 'completed'::order_status, NULL, 35100, 0, 3159, 0, 38259, '2024-04-05'::date, NULL, 'WooCommerce #450', '2024-04-05T08:17:00.000Z'::timestamptz, '2024-04-05T08:17:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Indoor SpeelParadijs ZuiderPark'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000::int),
  ('Excellence Patat', NULL, 10::decimal, 1550::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 32::decimal, 550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-451', m.new_id, 'completed'::order_status, NULL, 8395, 0, 756, 0, 9151, '2024-04-05'::date, NULL, 'WooCommerce #451', '2024-04-05T08:19:00.000Z'::timestamptz, '2024-04-05T08:19:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'baba de shoarmakoning'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 1::decimal, 720::int),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-452', m.new_id, 'completed'::order_status, NULL, 14250, 0, 1283, 0, 15533, '2024-04-05'::date, NULL, 'WooCommerce #452', '2024-04-05T08:22:00.000Z'::timestamptz, '2024-04-05T08:22:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Alesta Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-453', m.new_id, 'completed'::order_status, NULL, 7750, 0, 698, 0, 8448, '2024-04-05'::date, NULL, 'WooCommerce #453', '2024-04-05T14:07:00.000Z'::timestamptz, '2024-04-05T14:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Al Bakkerij Herenstraat'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-456', m.new_id, 'completed'::order_status, 'bank', 32699, 0, 2943, 0, 35642, '2024-04-05'::date, NULL, 'WooCommerce #456', '2024-04-05T16:23:00.000Z'::timestamptz, '2024-04-05T16:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Orange Food Group B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 5::decimal, 456::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 7::decimal, 482::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 1::decimal, 385::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 1::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 3::decimal, 614::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 1::decimal, 527::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 2::decimal, 487::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 4::decimal, 425::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 6::decimal, 660::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 4::decimal, 437::int)
) AS v(pname, psku, qty, price);
