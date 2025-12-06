-- =====================================================
-- SEED DATA (Sample data for testing)
-- =====================================================
-- This file contains sample data for development and testing.
-- You can run this after setting up the schema.
-- WARNING: This will add test data to your database!

-- =====================================================
-- SAMPLE PRODUCTS
-- =====================================================
INSERT INTO products (sku, name, description, category, unit, price, cost, stock_quantity, low_stock_threshold, is_active) VALUES
    ('BEEF-001', 'Premium Halal Beef (Wagyu)', 'Premium quality Wagyu halal beef', 'Beef', 'kg', 125.00, 90.00, 150, 20, true),
    ('BEEF-002', 'Halal Beef Tenderloin', 'Tender halal beef tenderloin cuts', 'Beef', 'kg', 95.00, 70.00, 200, 30, true),
    ('LAMB-001', 'Fresh Halal Lamb Leg', 'Fresh halal lamb leg cuts', 'Lamb', 'kg', 85.00, 60.00, 180, 25, true),
    ('LAMB-002', 'Halal Lamb Chops', 'Premium halal lamb chops', 'Lamb', 'kg', 110.00, 80.00, 120, 20, true),
    ('CHICK-001', 'Halal Chicken Breast', 'Fresh halal chicken breast', 'Poultry', 'kg', 35.00, 25.00, 300, 50, true),
    ('CHICK-002', 'Halal Whole Chicken', 'Fresh halal whole chicken', 'Poultry', 'kg', 28.00, 20.00, 250, 40, true),
    ('TURK-001', 'Halal Turkey Breast', 'Fresh halal turkey breast', 'Poultry', 'kg', 55.00, 40.00, 100, 15, true),
    ('SAUS-001', 'Halal Beef Sausages', 'Premium halal beef sausages', 'Processed', 'kg', 45.00, 30.00, 180, 30, true),
    ('KEBAB-001', 'Ready-made Kebab Mix', 'Seasoned halal kebab meat', 'Processed', 'kg', 65.00, 45.00, 150, 25, true),
    ('MINCE-001', 'Halal Beef Mince', 'Premium halal beef mince', 'Beef', 'kg', 55.00, 40.00, 220, 35, true);

-- Note: Admin users and customers should be created through the Supabase Auth UI
-- or through your application's signup flow to ensure proper authentication setup.

-- =====================================================
-- SAMPLE CUSTOMERS (without user_id - to be linked later)
-- =====================================================
INSERT INTO customers (company_name, contact_name, email, phone, address, city, postal_code, tax_id, credit_limit, is_active) VALUES
    ('Istanbul Kebab House', 'Mehmet Yilmaz', 'mehmet@istanbulkebab.com', '+90 212 555 0101', 'Taksim Square 123', 'Istanbul', '34435', 'TR1234567890', 50000.00, true),
    ('Ankara Restaurant Group', 'Ayse Demir', 'ayse@ankaragroup.com', '+90 312 555 0202', 'Kizilay Cad. 45', 'Ankara', '06420', 'TR2345678901', 75000.00, true),
    ('Izmir Food Services', 'Ali Kaya', 'ali@izmirfood.com', '+90 232 555 0303', 'Kordon Street 78', 'Izmir', '35210', 'TR3456789012', 60000.00, true),
    ('Bursa Meat Market', 'Fatma Celik', 'fatma@bursameat.com', '+90 224 555 0404', 'Heykel Mah. 12', 'Bursa', '16040', 'TR4567890123', 40000.00, true),
    ('Antalya Grill & BBQ', 'Mustafa Ozturk', 'mustafa@antalyagrill.com', '+90 242 555 0505', 'Kaleici 56', 'Antalya', '07100', 'TR5678901234', 55000.00, true);

-- =====================================================
-- SAMPLE ORDERS (with realistic data)
-- =====================================================
-- Note: You'll need to update customer_id values after creating actual customers
-- This is just example structure

-- Sample Order 1
DO $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_invoice_id UUID;
    v_product_beef_001 UUID;
    v_product_lamb_001 UUID;
    v_product_chick_001 UUID;
