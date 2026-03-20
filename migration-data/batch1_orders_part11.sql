WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-431', m.new_id, 'completed'::order_status, NULL, 24875, 0, 2239, 0, 27114, '2024-04-02'::date, NULL, 'WooCommerce #431', '2024-04-02T13:40:00.000Z'::timestamptz, '2024-04-02T13:40:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-432', m.new_id, 'completed'::order_status, NULL, 27087, 0, 2438, 0, 29525, '2024-04-04'::date, NULL, 'WooCommerce #432', '2024-04-04T08:24:00.000Z'::timestamptz, '2024-04-04T08:24:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Grillroom Bomonti'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-433', m.new_id, 'completed'::order_status, NULL, 13650, 0, 1229, 0, 14879, '2024-04-04'::date, NULL, 'WooCommerce #433', '2024-04-04T08:28:00.000Z'::timestamptz, '2024-04-04T08:28:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eetcafe Elif'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('CHEESE NUGGETS', NULL, 11::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-434', m.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-04-04'::date, NULL, 'WooCommerce #434', '2024-04-04T08:31:00.000Z'::timestamptz, '2024-04-04T08:31:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-AL Eethuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-435', m.new_id, 'completed'::order_status, NULL, 10600, 0, 954, 0, 11554, '2024-04-04'::date, NULL, 'WooCommerce #435', '2024-04-04T08:32:00.000Z'::timestamptz, '2024-04-04T08:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dicle'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550::int),
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-437', m.new_id, 'completed'::order_status, NULL, 5660, 0, 509, 0, 6169, '2024-04-04'::date, NULL, 'WooCommerce #437', '2024-04-04T08:42:00.000Z'::timestamptz, '2024-04-04T08:42:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Seryana'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('FALAFEL', NULL, 5::decimal, 500::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 2::decimal, 580::int),
  ('CRISPY BURGER', NULL, 2::decimal, 700::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 1::decimal, 600::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-442', m.new_id, 'completed'::order_status, 'bank', 37405, 0, 3369, 0, 40774, '2024-04-04'::date, NULL, 'WooCommerce #442', '2024-04-04T11:11:00.000Z'::timestamptz, '2024-04-04T11:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'ZAM ZAM XL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 8::decimal, 487::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 4::decimal, 660::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 5::decimal, 385::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 2::decimal, 456::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 2::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 2::decimal, 456::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 4::decimal, 437::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 4::decimal, 482::int),
  ('FALAFEL (0.8kg)', '5902082432197', 4::decimal, 374::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 2::decimal, 527::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 5::decimal, 531::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 5::decimal, 669::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 2::decimal, 425::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 2::decimal, 426::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-447', m.new_id, 'completed'::order_status, NULL, 18752, 0, 1688, 0, 20440, '2024-04-05'::date, NULL, 'WooCommerce #447', '2024-04-05T08:12:00.000Z'::timestamptz, '2024-04-05T08:12:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-448', m.new_id, 'completed'::order_status, NULL, 13000, 0, 1170, 0, 14170, '2024-04-05'::date, NULL, 'WooCommerce #448', '2024-04-05T08:13:00.000Z'::timestamptz, '2024-04-05T08:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-449', m.new_id, 'completed'::order_status, NULL, 13200, 0, 1188, 0, 14388, '2024-04-05'::date, NULL, 'WooCommerce #449', '2024-04-05T08:14:00.000Z'::timestamptz, '2024-04-05T08:14:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Gouden Wok Zuiderpark'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664::int),
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820::int)
) AS v(pname, psku, qty, price);
