WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2948', m.new_id, 'completed'::order_status, 'bank', 16000, 0, 0, 1440, 1440, 0, 17440, '2024-12-24'::date, NULL, 'WooCommerce #2948', '2024-12-24T07:56:00.000Z'::timestamptz, '2024-12-24T07:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eethuis Ak-AL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 6/6', NULL, 10::decimal, 1600::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2949', m.new_id, 'completed'::order_status, 'bank', 23250, 0, 0, 2093, 2093, 0, 25343, '2024-12-24'::date, NULL, 'WooCommerce #2949', '2024-12-24T07:56:00.000Z'::timestamptz, '2024-12-24T07:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 15::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2950', m.new_id, 'completed'::order_status, 'bank', 34100, 0, 0, 3069, 3069, 0, 37169, '2024-12-24'::date, NULL, 'WooCommerce #2950', '2024-12-24T07:57:00.000Z'::timestamptz, '2024-12-24T07:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Express'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 22::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2951', m.new_id, 'completed'::order_status, 'bank', 74450, 0, 0, 6701, 6701, 0, 81151, '2024-12-24'::date, NULL, 'WooCommerce #2951', '2024-12-24T07:57:00.000Z'::timestamptz, '2024-12-24T07:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 8::decimal, 1650::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 50::decimal, 575::int),
  ('Mix - Shoarma ( Lam- kalkoen) (PL) (€6,50)', NULL, 50::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2952', m.new_id, 'completed'::order_status, 'bank', 16500, 0, 0, 1485, 1485, 0, 17985, '2024-12-24'::date, NULL, 'WooCommerce #2952', '2024-12-24T07:58:00.000Z'::timestamptz, '2024-12-24T07:58:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Arya Eethuis Leiden'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 10::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2954', m.new_id, 'completed'::order_status, 'bank', 29662, 0, 0, 2670, 2670, 0, 32332, '2024-12-25'::date, NULL, 'WooCommerce #2954', '2024-12-25T09:28:00.000Z'::timestamptz, '2024-12-25T09:28:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 621::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('Natural Burger 800 GR', '5902082448723', 8::decimal, 599::int),
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 4::decimal, 485::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2955', m.new_id, 'completed'::order_status, 'bank', 13450, 0, 0, 1211, 1211, 0, 14661, '2024-12-25'::date, NULL, 'WooCommerce #2955', '2024-12-25T10:32:00.000Z'::timestamptz, '2024-12-25T10:32:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'ZAM ZAM XL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ONION RINGS (0.8kg)', '5902082461883', 10::decimal, 426::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 4::decimal, 485::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2957', m.new_id, 'completed'::order_status, 'bank', 9600, 0, 0, 864, 864, 0, 10464, '2024-12-24'::date, NULL, 'WooCommerce #2957', '2024-12-24T12:56:00.000Z'::timestamptz, '2024-12-24T12:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria Roomburg'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 2::decimal, 1550::int),
  ('Mix - Shoarma ( Lam- kalkoen) (PL) (€6,50)', NULL, 10::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2958', m.new_id, 'completed'::order_status, 'bank', 13500, 0, 0, 1215, 1215, 0, 14715, '2024-12-24'::date, NULL, 'WooCommerce #2958', '2024-12-24T13:34:00.000Z'::timestamptz, '2024-12-24T13:34:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Snackbar Stevenshof'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 4::decimal, 1750::int),
  ('Mix - Shoarma ( Lam- kalkoen) (PL) (€6,50)', NULL, 10::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-2960', m.new_id, 'completed'::order_status, 'bank', 83092, 0, 0, 7480, 7480, 0, 90572, '2024-12-25'::date, NULL, 'WooCommerce #2960', '2024-12-25T08:02:00.000Z'::timestamptz, '2024-12-25T08:02:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 30::decimal, 1650::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 50::decimal, 309::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 3::decimal, 425::int)
) AS v(pname, psku, qty, price);
