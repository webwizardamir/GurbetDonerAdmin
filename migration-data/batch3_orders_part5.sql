WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-771', m.new_id, 'completed'::order_status, 'bank', 31000, 0, 0, 2790, 2790, 0, 33790, '2024-05-09'::date, NULL, 'WooCommerce #771', '2024-05-09T12:03:00.000Z'::timestamptz, '2024-05-09T12:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-772', m.new_id, 'completed'::order_status, 'bank', 12400, 0, 0, 1116, 1116, 0, 13516, '2024-05-09'::date, NULL, 'WooCommerce #772', '2024-05-09T14:35:00.000Z'::timestamptz, '2024-05-09T14:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Al Bakkerij Herenstraat'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-773', m.new_id, 'completed'::order_status, 'bank', 13950, 0, 0, 1256, 1256, 0, 15206, '2024-05-10'::date, NULL, 'WooCommerce #773', '2024-05-10T07:09:00.000Z'::timestamptz, '2024-05-10T07:09:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Katwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('Kentucky TENDERS  CLASSIC', NULL, 8::decimal, 775::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-774', m.new_id, 'completed'::order_status, 'bank', 31000, 0, 0, 2790, 2790, 0, 33790, '2024-05-10'::date, NULL, 'WooCommerce #774', '2024-05-10T07:09:00.000Z'::timestamptz, '2024-05-10T07:09:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Noordwijkerhout'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-775', m.new_id, 'completed'::order_status, 'bank', 22500, 0, 0, 2025, 2025, 0, 24525, '2024-05-10'::date, NULL, 'WooCommerce #775', '2024-05-10T07:10:00.000Z'::timestamptz, '2024-05-10T07:10:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Snackbar Onder Den Toren'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,50)', NULL, 12::decimal, 1875::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-776', m.new_id, 'completed'::order_status, 'bank', 4425, 0, 0, 398, 398, 0, 4823, '2024-05-10'::date, NULL, 'WooCommerce #776', '2024-05-10T07:11:00.000Z'::timestamptz, '2024-05-10T07:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'baba de shoarmakoning'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (17*118 GR)', NULL, 3::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-777', m.new_id, 'completed'::order_status, 'bank', 8420, 0, 0, 758, 758, 0, 9178, '2024-05-10'::date, NULL, 'WooCommerce #777', '2024-05-10T07:12:00.000Z'::timestamptz, '2024-05-10T07:12:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 468::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-779', m.new_id, 'completed'::order_status, 'bank', 12100, 0, 0, 1089, 1089, 0, 13189, '2024-05-10'::date, NULL, 'WooCommerce #779', '2024-05-10T15:49:00.000Z'::timestamptz, '2024-05-10T15:49:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int),
  ('Chicken Chica Spicy (€5,90)', '5902082462613', 4::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-780', m.new_id, 'completed'::order_status, 'bank', 51020, 0, 0, 4592, 4592, 0, 55612, '2024-05-14'::date, NULL, 'WooCommerce #780', '2024-05-14T07:50:00.000Z'::timestamptz, '2024-05-14T07:50:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'JINGDONG RETAIL (NETHERLANDS) B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 20::decimal, 300::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 20::decimal, 456::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 20::decimal, 531::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 20::decimal, 456::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int),
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 8::decimal, 485::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-782', m.new_id, 'completed'::order_status, 'bank', 28000, 0, 0, 2520, 2520, 0, 30520, '2024-05-11'::date, NULL, 'WooCommerce #782', '2024-05-11T07:32:00.000Z'::timestamptz, '2024-05-11T07:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 16::decimal, 1750::int)
) AS v(pname, psku, qty, price);
