WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-842', m.new_id, 'completed'::order_status, 'bank', 12400, 0, 0, 1116, 1116, 0, 13516, '2024-05-20'::date, NULL, 'WooCommerce #842', '2024-05-20T06:54:00.000Z'::timestamptz, '2024-05-20T06:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sohbet'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-843', m.new_id, 'completed'::order_status, 'bank', 10150, 0, 0, 914, 914, 0, 11064, '2024-05-20'::date, NULL, 'WooCommerce #843', '2024-05-20T06:55:00.000Z'::timestamptz, '2024-05-20T06:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-844', m.new_id, 'completed'::order_status, 'bank', 23250, 0, 0, 2093, 2093, 0, 25343, '2024-05-20'::date, NULL, 'WooCommerce #844', '2024-05-20T06:56:00.000Z'::timestamptz, '2024-05-20T06:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'HerenHofEethuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-845', m.new_id, 'completed'::order_status, 'bank', 26350, 0, 0, 2372, 2372, 0, 28722, '2024-05-20'::date, NULL, 'WooCommerce #845', '2024-05-20T06:57:00.000Z'::timestamptz, '2024-05-20T06:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Durum Evi'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 17::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-846', m.new_id, 'completed'::order_status, 'bank', 40554, 0, 0, 3652, 3652, 0, 44206, '2024-05-20'::date, NULL, 'WooCommerce #846', '2024-05-20T08:47:00.000Z'::timestamptz, '2024-05-20T08:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yeyen Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 8::decimal, 669::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 4::decimal, 614::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 8::decimal, 487::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 4::decimal, 425::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 5::decimal, 527::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 4::decimal, 482::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 3::decimal, 621::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-847', m.new_id, 'completed'::order_status, 'cash', 15500, 0, 0, 1395, 1395, 0, 16895, '2024-05-20'::date, NULL, 'WooCommerce #847', '2024-05-20T11:23:00.000Z'::timestamptz, '2024-05-20T11:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eethuis Hoofstraat'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-848', m.new_id, 'completed'::order_status, 'bank', 15875, 0, 0, 1429, 1429, 0, 17304, '2024-05-20'::date, NULL, 'WooCommerce #848', '2024-05-20T12:27:00.000Z'::timestamptz, '2024-05-20T12:27:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Babas Restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 4::decimal, 1750::int),
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,50)', NULL, 1::decimal, 1875::int),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 4::decimal, 1750::int),
  ('Excellence Patat', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-849', m.new_id, 'completed'::order_status, 'bank', 23250, 0, 0, 2093, 2093, 0, 25343, '2024-05-20'::date, NULL, 'WooCommerce #849', '2024-05-20T16:01:00.000Z'::timestamptz, '2024-05-20T16:01:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-850', m.new_id, 'completed'::order_status, 'bank', 54250, 0, 0, 4883, 4883, 0, 59133, '2024-05-21'::date, NULL, 'WooCommerce #850', '2024-05-21T07:05:00.000Z'::timestamptz, '2024-05-21T07:05:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij de Hazelaar'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 35::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-851', m.new_id, 'completed'::order_status, 'bank', 41854, 0, 0, 3767, 3767, 0, 45621, '2024-05-21'::date, NULL, 'WooCommerce #851', '2024-05-21T07:07:00.000Z'::timestamptz, '2024-05-21T07:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 8::decimal, 1438::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 12::decimal, 1625::int)
) AS v(pname, psku, qty, price);
