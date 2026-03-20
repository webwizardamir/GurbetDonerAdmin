WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-538', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2024-04-16'::date, NULL, 'WooCommerce #538', '2024-04-16T09:02:00.000Z'::timestamptz, '2024-04-16T09:02:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Salama Doner Pizza'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-539', m.new_id, 'completed'::order_status, 'bank', 48354, 0, 0, 4352, 4352, 0, 52706, '2024-04-16'::date, NULL, 'WooCommerce #539', '2024-04-16T12:03:00.000Z'::timestamptz, '2024-04-16T12:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 16::decimal, 1625::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 8::decimal, 1438::int),
  ('Excellence Patat', NULL, 7::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-540', m.new_id, 'completed'::order_status, 'bank', 8125, 0, 0, 731, 731, 0, 8856, '2024-04-17'::date, NULL, 'WooCommerce #540', '2024-04-17T07:13:00.000Z'::timestamptz, '2024-04-17T07:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eetcafe Elif'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 5::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-541', m.new_id, 'completed'::order_status, NULL, 23402, 0, 0, 2107, 2107, 0, 25509, '2024-04-17'::date, NULL, 'WooCommerce #541', '2024-04-17T07:13:00.000Z'::timestamptz, '2024-04-17T07:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Grillroom Hawaii Naaldwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int),
  ('Excellence Patat', NULL, 3::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-542', m.new_id, 'completed'::order_status, 'bank', 101624, 0, 0, 9151, 9151, 0, 110775, '2024-04-17'::date, NULL, 'WooCommerce #542', '2024-04-17T07:42:00.000Z'::timestamptz, '2024-04-17T07:42:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Serdar Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 0::decimal, 700::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 575::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 612::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 482::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-544', m.new_id, 'completed'::order_status, NULL, 31000, 0, 0, 2790, 2790, 0, 33790, '2024-04-17'::date, NULL, 'WooCommerce #544', '2024-04-17T17:31:00.000Z'::timestamptz, '2024-04-17T17:31:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yahya VOF'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-546', m.new_id, 'completed'::order_status, 'cash', 2500, 0, 0, 225, 225, 0, 2725, '2024-04-18'::date, NULL, 'WooCommerce #546', '2024-04-18T10:27:00.000Z'::timestamptz, '2024-04-18T10:27:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Orange Food Group B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 4::decimal, 625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-547', m.new_id, 'completed'::order_status, 'bank', 58059, 0, 0, 5226, 5226, 0, 63285, '2024-04-18'::date, NULL, 'WooCommerce #547', '2024-04-18T12:34:00.000Z'::timestamptz, '2024-04-18T12:34:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Can Market'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 4::decimal, 580::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 2::decimal, 612::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 5::decimal, 625::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 3::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 19::decimal, 300::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 4::decimal, 425::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-548', m.new_id, 'completed'::order_status, NULL, 20571, 0, 0, 1852, 1852, 0, 22423, '2024-04-18'::date, NULL, 'WooCommerce #548', '2024-04-18T14:35:00.000Z'::timestamptz, '2024-04-18T14:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 3::decimal, 625::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 1::decimal, 575::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 3::decimal, 575::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 3::decimal, 612::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 2::decimal, 460::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-549', m.new_id, 'completed'::order_status, 'bank', 15500, 0, 0, 1395, 1395, 0, 16895, '2024-04-18'::date, NULL, 'WooCommerce #549', '2024-04-18T17:51:00.000Z'::timestamptz, '2024-04-18T17:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Express'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);
