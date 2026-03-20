WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3406', m.new_id, 'completed'::order_status, 'bank', 14790, 0, 0, 1332, 1332, 0, 16122, '2025-02-05'::date, NULL, 'WooCommerce #3406', '2025-02-05T11:34:00.000Z'::timestamptz, '2025-02-05T11:34:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Berat Supermarket'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3407', m.new_id, 'completed'::order_status, 'bank', 10357, 0, 0, 932, 932, 0, 11289, '2025-02-05'::date, NULL, 'WooCommerce #3407', '2025-02-05T12:02:00.000Z'::timestamptz, '2025-02-05T12:02:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yahya VOF'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 6::decimal, 527::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 6::decimal, 456::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3408', m.new_id, 'completed'::order_status, 'bank', 26890, 0, 0, 2420, 2420, 0, 29310, '2025-02-05'::date, NULL, 'WooCommerce #3408', '2025-02-05T12:31:00.000Z'::timestamptz, '2025-02-05T12:31:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'AG Emmoglu Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Chicken Fillet Bites 800 GR', '5902082428688', 10::decimal, 599::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3409', m.new_id, 'completed'::order_status, 'bank', 24874, 0, 0, 2239, 2239, 0, 27113, '2025-02-05'::date, NULL, 'WooCommerce #3409', '2025-02-05T12:47:00.000Z'::timestamptz, '2025-02-05T12:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'EKO Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3410', m.new_id, 'completed'::order_status, 'bank', 14000, 0, 0, 1260, 1260, 0, 15260, '2025-02-05'::date, NULL, 'WooCommerce #3410', '2025-02-05T13:33:00.000Z'::timestamptz, '2025-02-05T13:33:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 8::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3411', m.new_id, 'completed'::order_status, 'bank', 30000, 0, 0, 2701, 2701, 0, 32701, '2025-02-04'::date, NULL, 'WooCommerce #3411', '2025-02-04T07:45:00.000Z'::timestamptz, '2025-02-04T07:45:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 15::decimal, 1550::int),
  ('Mix Shoarma (NL)', NULL, 10::decimal, 675::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3412', m.new_id, 'completed'::order_status, 'bank', 40850, 0, 0, 3677, 3677, 0, 44527, '2025-02-04'::date, NULL, 'WooCommerce #3412', '2025-02-04T07:54:00.000Z'::timestamptz, '2025-02-04T07:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Nasib'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 22::decimal, 1550::int),
  ('Mix Shoarma (NL)', NULL, 10::decimal, 675::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3413', m.new_id, 'completed'::order_status, 'bank', 20500, 0, 0, 1846, 1846, 0, 22346, '2025-02-04'::date, NULL, 'WooCommerce #3413', '2025-02-04T07:54:00.000Z'::timestamptz, '2025-02-04T07:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 5::decimal, 1650::int),
  ('Mix - Shoarma ( Lam- kalkoen) (PL) (€6,50)', NULL, 10::decimal, 650::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 10::decimal, 575::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3414', m.new_id, 'completed'::order_status, 'bank', 12800, 0, 0, 1152, 1152, 0, 13952, '2025-02-04'::date, NULL, 'WooCommerce #3414', '2025-02-04T07:55:00.000Z'::timestamptz, '2025-02-04T07:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eethuis Ak-AL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 6/6', NULL, 8::decimal, 1600::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3415', m.new_id, 'completed'::order_status, 'bank', 23100, 0, 0, 2079, 2079, 0, 25179, '2025-02-04'::date, NULL, 'WooCommerce #3415', '2025-02-04T07:56:00.000Z'::timestamptz, '2025-02-04T07:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Çiçek'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 14::decimal, 1650::int)
) AS v(pname, psku, qty, price);
