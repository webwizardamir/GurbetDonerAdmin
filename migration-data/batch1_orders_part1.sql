WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-217', m.new_id, 'completed'::order_status, NULL, 96608, 0, 8699, 0, 105307, '2024-03-08'::date, NULL, 'WooCommerce #217', '2024-03-08T10:13:00.000Z'::timestamptz, '2024-03-08T10:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Orange Food Group B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460::int),
  ('CRISPY TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('CRISPY TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 2::decimal, 548::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 2::decimal, 580::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 1::decimal, 680::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 2::decimal, 712::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 4::decimal, 700::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-221', m.new_id, 'completed'::order_status, NULL, 12400, 0, 1116, 0, 13516, '2024-03-11'::date, NULL, 'WooCommerce #221', '2024-03-11T08:06:00.000Z'::timestamptz, '2024-03-11T08:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Drean Kebab 1'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-222', m.new_id, 'completed'::order_status, NULL, 23160, 0, 2084, 0, 25244, '2024-03-11'::date, NULL, 'WooCommerce #222', '2024-03-11T08:10:00.000Z'::timestamptz, '2024-03-11T08:10:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Katwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825::int),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-223', m.new_id, 'completed'::order_status, NULL, 27400, 0, 2466, 0, 29866, '2024-03-11'::date, NULL, 'WooCommerce #223', '2024-03-11T08:32:00.000Z'::timestamptz, '2024-03-11T08:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Noordwijkerhout'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775::int),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 4::decimal, 550::int),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-225', m.new_id, 'completed'::order_status, NULL, 10850, 0, 977, 0, 11827, '2024-03-11'::date, NULL, 'WooCommerce #225', '2024-03-11T08:43:00.000Z'::timestamptz, '2024-03-11T08:43:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sohbet bbq cafe Restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-227', m.new_id, 'completed'::order_status, NULL, 30000, 0, 2700, 0, 32700, '2024-03-11'::date, NULL, 'WooCommerce #227', '2024-03-11T09:25:00.000Z'::timestamptz, '2024-03-11T09:25:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1500::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-229', m.new_id, 'completed'::order_status, NULL, 108386, 0, 9755, 0, 118141, '2024-03-12'::date, NULL, 'WooCommerce #229', '2024-03-12T08:35:00.000Z'::timestamptz, '2024-03-12T08:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-AL Eethuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 40::decimal, 1625::int),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 12::decimal, 1438::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580::int),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 2::decimal, 1595::int),
  ('CHICKEN WINGS CLASSIC', NULL, 16::decimal, 520::int),
  ('CHICKEN WINGS BARBECUE', NULL, 16::decimal, 600::int),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 4::decimal, 550::int),
  ('FALAFEL', NULL, 4::decimal, 560::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-230', m.new_id, 'completed'::order_status, NULL, 15150, 0, 1364, 0, 16514, '2024-03-12'::date, NULL, 'WooCommerce #230', '2024-03-12T08:48:00.000Z'::timestamptz, '2024-03-12T08:48:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Salama Doner Pizza'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 2::decimal, 1375::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-232', m.new_id, 'refunded'::order_status, NULL, 13000, 0, 1170, 0, 14170, '2024-03-12'::date, NULL, 'WooCommerce #232', '2024-03-12T08:53:00.000Z'::timestamptz, '2024-03-12T08:53:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ons Bakkertje de veen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 0::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-233', m.new_id, 'completed'::order_status, NULL, 12000, 0, 1080, 0, 13080, '2024-03-12'::date, NULL, 'WooCommerce #233', '2024-03-12T09:53:00.000Z'::timestamptz, '2024-03-12T09:53:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria Roomburg'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 4::decimal, 1375::int),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0::int)
) AS v(pname, psku, qty, price);
