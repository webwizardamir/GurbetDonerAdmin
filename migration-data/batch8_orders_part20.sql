WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2575', m.new_id, 'completed'::order_status, 'bank', 9625, 0, 0, 867, 867, 0, 10492, '2024-11-26'::date, NULL, 'WooCommerce #2575', '2024-11-26T08:20:00.000Z'::timestamptz, '2024-11-26T08:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Serar''s'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 5::decimal, 1550::int),
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,50)', NULL, 1::decimal, 1875::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2576', m.new_id, 'completed'::order_status, 'bank', 29170, 0, 0, 2627, 2627, 0, 31797, '2024-11-27'::date, NULL, 'WooCommerce #2576', '2024-11-27T10:02:00.000Z'::timestamptz, '2024-11-27T10:02:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'ZAM ZAM XL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2577', m.new_id, 'completed'::order_status, 'bank', 16720, 0, 0, 1505, 1505, 0, 18225, '2024-11-27'::date, NULL, 'WooCommerce #2577', '2024-11-27T10:23:00.000Z'::timestamptz, '2024-11-27T10:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2580', m.new_id, 'completed'::order_status, 'bank', 1144000, 0, 0, 102960, 102960, 0, 1246960, '2024-11-26'::date, NULL, 'WooCommerce #2580', '2024-11-26T14:12:00.000Z'::timestamptz, '2024-11-26T14:12:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Krijgsman Food & Service'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND CHICKEN KEBAB (2,5 kg zak)', NULL, 1760::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2583', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2024-11-28'::date, NULL, 'WooCommerce #2583', '2024-11-28T07:36:00.000Z'::timestamptz, '2024-11-28T07:36:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Simit Paleis A.S.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2587', m.new_id, 'completed'::order_status, 'bank', 111000, 0, 0, 9990, 9990, 0, 120990, '2024-11-27'::date, NULL, 'WooCommerce #2587', '2024-11-27T08:06:00.000Z'::timestamptz, '2024-11-27T08:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Emigro B.V'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken kebab Spies 10 KG', NULL, 300::decimal, 370::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2588', m.new_id, 'completed'::order_status, 'bank', 90519, 0, 0, 8147, 8147, 0, 98666, '2024-11-27'::date, NULL, 'WooCommerce #2588', '2024-11-27T12:46:00.000Z'::timestamptz, '2024-11-27T12:46:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Can Market'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Fillet Bites 800 GR', '5902082428688', 10::decimal, 599::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 8::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 4::decimal, 580::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 13::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Natural Burger 800 GR', '5902082448723', 8::decimal, 599::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 468::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2589', m.new_id, 'completed'::order_status, 'bank', 46500, 0, 0, 4185, 4185, 0, 50685, '2024-11-28'::date, NULL, 'WooCommerce #2589', '2024-11-28T08:06:00.000Z'::timestamptz, '2024-11-28T08:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Rotonde Kebab'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 30::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2590', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2024-11-28'::date, NULL, 'WooCommerce #2590', '2024-11-28T08:07:00.000Z'::timestamptz, '2024-11-28T08:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yeni Bahar BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2591', m.new_id, 'completed'::order_status, 'bank', 13000, 0, 0, 1170, 1170, 0, 14170, '2024-11-28'::date, NULL, 'WooCommerce #2591', '2024-11-28T08:09:00.000Z'::timestamptz, '2024-11-28T08:09:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'AKK Doner Haarlem'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int)
) AS v(pname, psku, qty, price);
