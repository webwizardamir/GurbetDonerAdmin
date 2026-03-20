WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-234', m.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-12'::date, NULL, 'WooCommerce #234', '2024-03-12T12:57:00.000Z'::timestamptz, '2024-03-12T12:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Bella Maria'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-236', m.new_id, 'completed'::order_status, NULL, 24960, 0, 2247, 0, 27207, '2024-03-12'::date, NULL, 'WooCommerce #236', '2024-03-12T13:07:00.000Z'::timestamptz, '2024-03-12T13:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Mir Doner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int),
  ('Excellence Patat', NULL, 1::decimal, 1550::int),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550::int),
  ('Chicken CRISPY WINGS', NULL, 8::decimal, 575::int),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520::int),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 750::int),
  ('CRISPY BURGER', NULL, 1::decimal, 850::int),
  ('CHICKEN SCHNITZEL', NULL, 1::decimal, 825::int),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-238', m.new_id, 'completed'::order_status, NULL, 46500, 0, 4185, 0, 50685, '2024-03-13'::date, NULL, 'WooCommerce #238', '2024-03-13T08:27:00.000Z'::timestamptz, '2024-03-13T08:27:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij de Hazelaar'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 30::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-240', m.new_id, 'completed'::order_status, NULL, 6200, 0, 558, 0, 6758, '2024-03-13'::date, NULL, 'WooCommerce #240', '2024-03-13T14:03:00.000Z'::timestamptz, '2024-03-13T14:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-244', m.new_id, 'completed'::order_status, 'bank', 17660, 0, 1589, 0, 19249, '2024-03-13'::date, NULL, 'WooCommerce #244', '2024-03-13T15:13:00.000Z'::timestamptz, '2024-03-13T15:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Massada Roelofarendsveen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('CHICKEN KIPCORN', NULL, 8::decimal, 620::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-245', m.new_id, 'completed'::order_status, NULL, 41900, 0, 3771, 0, 45671, '2024-03-14'::date, NULL, 'WooCommerce #245', '2024-03-14T08:23:00.000Z'::timestamptz, '2024-03-14T08:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Indoor SpeelParadijs ZuiderPark'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 48::decimal, 550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-246', m.new_id, 'completed'::order_status, NULL, 34840, 0, 3136, 0, 37976, '2024-03-14'::date, NULL, 'WooCommerce #246', '2024-03-14T08:42:00.000Z'::timestamptz, '2024-03-14T08:42:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Gouden Wok Zuiderpark'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ONION RINGS', NULL, 8::decimal, 430::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 18::decimal, 700::int),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775::int),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550::int),
  ('Pizza Meat 1kg', '5902082461517', 10::decimal, 820::int),
  ('Sliced and Roasted Sucuk Kebab', '5902082462316', 10::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-251', m.new_id, 'completed'::order_status, NULL, 20347, 0, 1832, 0, 22179, '2024-03-13'::date, NULL, 'WooCommerce #251', '2024-03-13T17:00:00.000Z'::timestamptz, '2024-03-13T17:00:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Grillroom Hawaii Naaldwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 4::decimal, 1438::int),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-252', m.new_id, 'completed'::order_status, NULL, 49525, 0, 4458, 0, 53983, '2024-03-13'::date, NULL, 'WooCommerce #252', '2024-03-13T17:04:00.000Z'::timestamptz, '2024-03-13T17:04:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Rotonde Kebab'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550::int),
  ('CRISPY TENDERS  CLASSIC', NULL, 1::decimal, 775::int),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520::int),
  ('FALAFEL', NULL, 8::decimal, 560::int),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475::int),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 3::decimal, 1595::int),
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 8::decimal, 750::int),
  ('CRISPY BURGER', NULL, 8::decimal, 850::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-255', m.new_id, 'completed'::order_status, NULL, 15185, 0, 1367, 0, 16552, '2024-03-14'::date, NULL, 'WooCommerce #255', '2024-03-14T15:51:00.000Z'::timestamptz, '2024-03-14T15:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza BellaDonna'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 4::decimal, 1375::int),
  ('FALAFEL', NULL, 1::decimal, 560::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 300::int),
  ('Chicken CRISPY WINGS', NULL, 1::decimal, 575::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550::int),
  ('CHICKEN KIPCORN', NULL, 1::decimal, 620::int)
) AS v(pname, psku, qty, price);
