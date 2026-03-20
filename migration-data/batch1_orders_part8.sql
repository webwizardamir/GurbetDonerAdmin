WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-353', m.new_id, 'completed'::order_status, NULL, 153264, 0, 13801, 0, 167065, '2024-03-27'::date, NULL, 'WooCommerce #353', '2024-03-27T07:38:00.000Z'::timestamptz, '2024-03-27T07:38:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 8::decimal, 580::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590::int),
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
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 7::decimal, 575::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 405::int),
  ('FALAFEL', NULL, 10::decimal, 560::int),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 0::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 1::decimal, 504::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 11::decimal, 680::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-384', m.new_id, 'completed'::order_status, NULL, 15550, 0, 1400, 0, 16950, '2024-03-28'::date, NULL, 'WooCommerce #384', '2024-03-28T08:50:00.000Z'::timestamptz, '2024-03-28T08:50:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-385', m.new_id, 'cancelled'::order_status, NULL, 16902, 0, 0, 0, 16902, '2024-03-28'::date, NULL, 'WooCommerce #385', '2024-03-28T08:52:00.000Z'::timestamptz, '2024-03-28T08:52:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Grillroom Hawaii Naaldwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-386', m.new_id, 'completed'::order_status, 'bank', 8200, 0, 738, 0, 8938, '2024-03-28'::date, NULL, 'WooCommerce #386', '2024-03-28T08:54:00.000Z'::timestamptz, '2024-03-28T08:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eetcafe Elif'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS  CLASSIC', NULL, 8::decimal, 775::int),
  ('CHEESE STICKS (MOZZARELLA STICKS)', NULL, 2::decimal, 1000::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-387', m.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-28'::date, NULL, 'WooCommerce #387', '2024-03-28T08:57:00.000Z'::timestamptz, '2024-03-28T08:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Baronie Doner Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-389', m.new_id, 'completed'::order_status, NULL, 13040, 0, 1174, 0, 14214, '2024-03-28'::date, NULL, 'WooCommerce #389', '2024-03-28T12:57:00.000Z'::timestamptz, '2024-03-28T12:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-393', m.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-29'::date, NULL, 'WooCommerce #393', '2024-03-29T09:03:00.000Z'::timestamptz, '2024-03-29T09:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Seryana'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-394', m.new_id, 'completed'::order_status, NULL, 1475, 0, 133, 0, 1608, '2024-03-29'::date, NULL, 'WooCommerce #394', '2024-03-29T09:05:00.000Z'::timestamptz, '2024-03-29T09:05:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Doner en Zo'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-395', m.new_id, 'completed'::order_status, NULL, 4613, 0, 415, 0, 5028, '2024-03-29'::date, NULL, 'WooCommerce #395', '2024-03-29T09:14:00.000Z'::timestamptz, '2024-03-29T09:14:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Food Staion'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 1::decimal, 1438::int),
  ('Excellence Patat', NULL, 1::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-396', m.new_id, 'completed'::order_status, NULL, 4650, 0, 419, 0, 5069, '2024-03-29'::date, NULL, 'WooCommerce #396', '2024-03-29T09:15:00.000Z'::timestamptz, '2024-03-29T09:15:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Snackbar Downtown'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550::int)
) AS v(pname, psku, qty, price);
