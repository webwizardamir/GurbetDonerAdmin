WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-338', m.new_id, 'completed'::order_status, NULL, 14250, 0, 1283, 0, 15533, '2024-03-25'::date, NULL, 'WooCommerce #338', '2024-03-25T17:44:00.000Z'::timestamptz, '2024-03-25T17:44:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Massada Roelofarendsveen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-339', m.new_id, 'completed'::order_status, 'bank', 11000, 0, 990, 0, 11990, '2024-03-25'::date, NULL, 'WooCommerce #339', '2024-03-25T17:46:00.000Z'::timestamptz, '2024-03-25T17:46:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Flames'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 8::decimal, 1375::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-342', m.new_id, 'completed'::order_status, NULL, 23900, 0, 2151, 0, 26051, '2024-03-26'::date, NULL, 'WooCommerce #342', '2024-03-26T07:38:00.000Z'::timestamptz, '2024-03-26T07:38:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dicle'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 12::decimal, 1625::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int),
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-343', m.new_id, 'completed'::order_status, NULL, 14000, 0, 1260, 0, 15260, '2024-03-26'::date, NULL, 'WooCommerce #343', '2024-03-26T07:41:00.000Z'::timestamptz, '2024-03-26T07:41:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 8::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-344', m.new_id, 'completed'::order_status, NULL, 11190, 0, 1008, 0, 12198, '2024-03-26'::date, NULL, 'WooCommerce #344', '2024-03-26T10:26:00.000Z'::timestamptz, '2024-03-26T10:26:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 3::decimal, 625::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 3::decimal, 625::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 3::decimal, 300::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-348', m.new_id, 'completed'::order_status, NULL, 46500, 0, 4185, 0, 50685, '2024-03-27'::date, NULL, 'WooCommerce #348', '2024-03-27T07:06:00.000Z'::timestamptz, '2024-03-27T07:06:00.000Z'::timestamptz
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
  SELECT 'WOO-349', m.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-27'::date, NULL, 'WooCommerce #349', '2024-03-27T07:09:00.000Z'::timestamptz, '2024-03-27T07:09:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Efe Woerden'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-350', m.new_id, 'completed'::order_status, NULL, 51884, 0, 4671, 0, 56555, '2024-03-27'::date, NULL, 'WooCommerce #350', '2024-03-27T07:13:00.000Z'::timestamptz, '2024-03-27T07:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Oranje Oosterheem'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-351', m.new_id, 'completed'::order_status, 'bank', 81586, 0, 7346, 0, 88932, '2024-03-27'::date, NULL, 'WooCommerce #351', '2024-03-27T07:20:00.000Z'::timestamptz, '2024-03-27T07:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'MD Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 405::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560::int),
  ('Excellence Patat', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-352', m.new_id, 'completed'::order_status, NULL, 152394, 0, 13722, 0, 166116, '2024-03-27'::date, NULL, 'WooCommerce #352', '2024-03-27T07:29:00.000Z'::timestamptz, '2024-03-27T07:29:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Can Market'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 8::decimal, 580::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 575::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 612::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 4::decimal, 504::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 14::decimal, 680::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640::int),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700::int)
) AS v(pname, psku, qty, price);
