WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2790', m.new_id, 'completed'::order_status, 'bank', 24900, 1650, 1650, 2093, 2093, 0, 25343, '2024-12-13'::date, NULL, 'WooCommerce #2790', '2024-12-13T08:03:00.000Z'::timestamptz, '2024-12-13T08:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 15::decimal, 1550::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2791', m.new_id, 'completed'::order_status, 'bank', 18700, 1650, 1650, 1535, 1535, 0, 18585, '2024-12-13'::date, NULL, 'WooCommerce #2791', '2024-12-13T08:04:00.000Z'::timestamptz, '2024-12-13T08:04:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Pizza'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 11::decimal, 1550::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2793', m.new_id, 'completed'::order_status, 'bank', 26750, 1650, 1650, 2259, 2259, 0, 27359, '2024-12-13'::date, NULL, 'WooCommerce #2793', '2024-12-13T08:05:00.000Z'::timestamptz, '2024-12-13T08:05:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Tasty Corner Delft'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA ( Lam- kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Excellence Patat 9/9', NULL, 12::decimal, 1550::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2794', m.new_id, 'completed'::order_status, 'cash', 9400, 1650, 1650, 698, 698, 0, 8448, '2024-12-13'::date, NULL, 'WooCommerce #2794', '2024-12-13T08:06:00.000Z'::timestamptz, '2024-12-13T08:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'bakkerij Aksu'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 5::decimal, 1550::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2795', m.new_id, 'completed'::order_status, 'bank', 24640, 0, 0, 2218, 2218, 0, 26858, '2024-12-13'::date, NULL, 'WooCommerce #2795', '2024-12-13T08:07:00.000Z'::timestamptz, '2024-12-13T08:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Aktas Supermarkt & Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 20::decimal, 572::int),
  ('SOLICED AND RASTED BEEF KEBAB (0,8GR)', '5902082427988', 20::decimal, 660::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2796', m.new_id, 'completed'::order_status, 'bank', 47540, 0, 0, 4279, 4279, 0, 51819, '2024-12-13'::date, NULL, 'WooCommerce #2796', '2024-12-13T08:17:00.000Z'::timestamptz, '2024-12-13T08:17:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 468::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456::int),
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2798', m.new_id, 'completed'::order_status, 'bank', 16500, 0, 0, 1485, 1485, 0, 17985, '2024-12-13'::date, NULL, 'WooCommerce #2798', '2024-12-13T13:45:00.000Z'::timestamptz, '2024-12-13T13:45:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Arya Eethuis Leiden'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 10::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2802', m.new_id, 'completed'::order_status, 'cash', 8050, 0, 0, 725, 725, 0, 8775, '2024-12-16'::date, NULL, 'WooCommerce #2802', '2024-12-16T07:50:00.000Z'::timestamptz, '2024-12-16T07:50:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Seda Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 3::decimal, 1650::int),
  ('Excellence Patat 9/9', NULL, 2::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2803', m.new_id, 'completed'::order_status, 'bank', 14050, 1650, 1650, 1116, 1116, 0, 13516, '2024-12-16'::date, NULL, 'WooCommerce #2803', '2024-12-16T07:51:00.000Z'::timestamptz, '2024-12-16T07:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sohbet'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 8::decimal, 1550::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2804', m.new_id, 'completed'::order_status, 'bank', 13700, 0, 0, 1233, 1233, 0, 14933, '2024-12-16'::date, NULL, 'WooCommerce #2804', '2024-12-16T07:52:00.000Z'::timestamptz, '2024-12-16T07:52:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550::int)
) AS v(pname, psku, qty, price);