BEGIN
    -- Get customer and product IDs
    SELECT id INTO v_customer_id FROM customers WHERE email = 'mehmet@istanbulkebab.com' LIMIT 1;
    SELECT id INTO v_product_beef_001 FROM products WHERE sku = 'BEEF-001' LIMIT 1;
    SELECT id INTO v_product_lamb_001 FROM products WHERE sku = 'LAMB-001' LIMIT 1;
    SELECT id INTO v_product_chick_001 FROM products WHERE sku = 'CHICK-001' LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
        -- Create Order
        INSERT INTO orders (customer_id, status, tax, discount)
        VALUES (v_customer_id, 'delivered', 180.00, 0.00)
        RETURNING id INTO v_order_id;

        -- Add Order Items
        INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total) VALUES
            (v_order_id, v_product_beef_001, 'Premium Halal Beef (Wagyu)', 'BEEF-001', 10, 125.00, 1250.00),
            (v_order_id, v_product_lamb_001, 'Fresh Halal Lamb Leg', 'LAMB-001', 15, 85.00, 1275.00),
            (v_order_id, v_product_chick_001, 'Halal Chicken Breast', 'CHICK-001', 20, 35.00, 700.00);

        -- Create Invoice
        INSERT INTO invoices (order_id, customer_id, status, subtotal, tax, total, amount_paid, amount_due, due_date)
        VALUES (v_order_id, v_customer_id, 'paid', 3225.00, 180.00, 3405.00, 3405.00, 0.00, CURRENT_DATE + INTERVAL '30 days')
        RETURNING id INTO v_invoice_id;

        -- Create Payment
        INSERT INTO payments (invoice_id, customer_id, amount, payment_method, reference_number)
        VALUES (v_invoice_id, v_customer_id, 3405.00, 'Bank Transfer', 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001');
    END IF;
END $$;

-- Sample Order 2 (Pending)
DO $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_product_kebab UUID;
    v_product_saus UUID;
BEGIN
    SELECT id INTO v_customer_id FROM customers WHERE email = 'ayse@ankaragroup.com' LIMIT 1;
    SELECT id INTO v_product_kebab FROM products WHERE sku = 'KEBAB-001' LIMIT 1;
    SELECT id INTO v_product_saus FROM products WHERE sku = 'SAUS-001' LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
        INSERT INTO orders (customer_id, status, tax, discount)
        VALUES (v_customer_id, 'pending', 95.00, 50.00)
        RETURNING id INTO v_order_id;

        INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total) VALUES
            (v_order_id, v_product_kebab, 'Ready-made Kebab Mix', 'KEBAB-001', 25, 65.00, 1625.00),
            (v_order_id, v_product_saus, 'Halal Beef Sausages', 'SAUS-001', 15, 45.00, 675.00);
    END IF;
END $$;

-- Sample Order 3 (Processing)
DO $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_invoice_id UUID;
    v_product_turk UUID;
    v_product_mince UUID;
BEGIN
    SELECT id INTO v_customer_id FROM customers WHERE email = 'ali@izmirfood.com' LIMIT 1;
    SELECT id INTO v_product_turk FROM products WHERE sku = 'TURK-001' LIMIT 1;
    SELECT id INTO v_product_mince FROM products WHERE sku = 'MINCE-001' LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
        INSERT INTO orders (customer_id, status, tax, discount)
        VALUES (v_customer_id, 'processing', 125.00, 0.00)
        RETURNING id INTO v_order_id;

        INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total) VALUES
            (v_order_id, v_product_turk, 'Halal Turkey Breast', 'TURK-001', 12, 55.00, 660.00),
            (v_order_id, v_product_mince, 'Halal Beef Mince', 'MINCE-001', 30, 55.00, 1650.00);

        -- Create Invoice (Unpaid)
        INSERT INTO invoices (order_id, customer_id, status, subtotal, tax, total, amount_paid, amount_due, due_date)
        VALUES (v_order_id, v_customer_id, 'unpaid', 2310.00, 125.00, 2435.00, 0.00, 2435.00, CURRENT_DATE + INTERVAL '30 days');
    END IF;
END $$;

-- =====================================================
-- NOTES
-- =====================================================
-- To use this seed data:
-- 1. First, create admin and customer users through Supabase Auth
-- 2. Link customers to their user accounts by updating the user_id field
-- 3. Run this seed data script
-- 4. The triggers will automatically update order totals and stock quantities
