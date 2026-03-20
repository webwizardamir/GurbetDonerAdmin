WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Aro', 'Pizza Aro', 'PizzaAro@gmail.com', NULL, 'Wattstraat 7A', 'Zoetermeer', '2723 PZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaAro@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Keizer Snacks', 'Keizer Snacks', 'keizersnacks@gmail.com', NULL, 'Keizerstraat 356a', 'Den Haag', '2586 SH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'keizersnacks@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Doner en Zo', 'Doner en Zo', 'donerzo@gmail.com', NULL, 'Westpolderstraat 82', 'Berkel en Rodenrijs', '2652 KW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'donerzo@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baran cafe turks restaurant', 'Baran cafe turks restaurant', 'Barancafeturksrestaurant@gmail.com', NULL, 'Quirinegang 83', 'Zoetermeer', '2719 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Barancafeturksrestaurant@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Eetcafe Elif', 'Eetcafe Elif', 'EetcafeElif@gmail.com', NULL, 'Dedemsvaartweg', 'Den Haag', '2545 AX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EetcafeElif@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Luiten Food', NULL, 'Rick@luitenfood.com', '0031 71 580 8020', 'Klaverblad 11', 'Leidschendam', '2266 JK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Luiten Food', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Sultan Ahmet BV', 'Sultan Ahmet BV', 'SultanAhmetBV@gmail.com', NULL, 'Watermolen 6', 'Leiden', '2317 ST', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SultanAhmetBV@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('San Marina', 'San Marina', 'sanmarina@gmail.com', NULL, 'Gerrit Achterberghove', 'Zoetermeer', '2717 XZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'sanmarina@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Seryana', 'Seryana', 'Seryana@gmail.com', NULL, 'Hoogstraat 3', 'Gouda', '2801 HG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Seryana@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Saray PideHuis', 'Saray PideHuis', 'SarayPideHuis@gmail.com', NULL, 'Steenstraat 20', 'Leiden', '2312 BW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SarayPideHuis@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-Al Bakkerij Herenstraat', 'Ak-Al Bakkerij Herenstraat', 'Ak-AlBakkerijHerenstraat@gmail.com', NULL, 'Herenstraat 4', 'Leiden', '2313 AK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Ak-AlBakkerijHerenstraat@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('ZAM ZAM XL', 'ZAM ZAM XL', 'ZamZamXl@gmail.com', NULL, 'Raamsteeg 73', 'Leiden', '2311 PM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'ZamZamXl@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('baba de shoarmakoning', 'baba de shoarmakoning', 'babadeshoarmakoningbeverwijk@gmail.com', NULL, 'Kuenenplein 3', 'Beverwijk', '1944 RK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'babadeshoarmakoningbeverwijk@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Onder Den Toren', 'Snackbar Onder Den Toren', 'SnackbarOnderDenToren@gmail.com', NULL, 'Voorstraat 3', 'Wijk aan Zee', '1949 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SnackbarOnderDenToren@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('EetCafe De haven', 'EetCafe De haven', 'Eetcafedehaven@gmail.com', NULL, 'Calandakade 170', 'Den Haag', '2521AA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Eetcafedehaven@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dicle', 'Dicle', 'Dicle@live.nl', NULL, 'Kempstraat 17', 'Den Haag', '2572 GA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Dicle@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Efe Woerden', 'Efe Woerden', 'EfeWoerden@gmail.com', NULL, 'Tournoysveld 111', 'Woerden', '3443 ES', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EfeWoerden@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Oranje Oosterheem', 'Oranje Oosterheem', 'Oranjesupermarket@live.nl', NULL, 'Westerschelde 364', 'Zoetermeer', '2721 NN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Oranjesupermarket@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('MD Food', 'MD Food', 'MdFood@live.nl', NULL, 'Petuniatuin 8', 'Zoetermeer', '2724 NA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'MdFood@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Can Market', 'Can Market', 'CanSupermarkt@gmail.com', NULL, 'Kon. Wilhelminalaan 68-70', 'Gorinchem', '4205 EZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'CanSupermarkt@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baronie Doner Place', 'Baronie Doner Place', 'BaronieDonerPlace@live.nl', NULL, 'Baronie 100', 'Alphen aan den Rijn', '2404 XH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'BaronieDonerPlace@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Food Staion', 'Food Staion', 'FoodStation@gmail.com', NULL, 'Stieltjesweg 232', 'Delft', '2628 CK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'FoodStation@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Downtown', 'Snackbar Downtown', 'Downtown@live.nl', NULL, 'Breestraat 3 A', 'Leiden', '2311 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Downtown@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Express', 'Pizza Express', 'PizzaExpressvoorschoten@gmail.com', NULL, 'Schoolstraat 103', 'Voorschoten', '2251 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaExpressvoorschoten@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('bakkerij Bereket', 'bakkerij Bereket', 'Bakkerijbereketdenhaag@gmail.com', NULL, 'Paul Krugerlaan 36 -40', 'Den Haag', '2571 HK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Bakkerijbereketdenhaag@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Durum Evi', 'Durum Evi', 'DurumEvitandir@gmail.com', NULL, 'Paul Krugerplein 7', 'Den Haag', '2571 HT', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DurumEvitandir@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Supermarkt Joud', 'Supermarkt Joud', 'SupermarktJoud@gmail.com', NULL, 'Venneperstraat 12', 'Nieuw-Vennep', '2151 AR', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SupermarktJoud@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria & Grillroom Bomonti', 'Pizzeria & Grillroom Bomonti', 'PizzeriaGrillroomBomonti@gmail.com', NULL, 'Van Staverenstraat 24', 'Reeuwijk', '2811 TL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaGrillroomBomonti@gmail.com', id FROM new_cust;
