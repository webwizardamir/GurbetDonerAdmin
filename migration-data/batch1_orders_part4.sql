WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-280', m.new_id, 'completed'::order_status, NULL, 43452, 0, 3911, 0, 47363, '2024-03-19'::date, NULL, 'WooCommerce #280', '2024-03-19T09:20:00.000Z'::timestamptz, '2024-03-19T09:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 4::decimal, 1375::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 16::decimal, 1625::int),
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-281', m.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-19'::date, NULL, 'WooCommerce #281', '2024-03-19T09:23:00.000Z'::timestamptz, '2024-03-19T09:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Keizer Snacks'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN SCHNITZEL', NULL, 1::decimal, 0::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 0::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 0::int),
  ('CRISPY BURGER', NULL, 1::decimal, 0::int),
  ('FALAFEL', NULL, 1::decimal, 0::int),
  ('Excellence Patat', NULL, 1::decimal, 0::int),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 1::decimal, 0::int),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 0::int),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 0::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-282', m.new_id, 'completed'::order_status, NULL, 10850, 0, 977, 0, 11827, '2024-03-19'::date, NULL, 'WooCommerce #282', '2024-03-19T09:28:00.000Z'::timestamptz, '2024-03-19T09:28:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Salama Doner Pizza'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-283', m.new_id, 'completed'::order_status, NULL, 3510, 0, 316, 0, 3826, '2024-03-19'::date, NULL, 'WooCommerce #283', '2024-03-19T14:01:00.000Z'::timestamptz, '2024-03-19T14:01:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Doner en Zo'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550::int),
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775::int),
  ('FALAFEL', NULL, 1::decimal, 560::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-291', m.new_id, 'completed'::order_status, NULL, 3535, 0, 318, 0, 3853, '2024-03-20'::date, NULL, 'WooCommerce #291', '2024-03-20T08:58:00.000Z'::timestamptz, '2024-03-20T08:58:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Baran cafe turks restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550::int),
  ('FALAFEL', NULL, 1::decimal, 560::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int),
  ('MANTI', NULL, 1::decimal, 800::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-295', m.new_id, 'completed'::order_status, NULL, 8425, 0, 760, 0, 9185, '2024-03-20'::date, NULL, 'WooCommerce #295', '2024-03-20T10:07:00.000Z'::timestamptz, '2024-03-20T10:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eetcafe Elif'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER', NULL, 1::decimal, 850::int),
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 2::decimal, 1625::int),
  ('CHEESE STICKS (MOZZARELLA STICKS)', NULL, 2::decimal, 1000::int),
  ('Excellence Patat', NULL, 1::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-298', m.new_id, 'completed'::order_status, 'bank', 6400000, 0, 576000, 0, 6976000, '2024-03-20'::date, NULL, 'WooCommerce #298', '2024-03-20T14:06:00.000Z'::timestamptz, '2024-03-20T14:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Luiten Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kip doner ( 250 GR )Zonder E621', NULL, 8000::decimal, 800::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-300', m.new_id, 'completed'::order_status, NULL, 159989, 0, 14406, 0, 174395, '2024-03-20'::date, NULL, 'WooCommerce #300', '2024-03-20T14:19:00.000Z'::timestamptz, '2024-03-20T14:19:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 4::decimal, 580::int),
  ('CHICKEN BURGER (36x70 GR)(Supermarket)', '5902082460152', 6::decimal, 725::int),
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
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 9::decimal, 504::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', -2::decimal, 300::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-301', m.new_id, 'completed'::order_status, NULL, 48545, 0, 4370, 0, 52915, '2024-03-20'::date, NULL, 'WooCommerce #301', '2024-03-20T15:00:00.000Z'::timestamptz, '2024-03-20T15:00:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 13::decimal, 680::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700::int),
  ('Excellence Patat', NULL, 6::decimal, 1550::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-302', m.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-20'::date, NULL, 'WooCommerce #302', '2024-03-20T15:47:00.000Z'::timestamptz, '2024-03-20T15:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Mir Doner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0::int)
) AS v(pname, psku, qty, price);
