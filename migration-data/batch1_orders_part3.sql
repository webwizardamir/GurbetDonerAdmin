WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-258', m.new_id, 'completed'::order_status, NULL, 70490, 0, 6345, 0, 76835, '2024-03-14'::date, NULL, 'WooCommerce #258', '2024-03-14T16:39:00.000Z'::timestamptz, '2024-03-14T16:39:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Alesta Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550::int),
  ('Kentucky TENDERS  HOT', NULL, 16::decimal, 850::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 30::decimal, 590::int),
  ('Chicken CRISPY WINGS', NULL, 8::decimal, 575::int),
  ('CHICKEN WINGS CLASSIC', NULL, 2::decimal, 520::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-269', m.new_id, 'completed'::order_status, NULL, 2995, 0, 271, 0, 3266, '2024-03-15'::date, NULL, 'WooCommerce #269', '2024-03-15T11:54:00.000Z'::timestamptz, '2024-03-15T11:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Karadag Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775::int),
  ('Kentucky TENDERS  HOT', NULL, 1::decimal, 850::int),
  ('CHICKEN KIPCORN', NULL, 1::decimal, 620::int),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-270', m.new_id, 'completed'::order_status, NULL, 36000, 0, 3240, 0, 39240, '2024-03-16'::date, NULL, 'WooCommerce #270', '2024-03-16T16:23:00.000Z'::timestamptz, '2024-03-16T16:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Flames'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 12::decimal, 1375::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 12::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-271', m.new_id, 'completed'::order_status, 'bank', 8320, 0, 749, 0, 9069, '2024-03-16'::date, NULL, 'WooCommerce #271', '2024-03-16T16:26:00.000Z'::timestamptz, '2024-03-16T16:26:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'La Lupa'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 4::decimal, 1875::int),
  ('Pizza Meat 1kg', '5902082461517', 1::decimal, 820::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-272', m.new_id, 'completed'::order_status, 'cash', 2400, 0, 216, 0, 2616, '2024-03-17'::date, NULL, 'WooCommerce #272', '2024-03-17T16:33:00.000Z'::timestamptz, '2024-03-17T16:33:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ak-AL Eethuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-273', m.new_id, 'completed'::order_status, NULL, 32500, 0, 2925, 0, 35425, '2024-03-18'::date, NULL, 'WooCommerce #273', '2024-03-18T08:18:00.000Z'::timestamptz, '2024-03-18T08:18:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Ramses'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 0::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 0::int),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 1::decimal, 0::int),
  ('FALAFEL', NULL, 1::decimal, 0::int),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 0::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 1::decimal, 0::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 20::decimal, 1625::int),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-274', m.new_id, 'completed'::order_status, NULL, 3000, 0, 270, 0, 3270, '2024-03-18'::date, NULL, 'WooCommerce #274', '2024-03-18T08:33:00.000Z'::timestamptz, '2024-03-18T08:33:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Eethuis Lage Veld'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625::int),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 1::decimal, 1375::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-275', m.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-18'::date, NULL, 'WooCommerce #275', '2024-03-18T08:36:00.000Z'::timestamptz, '2024-03-18T08:36:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 1::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-277', m.new_id, 'completed'::order_status, 'bank', 26050, 0, 2345, 0, 28395, '2024-03-18'::date, NULL, 'WooCommerce #277', '2024-03-18T11:21:00.000Z'::timestamptz, '2024-03-18T11:21:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Voorhout'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken WINGS CRISPY', NULL, 8::decimal, 575::int),
  ('Excellence Patat', NULL, 11::decimal, 1550::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-278', m.new_id, 'completed'::order_status, NULL, 12400, 0, 1116, 0, 13516, '2024-03-19'::date, NULL, 'WooCommerce #278', '2024-03-19T09:09:00.000Z'::timestamptz, '2024-03-19T09:09:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sohbet barbecue cafe&restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);
