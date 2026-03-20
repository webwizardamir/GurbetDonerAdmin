WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-494', m.new_id, 'completed'::order_status, NULL, 6500, 0, 0, 585, 585, 0, 7085, '2024-04-09'::date, NULL, 'WooCommerce #494', '2024-04-09T06:13:00.000Z'::timestamptz, '2024-04-09T06:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-495', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2024-04-09'::date, NULL, 'WooCommerce #495', '2024-04-09T06:13:00.000Z'::timestamptz, '2024-04-09T06:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Massada Roelofarendsveen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-497', m.new_id, 'refunded'::order_status, NULL, 71209, 0, 0, 6410, 6410, 0, 77619, '2024-04-09'::date, NULL, 'WooCommerce #497', '2024-04-09T07:42:00.000Z'::timestamptz, '2024-04-09T07:42:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 0::decimal, 654::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 0::decimal, 700::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 0::decimal, 575::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 0::decimal, 544::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 0::decimal, 575::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 0::decimal, 460::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 0::decimal, 482::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 0::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 0::decimal, 625::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 0::decimal, 625::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 0::decimal, 548::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 0::decimal, 575::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 0::decimal, 504::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 0::decimal, 600::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 0::decimal, 300::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 0::decimal, 548::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-498', m.new_id, 'completed'::order_status, NULL, 210000, 0, 0, 18900, 18900, 0, 228900, '2024-04-10'::date, NULL, 'WooCommerce #498', '2024-04-10T11:41:00.000Z'::timestamptz, '2024-04-10T11:41:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Baronie Doner Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 120::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-499', m.new_id, 'completed'::order_status, 'bank', 28000, 0, 0, 2520, 2520, 0, 30520, '2024-04-11'::date, NULL, 'WooCommerce #499', '2024-04-11T06:31:00.000Z'::timestamptz, '2024-04-11T06:31:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 16::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-500', m.new_id, 'completed'::order_status, NULL, 26000, 0, 0, 2340, 2340, 0, 28340, '2024-04-11'::date, NULL, 'WooCommerce #500', '2024-04-11T06:32:00.000Z'::timestamptz, '2024-04-11T06:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dicle'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 16::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-501', m.new_id, 'completed'::order_status, 'bank', 36950, 0, 0, 3326, 3326, 0, 40276, '2024-04-11'::date, NULL, 'WooCommerce #501', '2024-04-11T08:07:00.000Z'::timestamptz, '2024-04-11T08:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'ZAM ZAM XL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 6::decimal, 300::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 8::decimal, 531::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 2::decimal, 456::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 3::decimal, 456::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 7::decimal, 385::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 2::decimal, 448::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 1::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 5::decimal, 487::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 2::decimal, 527::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 5::decimal, 621::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 2::decimal, 456::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-502', m.new_id, 'completed'::order_status, NULL, 7750, 0, 0, 698, 698, 0, 8448, '2024-04-11'::date, NULL, 'WooCommerce #502', '2024-04-11T15:37:00.000Z'::timestamptz, '2024-04-11T15:37:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Alesta Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-503', m.new_id, 'completed'::order_status, NULL, 9300, 0, 0, 837, 837, 0, 10137, '2024-04-11'::date, NULL, 'WooCommerce #503', '2024-04-11T16:10:00.000Z'::timestamptz, '2024-04-11T16:10:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-Al Bakkerij Herenstraat'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-506', m.new_id, 'completed'::order_status, NULL, 62230, 0, 0, 5602, 5602, 0, 67832, '2024-04-12'::date, NULL, 'WooCommerce #506', '2024-04-12T07:47:00.000Z'::timestamptz, '2024-04-12T07:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625::int),
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);
