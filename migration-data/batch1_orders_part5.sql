WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-304', m.new_id, 'completed'::order_status, NULL, 35060, 0, 3155, 0, 38215, '2024-03-21'::date, NULL, 'WooCommerce #304', '2024-03-21T11:37:00.000Z'::timestamptz, '2024-03-21T11:37:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820::int),
  ('Excellence Patat', NULL, 10::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-305', m.new_id, 'completed'::order_status, NULL, 11712, 0, 1054, 0, 12766, '2024-03-21'::date, NULL, 'WooCommerce #305', '2024-03-21T11:40:00.000Z'::timestamptz, '2024-03-21T11:40:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Bella Maria'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('INEGOL KOFTE (CEVAPCICI 25gr) 1Kg', NULL, 8::decimal, 745::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-306', m.new_id, 'completed'::order_status, NULL, 25060, 0, 2256, 0, 27316, '2024-03-22'::date, NULL, 'WooCommerce #306', '2024-03-22T08:20:00.000Z'::timestamptz, '2024-03-22T08:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Seryana'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 300::int),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 520::int),
  ('CRISPY BURGER', NULL, 1::decimal, 850::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550::int),
  ('FALAFEL', NULL, 1::decimal, 560::int),
  ('Excellence Patat', NULL, 14::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-307', m.new_id, 'completed'::order_status, NULL, 18200, 0, 1638, 0, 19838, '2024-03-22'::date, NULL, 'WooCommerce #307', '2024-03-22T08:35:00.000Z'::timestamptz, '2024-03-22T08:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 8::decimal, 600::int),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 4::decimal, 1375::int),
  ('Chicken Chica Hot (€5,90)', '5902082462613', 4::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-309', m.new_id, 'completed'::order_status, NULL, 17320, 0, 1559, 0, 18879, '2024-03-22'::date, NULL, 'WooCommerce #309', '2024-03-22T08:39:00.000Z'::timestamptz, '2024-03-22T08:39:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Rotonde Kebab'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('AKCABAAT KOFTE (45*45gr)', NULL, 6::decimal, 1595::int),
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-311', m.new_id, 'completed'::order_status, NULL, 9300, 0, 837, 0, 10137, '2024-03-22'::date, NULL, 'WooCommerce #311', '2024-03-22T10:38:00.000Z'::timestamptz, '2024-03-22T10:38:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Al Bakkerij Herenstraat'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-320', m.new_id, 'completed'::order_status, 'bank', 44709, 0, 4024, 0, 48733, '2024-03-22'::date, NULL, 'WooCommerce #320', '2024-03-22T14:32:00.000Z'::timestamptz, '2024-03-22T14:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Orange Food Group B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 3::decimal, 456::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 5::decimal, 482::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 7::decimal, 385::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 6::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 4::decimal, 614::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 527::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 5::decimal, 487::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 5::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 2::decimal, 660::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 8::decimal, 624::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 4::decimal, 531::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 4::decimal, 669::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-321', m.new_id, 'completed'::order_status, NULL, 6500, 0, 585, 0, 7085, '2024-03-23'::date, NULL, 'WooCommerce #321', '2024-03-23T12:27:00.000Z'::timestamptz, '2024-03-23T12:27:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-322', m.new_id, 'refunded'::order_status, NULL, 46500, 0, 0, 0, 46500, '2024-03-24'::date, NULL, 'WooCommerce #322', '2024-03-24T11:19:00.000Z'::timestamptz, '2024-03-24T11:19:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 0::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-323', m.new_id, 'completed'::order_status, NULL, 39000, 0, 3510, 0, 42510, '2024-03-24'::date, NULL, 'WooCommerce #323', '2024-03-24T16:36:00.000Z'::timestamptz, '2024-03-24T16:36:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ramses'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 24::decimal, 1625::int)
) AS v(pname, psku, qty, price);
