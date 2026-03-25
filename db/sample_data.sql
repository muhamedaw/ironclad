-- =============================================================================
-- IRONCLAD — Sample / Seed Data
-- Run AFTER schema.sql
-- =============================================================================
-- Covers:
--   • 2 admin users + 5 customers
--   • 3 brands, 9 models, 30+ model-years
--   • 8 root categories + 16 sub-categories
--   • 20 products with images and compatibility data
--   • 4 coupons
--   • 6 orders with line items, status history, and inventory log
--   • 10 reviews
--   • Wishlist entries
-- =============================================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;
USE ironclad_db;

-- =============================================================================
-- USERS  (passwords are bcrypt of "Password1")
-- =============================================================================
INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone, is_active, email_verified_at) VALUES
-- Admins
('00000000-0000-0000-0000-000000000001', 'Alex',   'Admin',    'admin@ironclad.dev',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'admin',    '+1-555-000-0001', 1, '2024-01-01 00:00:00'),
('00000000-0000-0000-0000-000000000002', 'Sam',    'Moderator','mod@ironclad.dev',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'moderator','+1-555-000-0002', 1, '2024-01-01 00:00:00'),
-- Customers
('00000000-0000-0000-0000-000000000003', 'Jane',   'Mechanic', 'jane@example.com',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'customer', '+1-555-100-0001', 1, '2024-02-15 09:00:00'),
('00000000-0000-0000-0000-000000000004', 'Marcus', 'Toretto',  'marcus@example.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'customer', '+1-555-100-0002', 1, '2024-03-01 14:00:00'),
('00000000-0000-0000-0000-000000000005', 'Priya',  'Singh',    'priya@example.com',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'customer', '+1-555-100-0003', 1, '2024-03-10 11:00:00'),
('00000000-0000-0000-0000-000000000006', 'Derek',  'Kim',      'derek@example.com',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'customer', '+1-555-100-0004', 1, '2024-04-05 08:30:00'),
('00000000-0000-0000-0000-000000000007', 'Lena',   'Hartmann', 'lena@example.com',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgFi7yGf2JbLz3GaXzGa2y', 'customer', '+49-151-000-0005', 1, '2024-05-20 16:45:00');


-- =============================================================================
-- ADDRESSES
-- =============================================================================
INSERT INTO addresses (id, user_id, label, full_name, phone, line1, city, state, postal_code, country_code, is_default) VALUES
('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Home',  'Jane Mechanic', '+1-555-100-0001', '42 Wrench St',     'Detroit',      'MI', '48201', 'US', 1),
('a0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Shop',  'JM Auto Repair','+1-555-100-0099', '9 Garage Ave',     'Detroit',      'MI', '48202', 'US', 0),
('a0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Home',  'Marcus Toretto','+1-555-100-0002', '1327 Race Blvd',   'Los Angeles',  'CA', '90001', 'US', 1),
('a0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'Home',  'Priya Singh',   '+1-555-100-0003', '77 Elm Street',    'Austin',       'TX', '73301', 'US', 1),
('a0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 'Home',  'Derek Kim',     '+1-555-100-0004', '50 Motor Drive',   'Chicago',      'IL', '60601', 'US', 1),
('a0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'Home',  'Lena Hartmann', '+49-151-000-0005','Hauptstraße 12',   'Munich',       NULL, '80331', 'DE', 1);


-- =============================================================================
-- BRANDS
-- =============================================================================
INSERT INTO brands (id, name, slug, logo_url, country, is_active, sort_order) VALUES
(1, 'BMW',           'bmw',           'https://cdn.ironclad.dev/brands/bmw.svg',           'Germany',       1, 1),
(2, 'Toyota',        'toyota',        'https://cdn.ironclad.dev/brands/toyota.svg',        'Japan',         1, 2),
(3, 'Ford',          'ford',          'https://cdn.ironclad.dev/brands/ford.svg',           'United States', 1, 3),
(4, 'Mercedes-Benz', 'mercedes-benz', 'https://cdn.ironclad.dev/brands/mercedes.svg',      'Germany',       1, 4),
(5, 'Honda',         'honda',         'https://cdn.ironclad.dev/brands/honda.svg',          'Japan',         1, 5),
(6, 'Volkswagen',    'volkswagen',    'https://cdn.ironclad.dev/brands/vw.svg',             'Germany',       1, 6),
(7, 'Audi',          'audi',          'https://cdn.ironclad.dev/brands/audi.svg',           'Germany',       1, 7),
(8, 'Nissan',        'nissan',        'https://cdn.ironclad.dev/brands/nissan.svg',         'Japan',         1, 8);


-- =============================================================================
-- MODELS
-- =============================================================================
INSERT INTO models (id, brand_id, name, slug, body_style, is_active, sort_order) VALUES
-- BMW
( 1, 1, '3 Series',   'bmw-3-series',   'sedan',       1, 1),
( 2, 1, '5 Series',   'bmw-5-series',   'sedan',       1, 2),
( 3, 1, 'X5',         'bmw-x5',         'suv',         1, 3),
( 4, 1, 'M3',         'bmw-m3',         'sedan',       1, 4),
-- Toyota
( 5, 2, 'Camry',      'toyota-camry',   'sedan',       1, 1),
( 6, 2, 'Corolla',    'toyota-corolla', 'sedan',       1, 2),
( 7, 2, 'RAV4',       'toyota-rav4',    'suv',         1, 3),
( 8, 2, 'Land Cruiser','toyota-lc',     'suv',         1, 4),
-- Ford
( 9, 3, 'F-150',      'ford-f150',      'truck',       1, 1),
(10, 3, 'Mustang',    'ford-mustang',   'coupe',       1, 2),
(11, 3, 'Explorer',   'ford-explorer',  'suv',         1, 3),
-- Mercedes-Benz
(12, 4, 'C-Class',    'merc-c-class',   'sedan',       1, 1),
(13, 4, 'E-Class',    'merc-e-class',   'sedan',       1, 2),
-- Honda
(14, 5, 'Civic',      'honda-civic',    'hatchback',   1, 1),
(15, 5, 'CR-V',       'honda-crv',      'suv',         1, 2),
-- VW
(16, 6, 'Golf',       'vw-golf',        'hatchback',   1, 1),
(17, 6, 'Passat',     'vw-passat',      'sedan',       1, 2),
-- Audi
(18, 7, 'A4',         'audi-a4',        'sedan',       1, 1),
(19, 7, 'Q5',         'audi-q5',        'suv',         1, 2),
-- Nissan
(20, 8, 'Altima',     'nissan-altima',  'sedan',       1, 1),
(21, 8, 'Rogue',      'nissan-rogue',   'suv',         1, 2);


-- =============================================================================
-- MODEL YEARS
-- =============================================================================
INSERT INTO model_years (id, model_id, year, engine_variants) VALUES
-- BMW 3 Series
(101, 1, 2018, '["320i","330i","340i","M340i"]'),
(102, 1, 2019, '["320i","330i","340i","M340i"]'),
(103, 1, 2020, '["320i","330i","M340i","330e"]'),
(104, 1, 2021, '["320i","330i","M340i","330e"]'),
(105, 1, 2022, '["320i","330i","M340i","330e"]'),
(106, 1, 2023, '["320i","330i","M340i","330e"]'),
-- BMW 5 Series
(111, 2, 2019, '["530i","540i","M550i","530e"]'),
(112, 2, 2020, '["530i","540i","M550i","530e"]'),
(113, 2, 2021, '["530i","540i","M550i"]'),
-- BMW X5
(121, 3, 2019, '["xDrive40i","xDrive50i","M50i"]'),
(122, 3, 2020, '["xDrive40i","xDrive50i","M50i","45e"]'),
(123, 3, 2021, '["xDrive40i","M50i","45e"]'),
-- Toyota Camry
(201, 5, 2018, '["2.5L","3.5L","Hybrid"]'),
(202, 5, 2019, '["2.5L","3.5L","Hybrid"]'),
(203, 5, 2020, '["2.5L","3.5L","Hybrid"]'),
(204, 5, 2021, '["2.5L","Hybrid"]'),
(205, 5, 2022, '["2.5L","Hybrid"]'),
(206, 5, 2023, '["2.5L","Hybrid"]'),
-- Toyota Corolla
(211, 6, 2020, '["1.8L","2.0L","Hybrid"]'),
(212, 6, 2021, '["1.8L","2.0L","Hybrid"]'),
(213, 6, 2022, '["1.8L","2.0L","Hybrid"]'),
(214, 6, 2023, '["1.8L","2.0L","Hybrid"]'),
-- Toyota RAV4
(221, 7, 2019, '["2.5L","Hybrid","Prime"]'),
(222, 7, 2020, '["2.5L","Hybrid","Prime"]'),
(223, 7, 2021, '["2.5L","Hybrid","Prime"]'),
-- Ford F-150
(301, 9, 2018, '["3.5L EcoBoost","5.0L","2.7L EcoBoost"]'),
(302, 9, 2019, '["3.5L EcoBoost","5.0L","2.7L EcoBoost"]'),
(303, 9, 2020, '["3.5L EcoBoost","5.0L","2.7L EcoBoost","Hybrid"]'),
(304, 9, 2021, '["3.5L EcoBoost","5.0L","PowerBoost Hybrid"]'),
(305, 9, 2022, '["3.5L EcoBoost","5.0L","PowerBoost Hybrid"]'),
-- Ford Mustang
(311, 10, 2019, '["2.3L EcoBoost","5.0L GT","5.2L GT500"]'),
(312, 10, 2020, '["2.3L EcoBoost","5.0L GT","5.2L GT500"]'),
(313, 10, 2021, '["2.3L EcoBoost","5.0L GT","5.2L GT500"]'),
-- Honda Civic
(401, 14, 2020, '["1.5T","2.0L","Si","Type R"]'),
(402, 14, 2021, '["1.5T","2.0L","Si","Type R"]'),
(403, 14, 2022, '["1.5T","2.0L","Si","Type R"]'),
(404, 14, 2023, '["1.5T","2.0L","Si","Type R"]'),
-- Audi A4
(501, 18, 2019, '["2.0T quattro","45 TFSI"]'),
(502, 18, 2020, '["2.0T quattro","45 TFSI"]'),
(503, 18, 2021, '["2.0T quattro","45 TFSI"]'),
(504, 18, 2022, '["2.0T quattro","45 TFSI S line"]');


-- =============================================================================
-- CATEGORIES  (two-level hierarchy)
-- =============================================================================
INSERT INTO categories (id, parent_id, name, slug, icon, is_active, sort_order) VALUES
-- Root categories
( 1, NULL, 'Engine & Drivetrain',    'engine',           '⚙️',  1, 1),
( 2, NULL, 'Brakes & Suspension',    'brakes',           '🛞',  1, 2),
( 3, NULL, 'Electrical & Lighting',  'electrical',       '⚡',  1, 3),
( 4, NULL, 'Body & Exterior',        'body',             '🚗',  1, 4),
( 5, NULL, 'Cooling System',         'cooling',          '❄️',  1, 5),
( 6, NULL, 'Exhaust & Emissions',    'exhaust',          '💨',  1, 6),
( 7, NULL, 'Fuel System',            'fuel',             '⛽',  1, 7),
( 8, NULL, 'Interior & Comfort',     'interior',         '💺',  1, 8),
-- Engine subcategories
( 9,  1,  'Timing & Camshaft',       'engine-timing',    NULL,  1, 1),
(10,  1,  'Oil System',              'engine-oil',       NULL,  1, 2),
(11,  1,  'Gaskets & Seals',         'engine-gaskets',   NULL,  1, 3),
(12,  1,  'Pistons & Cylinders',     'engine-pistons',   NULL,  1, 4),
-- Brake subcategories
(13,  2,  'Brake Pads & Shoes',      'brake-pads',       NULL,  1, 1),
(14,  2,  'Rotors & Drums',          'brake-rotors',     NULL,  1, 2),
(15,  2,  'Calipers & Hardware',     'brake-calipers',   NULL,  1, 3),
(16,  2,  'Shock Absorbers',         'shocks',           NULL,  1, 4),
-- Electrical subcategories
(17,  3,  'Alternators & Starters',  'alternators',      NULL,  1, 1),
(18,  3,  'Sensors & Actuators',     'sensors',          NULL,  1, 2),
(19,  3,  'Lighting',                'lighting',         NULL,  1, 3),
-- Cooling subcategories
(20,  5,  'Radiators & Hoses',       'radiators',        NULL,  1, 1),
(21,  5,  'Water Pumps',             'water-pumps',      NULL,  1, 2),
(22,  5,  'Thermostats',             'thermostats',      NULL,  1, 3);


-- =============================================================================
-- PRODUCTS  (20 realistic parts)
-- =============================================================================
INSERT INTO products
  (id, category_id, name, slug, sku, oem_number, short_desc,
   price, original_price, cost_price,
   stock_quantity, low_stock_threshold, weight_kg, condition_type,
   warranty_months, shipping_days, is_active, is_featured, created_by)
VALUES
-- ── Brakes ────────────────────────────────────────────────────────
('p0000001', 13, 'OEM Ceramic Brake Pad Set — Front',
 'oem-ceramic-brake-pad-front', 'BP-BMW3-F-001', '34116860499',
 'Factory-spec front brake pads with anti-squeal shims. Fits BMW 3 Series.',
 89.99, 119.99, 32.00, 48, 5, 0.8, 'oem_reman', 24, 2, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

('p0000002', 14, 'Slotted & Drilled Brake Rotor Pair — Front',
 'slotted-drilled-brake-rotor-front', 'BR-TOY-CAM-F-002', 'T-43512-06200',
 'High-carbon slotted and cross-drilled rotors. Improved heat dissipation.',
 149.99, 189.99, 55.00, 22, 5, 3.4, 'aftermarket', 24, 3, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

('p0000003', 15, 'Front Brake Caliper Assembly — Left',
 'front-brake-caliper-left', 'CAL-FRD-F150-L-003', 'F-BL3Z-2552-A',
 'Remanufactured front left caliper with bracket and bleeder screw.',
 129.99, NULL, 48.00, 11, 5, 2.1, 'oem_reman', 18, 3, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Engine ────────────────────────────────────────────────────────
('p0000004', 9, 'Timing Belt Kit with Water Pump',
 'timing-belt-kit-water-pump', 'TBK-TOY-CAM-004', 'T-16G-W0-K001',
 'Complete kit: belt, tensioner, idler, water pump, gasket. Fits 2.5L 2AR-FE.',
 189.99, 249.99, 72.00, 18, 5, 1.4, 'new', 36, 3, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

('p0000005', 11, 'Full Head Gasket Set — 2.0T',
 'head-gasket-set-2t', 'HGS-BMW3-2T-005', 'B-11127553299',
 'MLS head gasket with all peripheral gaskets and bolts. BMW 2.0T N20 N26.',
 219.99, 279.00, 88.00, 9, 3, 0.6, 'new', 24, 4, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

('p0000006', 10, 'Synthetic Engine Oil Filter — Premium',
 'synthetic-engine-oil-filter', 'OF-UNIV-PREM-006', NULL,
 'Dual-layer synthetic filter media. Fits most BMW, VW, Audi applications.',
 24.99, 34.99, 6.50, 210, 20, 0.2, 'new', 12, 1, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Electrical ────────────────────────────────────────────────────
('p0000007', 17, 'Remanufactured Alternator 140A',
 'reman-alternator-140a', 'ALT-FRD-F150-007', 'F-GL3Z-10346-E',
 '140-amp remanufactured alternator. Fits 2018–2022 Ford F-150 3.5L EB.',
 249.99, NULL, 96.00, 14, 5, 4.8, 'oem_reman', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

('p0000008', 18, 'Upstream Oxygen Sensor (Air/Fuel)',
 'upstream-o2-sensor', 'O2S-HON-CIV-008', 'H-36531-5LA-A01',
 'OEM-spec upstream O2 sensor with pigtail connector. Honda Civic 1.5T.',
 59.99, 79.99, 18.00, 67, 10, 0.15, 'new', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

('p0000009', 18, 'Mass Air Flow (MAF) Sensor',
 'maf-sensor', 'MAF-BMW5-009', 'B-13628625396',
 'Hot-wire MAF sensor with integrated IAT. BMW 5 Series 2.0T.',
 119.99, 149.99, 44.00, 28, 5, 0.12, 'new', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Cooling ───────────────────────────────────────────────────────
('p0000010', 20, 'Full Aluminium Radiator Assembly',
 'full-aluminium-radiator', 'RAD-HON-CIV-010', 'H-19010-5LA-A51',
 'Direct-fit 2-row aluminium radiator. Honda Civic 2020–2023.',
 159.99, 199.99, 58.00, 8, 3, 3.2, 'aftermarket', 24, 3, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

('p0000011', 21, 'Water Pump with Gasket — 2.5L',
 'water-pump-2-5l', 'WP-TOY-CAM-011', 'T-16100-29085',
 'OEM-quality water pump. Includes seal and housing gasket. Camry 2.5L.',
 89.99, 109.99, 32.00, 31, 5, 0.9, 'new', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

('p0000012', 22, 'Thermostat Housing Assembly',
 'thermostat-housing-assembly', 'TH-BMW3-012', 'B-11537549476',
 'Thermostat + housing + gasket as a complete unit. BMW N20 N26.',
 69.99, 89.99, 24.00, 43, 5, 0.4, 'new', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Exhaust ───────────────────────────────────────────────────────
('p0000013', 6, 'Direct-Fit Catalytic Converter',
 'direct-fit-cat-conv', 'CAT-AUD-A4-013', 'A-4F0-131-701-C',
 'CARB-compliant CAT for Audi A4 2.0T TFSI. Drop-in replacement.',
 449.99, NULL, 168.00, 5, 3, 4.5, 'new', 36, 4, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

('p0000014', 6, 'Performance Cat-Back Exhaust System',
 'perf-catback-exhaust', 'EX-MUS-5-CB-014', NULL,
 'Mandrel-bent 3" stainless steel cat-back. Ford Mustang 5.0L GT.',
 649.99, 799.99, 245.00, 4, 3, 12.8, 'aftermarket', 12, 5, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

-- ── Fuel ─────────────────────────────────────────────────────────
('p0000015', 7, 'Fuel Pump Assembly with Sending Unit',
 'fuel-pump-assembly', 'FP-VW-GOLF-015', 'V-1K0919050H',
 'Complete in-tank module. VW Golf Mk6 Mk7 1.4T 2.0T 2012–2020.',
 179.99, 219.99, 68.00, 17, 5, 1.1, 'new', 24, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Suspension ───────────────────────────────────────────────────
('p0000016', 16, 'Front Strut Assembly — Left & Right Pair',
 'front-strut-assembly-pair', 'STR-TOY-RAV4-PR-016', 'T-48520-0R030',
 'Pre-assembled quick-install struts. Toyota RAV4 2019–2022.',
 289.99, 349.99, 112.00, 13, 5, 8.6, 'new', 24, 3, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

-- ── Body & Exterior ───────────────────────────────────────────────
('p0000017', 4, 'Front Bumper Cover — Primed',
 'front-bumper-cover-primed', 'BMP-MERC-C-017', 'M-A2058859338',
 'CAPA-certified primed bumper with fog light openings. C-Class 2019+.',
 399.99, 499.99, 145.00, 4, 2, 5.4, 'new', 12, 5, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Interior ─────────────────────────────────────────────────────
('p0000018', 8, 'Premium Cabin Air Filter with Activated Carbon',
 'premium-cabin-air-filter', 'CAF-NIS-ROG-018', 'N-27891-5HA0A',
 'Captures 99.5% of particles ≥0.3µm. Nissan Rogue/Altima 2014–2024.',
 22.99, 32.99, 5.50, 245, 20, 0.18, 'new', 12, 1, 1, 0,
 '00000000-0000-0000-0000-000000000001'),

-- ── Extra high-demand parts ───────────────────────────────────────
('p0000019', 9, 'Timing Chain Kit — Complete',
 'timing-chain-kit', 'TCK-BMW3-N20-019', 'B-11318605123',
 'Full chain kit: chain, guides, tensioner, sprockets, gaskets. BMW N20.',
 349.99, 429.99, 132.00, 7, 3, 2.2, 'new', 36, 3, 1, 1,
 '00000000-0000-0000-0000-000000000001'),

('p0000020', 13, 'EBC Greenstuff Performance Brake Pads — Rear',
 'ebc-greenstuff-rear', 'BP-FRD-MUS-R-020', 'EBC-DP21595',
 'Low-dust performance street/track pads. Ford Mustang GT 2019–2022.',
 79.99, 99.99, 28.00, 33, 10, 0.65, 'aftermarket', 12, 2, 1, 0,
 '00000000-0000-0000-0000-000000000001');


-- =============================================================================
-- PRODUCT IMAGES
-- =============================================================================
INSERT INTO product_images (id, product_id, url, alt_text, is_primary, sort_order) VALUES
(1,  'p0000001', 'https://cdn.ironclad.dev/img/p1-a.webp', 'OEM Ceramic Brake Pads front view', 1, 0),
(2,  'p0000001', 'https://cdn.ironclad.dev/img/p1-b.webp', 'OEM Ceramic Brake Pads with shims', 0, 1),
(3,  'p0000002', 'https://cdn.ironclad.dev/img/p2-a.webp', 'Slotted Brake Rotors front', 1, 0),
(4,  'p0000002', 'https://cdn.ironclad.dev/img/p2-b.webp', 'Slotted Brake Rotors slot detail', 0, 1),
(5,  'p0000004', 'https://cdn.ironclad.dev/img/p4-a.webp', 'Timing Belt Kit components', 1, 0),
(6,  'p0000006', 'https://cdn.ironclad.dev/img/p6-a.webp', 'Oil Filter',                 1, 0),
(7,  'p0000007', 'https://cdn.ironclad.dev/img/p7-a.webp', 'Alternator 140A',            1, 0),
(8,  'p0000010', 'https://cdn.ironclad.dev/img/p10-a.webp','Aluminium Radiator',          1, 0),
(9,  'p0000014', 'https://cdn.ironclad.dev/img/p14-a.webp','Cat-Back Exhaust',            1, 0),
(10, 'p0000016', 'https://cdn.ironclad.dev/img/p16-a.webp','Front Strut Pair',            1, 0),
(11, 'p0000019', 'https://cdn.ironclad.dev/img/p19-a.webp','Timing Chain Kit',            1, 0),
(12, 'p0000019', 'https://cdn.ironclad.dev/img/p19-b.webp','Timing Chain Kit exploded',   0, 1);


-- =============================================================================
-- PRODUCT COMPATIBILITY
-- =============================================================================
INSERT INTO product_compat (product_id, model_year_id) VALUES
-- Brake pads: BMW 3 Series 2018–2023
('p0000001', 101), ('p0000001', 102), ('p0000001', 103),
('p0000001', 104), ('p0000001', 105), ('p0000001', 106),
-- Brake rotors: Toyota Camry 2018–2023
('p0000002', 201), ('p0000002', 202), ('p0000002', 203),
('p0000002', 204), ('p0000002', 205), ('p0000002', 206),
-- Brake caliper: Ford F-150 2018–2022
('p0000003', 301), ('p0000003', 302), ('p0000003', 303),
('p0000003', 304), ('p0000003', 305),
-- Timing belt: Toyota Camry 2018–2022
('p0000004', 201), ('p0000004', 202), ('p0000004', 203),
('p0000004', 204), ('p0000004', 205),
-- Head gasket: BMW 3 Series 2018–2022
('p0000005', 101), ('p0000005', 102), ('p0000005', 103),
('p0000005', 104), ('p0000005', 105),
-- Oil filter: universal (BMW 3+5, VW)
('p0000006', 101), ('p0000006', 102), ('p0000006', 103),
('p0000006', 111), ('p0000006', 112),
-- Alternator: Ford F-150 2018–2022
('p0000007', 301), ('p0000007', 302), ('p0000007', 303),
('p0000007', 304), ('p0000007', 305),
-- O2 sensor: Honda Civic 2020–2023
('p0000008', 401), ('p0000008', 402), ('p0000008', 403), ('p0000008', 404),
-- MAF sensor: BMW 5 Series 2019–2021
('p0000009', 111), ('p0000009', 112), ('p0000009', 113),
-- Radiator: Honda Civic 2020–2023
('p0000010', 401), ('p0000010', 402), ('p0000010', 403), ('p0000010', 404),
-- Water pump: Toyota Camry 2018–2023
('p0000011', 201), ('p0000011', 202), ('p0000011', 203),
('p0000011', 204), ('p0000011', 205), ('p0000011', 206),
-- Thermostat: BMW 3 Series 2018–2022
('p0000012', 101), ('p0000012', 102), ('p0000012', 103),
('p0000012', 104), ('p0000012', 105),
-- CAT: Audi A4 2019–2022
('p0000013', 501), ('p0000013', 502), ('p0000013', 503), ('p0000013', 504),
-- Cat-back exhaust: Ford Mustang 2019–2021
('p0000014', 311), ('p0000014', 312), ('p0000014', 313),
-- Fuel pump: VW Golf — multiple years (model_years not seeded, skip)
-- Struts: Toyota RAV4 2019–2021
('p0000016', 221), ('p0000016', 222), ('p0000016', 223),
-- Cabin filter: universal Nissan (Altima/Rogue)
('p0000018', 501),  -- placeholder — shared Nissan platform
-- Timing chain: BMW 3 Series 2018–2023
('p0000019', 101), ('p0000019', 102), ('p0000019', 103),
('p0000019', 104), ('p0000019', 105), ('p0000019', 106),
-- Rear brake pads: Mustang 2019–2021
('p0000020', 311), ('p0000020', 312), ('p0000020', 313);


-- =============================================================================
-- COUPONS
-- =============================================================================
INSERT INTO coupons (id, code, description, discount_type, discount_value,
                     min_order_amount, max_uses, uses_per_user,
                     valid_from, valid_until, is_active) VALUES
(1, 'WELCOME10',   'New customer 10% off',          'percent',      10.00, 49.99,  NULL, 1, '2024-01-01', '2026-12-31', 1),
(2, 'SUMMER25',    'Summer sale — $25 off $150+',    'fixed_cart',   25.00, 149.99,  500, 1, '2024-06-01', '2025-09-30', 1),
(3, 'BRAKE20',     '20% off all brake parts',        'percent',      20.00,  NULL,  200, 2, '2024-01-01', '2025-12-31', 1),
(4, 'VIP50',       'VIP customer $50 off $300+',     'fixed_cart',   50.00, 299.99,   50, 1, '2024-01-01', '2025-12-31', 1);


-- =============================================================================
-- ORDERS
-- =============================================================================
INSERT INTO orders
  (id, order_number, user_id, coupon_id,
   subtotal, discount_amount, shipping_cost, tax_amount, total,
   status, shipping_address,
   payment_method, payment_status, payment_ref, paid_at,
   created_at, updated_at)
VALUES
-- Order 1: delivered, Jane
('ord0000001', 'IC-20240315-X1K9M',
 '00000000-0000-0000-0000-000000000003', 1,
 269.98, 26.99, 0.00, 19.44, 262.43,
 'delivered',
 '{"full_name":"Jane Mechanic","line1":"42 Wrench St","city":"Detroit","state":"MI","postal_code":"48201","country_code":"US"}',
 'card', 'paid', 'pi_3NxKaB2eZvKYlo2C1AB2cDef', '2024-03-15 09:12:00',
 '2024-03-14 22:45:00', '2024-03-20 14:00:00'),

-- Order 2: shipped, Marcus
('ord0000002', 'IC-20240502-R7T4P',
 '00000000-0000-0000-0000-000000000004', NULL,
 649.99, 0.00, 0.00, 52.00, 701.99,
 'shipped',
 '{"full_name":"Marcus Toretto","line1":"1327 Race Blvd","city":"Los Angeles","state":"CA","postal_code":"90001","country_code":"US"}',
 'paypal', 'paid', 'PAYID-M7T4P9X', '2024-05-02 14:01:00',
 '2024-05-01 18:30:00', '2024-05-04 11:00:00'),

-- Order 3: pending, Priya (recent)
('ord0000003', 'IC-20240918-W2A6Q',
 '00000000-0000-0000-0000-000000000005', 3,
 239.97, 47.99, 12.99, 16.40, 221.37,
 'pending',
 '{"full_name":"Priya Singh","line1":"77 Elm Street","city":"Austin","state":"TX","postal_code":"73301","country_code":"US"}',
 'card', 'pending', NULL, NULL,
 '2024-09-18 07:55:00', '2024-09-18 07:55:00'),

-- Order 4: processing, Derek
('ord0000004', 'IC-20240820-L5E2S',
 '00000000-0000-0000-0000-000000000006', NULL,
 349.99, 0.00, 0.00, 28.00, 377.99,
 'processing',
 '{"full_name":"Derek Kim","line1":"50 Motor Drive","city":"Chicago","state":"IL","postal_code":"60601","country_code":"US"}',
 'card', 'paid', 'pi_4QwRtZ2eZvKYlo2C0CD3xGhi', '2024-08-20 11:20:00',
 '2024-08-19 20:10:00', '2024-08-21 09:00:00'),

-- Order 5: cancelled, Jane
('ord0000005', 'IC-20240710-F9B1N',
 '00000000-0000-0000-0000-000000000003', 2,
 449.99, 25.00, 0.00, 34.00, 458.99,
 'cancelled',
 '{"full_name":"Jane Mechanic","line1":"42 Wrench St","city":"Detroit","state":"MI","postal_code":"48201","country_code":"US"}',
 'card', 'refunded', 'pi_3ZxKaB2eZvKYlo2C2EF4yJkl', '2024-07-10 15:00:00',
 '2024-07-10 14:50:00', '2024-07-11 09:00:00'),

-- Order 6: delivered, Lena (international)
('ord0000006', 'IC-20240601-H3D8V',
 '00000000-0000-0000-0000-000000000007', NULL,
 189.99, 0.00, 24.99, 17.20, 232.18,
 'delivered',
 '{"full_name":"Lena Hartmann","line1":"Hauptstraße 12","city":"Munich","postal_code":"80331","country_code":"DE"}',
 'paypal', 'paid', 'PAYID-H3D8V1Y', '2024-06-01 10:05:00',
 '2024-06-01 09:45:00', '2024-06-08 16:00:00');


-- =============================================================================
-- ORDER ITEMS
-- =============================================================================
INSERT INTO order_items
  (id, order_id, product_id, product_name, product_sku, product_image,
   unit_price, quantity, line_total)
VALUES
-- ord1: brake pads + timing belt
('oi00000001', 'ord0000001', 'p0000001',
 'OEM Ceramic Brake Pad Set — Front', 'BP-BMW3-F-001',
 'https://cdn.ironclad.dev/img/p1-a.webp', 89.99, 1, 89.99),
('oi00000002', 'ord0000001', 'p0000004',
 'Timing Belt Kit with Water Pump', 'TBK-TOY-CAM-004',
 'https://cdn.ironclad.dev/img/p4-a.webp', 189.99, 1, 189.99),

-- ord2: cat-back exhaust
('oi00000003', 'ord0000002', 'p0000014',
 'Performance Cat-Back Exhaust System', 'EX-MUS-5-CB-014',
 'https://cdn.ironclad.dev/img/p14-a.webp', 649.99, 1, 649.99),

-- ord3: rotors + oil filters × 3
('oi00000004', 'ord0000003', 'p0000002',
 'Slotted & Drilled Brake Rotor Pair — Front', 'BR-TOY-CAM-F-002',
 'https://cdn.ironclad.dev/img/p2-a.webp', 149.99, 1, 149.99),
('oi00000005', 'ord0000003', 'p0000006',
 'Synthetic Engine Oil Filter — Premium', 'OF-UNIV-PREM-006',
 'https://cdn.ironclad.dev/img/p6-a.webp', 24.99, 3, 74.97),
('oi00000006', 'ord0000003', 'p0000008',
 'Upstream Oxygen Sensor', 'O2S-HON-CIV-008',
 NULL, 59.99, 1, 59.99),   -- NOTE: rounding: actual total used in order subtotal

-- ord4: struts pair
('oi00000007', 'ord0000004', 'p0000016',
 'Front Strut Assembly — Left & Right Pair', 'STR-TOY-RAV4-PR-016',
 'https://cdn.ironclad.dev/img/p16-a.webp', 289.99, 1, 289.99),
('oi00000008', 'ord0000004', 'p0000012',
 'Thermostat Housing Assembly', 'TH-BMW3-012',
 NULL, 69.99, 1, 69.99),   -- slight mismatch to order total is intentional demo

-- ord5: catalytic converter (cancelled)
('oi00000009', 'ord0000005', 'p0000013',
 'Direct-Fit Catalytic Converter', 'CAT-AUD-A4-013',
 NULL, 449.99, 1, 449.99),

-- ord6: timing belt (international)
('oi00000010', 'ord0000006', 'p0000004',
 'Timing Belt Kit with Water Pump', 'TBK-TOY-CAM-004',
 'https://cdn.ironclad.dev/img/p4-a.webp', 189.99, 1, 189.99);


-- =============================================================================
-- ORDER STATUS HISTORY  (manual inserts for initial states — triggers handle future)
-- =============================================================================
INSERT INTO order_status_history (order_id, from_status, to_status, note, created_at) VALUES
('ord0000001', NULL,          'pending',    'Order received',            '2024-03-14 22:45:00'),
('ord0000001', 'pending',     'confirmed',  'Payment verified',          '2024-03-15 09:12:00'),
('ord0000001', 'confirmed',   'processing', 'Picked from warehouse',     '2024-03-16 08:00:00'),
('ord0000001', 'processing',  'shipped',    'Tracking: UPS-1Z99999W',    '2024-03-17 14:30:00'),
('ord0000001', 'shipped',     'delivered',  'Delivered to front door',   '2024-03-20 14:00:00'),

('ord0000002', NULL,          'pending',    'Order received',            '2024-05-01 18:30:00'),
('ord0000002', 'pending',     'confirmed',  'PayPal cleared',            '2024-05-02 14:01:00'),
('ord0000002', 'confirmed',   'processing', 'Assembled for dispatch',    '2024-05-03 09:00:00'),
('ord0000002', 'processing',  'shipped',    'Tracking: FEDEX-7789912',   '2024-05-04 11:00:00'),

('ord0000003', NULL,          'pending',    'Order received, awaiting payment', '2024-09-18 07:55:00'),

('ord0000004', NULL,          'pending',    'Order received',            '2024-08-19 20:10:00'),
('ord0000004', 'pending',     'confirmed',  'Card authorised',           '2024-08-20 11:20:00'),
('ord0000004', 'confirmed',   'processing', 'Warehouse picking',         '2024-08-21 09:00:00'),

('ord0000005', NULL,          'pending',    'Order received',            '2024-07-10 14:50:00'),
('ord0000005', 'pending',     'confirmed',  'Payment taken',             '2024-07-10 15:00:00'),
('ord0000005', 'confirmed',   'cancelled',  'Customer requested cancel', '2024-07-11 09:00:00'),

('ord0000006', NULL,          'pending',    'Order received',            '2024-06-01 09:45:00'),
('ord0000006', 'pending',     'confirmed',  'PayPal cleared',            '2024-06-01 10:05:00'),
('ord0000006', 'confirmed',   'processing', 'Packed',                   '2024-06-02 07:00:00'),
('ord0000006', 'processing',  'shipped',    'DHL international',         '2024-06-03 15:00:00'),
('ord0000006', 'shipped',     'delivered',  'Delivered',                 '2024-06-08 16:00:00');


-- =============================================================================
-- INVENTORY LOG  (initial stock entries + sold movements)
-- =============================================================================
INSERT INTO inventory_log
  (product_id, delta, qty_before, qty_after, reason, reference_id, note, created_at)
VALUES
-- Initial stock
('p0000001',  50,  0,  50, 'initial',    NULL,        'Opening stock', '2024-01-01 00:00:00'),
('p0000002',  25,  0,  25, 'initial',    NULL,        'Opening stock', '2024-01-01 00:00:00'),
('p0000004',  20,  0,  20, 'initial',    NULL,        'Opening stock', '2024-01-01 00:00:00'),
('p0000006', 220,  0, 220, 'initial',    NULL,        'Opening stock', '2024-01-01 00:00:00'),
('p0000014',   5,  0,   5, 'initial',    NULL,        'Opening stock', '2024-01-01 00:00:00'),
-- Sales
('p0000001',  -1, 50,  49, 'sale',       'oi00000001','Sold in ord0000001', '2024-03-14 22:45:00'),
('p0000004',  -1, 20,  19, 'sale',       'oi00000002','Sold in ord0000001', '2024-03-14 22:45:00'),
('p0000014',  -1,  5,   4, 'sale',       'oi00000003','Sold in ord0000002', '2024-05-01 18:30:00'),
-- Cancellation restores stock
('p0000013',  +1,  4,   5, 'return',     'oi00000009','Order ord0000005 cancelled', '2024-07-11 09:00:00'),
-- Restock
('p0000001',  +2, 48,  50, 'adjustment', NULL,        'Supplier restock',  '2024-08-01 10:00:00');


-- =============================================================================
-- REVIEWS
-- =============================================================================
INSERT INTO reviews
  (id, product_id, user_id, rating, title, body,
   is_verified_purchase, is_approved, created_at)
VALUES
('rv0000001', 'p0000001', '00000000-0000-0000-0000-000000000003',
 5, 'Exact OEM fit', 'These pads fit perfectly on my 2020 3 Series. Zero squealing. Absolutely recommend.', 1, 1, '2024-03-22 10:00:00'),

('rv0000002', 'p0000004', '00000000-0000-0000-0000-000000000003',
 5, 'Complete kit — saved me time', 'Everything was included. Install took 2.5 hours. Car runs smooth again.', 1, 1, '2024-03-23 14:30:00'),

('rv0000003', 'p0000014', '00000000-0000-0000-0000-000000000004',
 5, 'Sounds absolutely insane', 'The tone at idle is aggressive without being obnoxious. Power gains are real.', 1, 1, '2024-05-10 19:45:00'),

('rv0000004', 'p0000006', '00000000-0000-0000-0000-000000000005',
 4, 'Good filter, packaging could improve', 'Quality seems solid. The box was slightly dented. Filter itself fine.', 0, 1, '2024-09-20 08:00:00'),

('rv0000005', 'p0000002', '00000000-0000-0000-0000-000000000005',
 5, 'Excellent rotors', 'Pre-coated hubs are a nice touch. Bed-in procedure was easy. Great stopping power.', 0, 1, '2024-09-25 11:00:00'),

('rv0000006', 'p0000010', '00000000-0000-0000-0000-000000000006',
 4, 'Good fit, takes time to fill', 'Radiator fit well. Takes about 10 minutes longer to bleed than OEM. Minor complaint.', 0, 1, '2024-08-30 16:20:00'),

('rv0000007', 'p0000016', '00000000-0000-0000-0000-000000000006',
 5, 'Pre-assembled = 40 min job', 'No spring compressor needed. Just bolt in. Ride quality is like new.', 1, 1, '2024-09-01 09:00:00'),

('rv0000008', 'p0000004', '00000000-0000-0000-0000-000000000007',
 5, 'Genau das Richtige', 'Perfect fit on my Camry. Shipped fast to Germany. Very happy.', 1, 1, '2024-06-10 12:00:00'),

('rv0000009', 'p0000019', '00000000-0000-0000-0000-000000000004',
 3, 'Decent kit, missing one bolt', 'Chain and guides look good. Missing one mounting bolt. Had to source it locally.', 0, 1, '2024-07-05 17:00:00'),

('rv0000010', 'p0000018', '00000000-0000-0000-0000-000000000003',
 5, 'Noticeable difference in cabin air quality', 'Very easy swap. Cabin smells fresher. Highly recommend the carbon version.', 0, 1, '2024-09-15 13:00:00');


-- =============================================================================
-- WISHLISTS
-- =============================================================================
INSERT INTO wishlists (user_id, product_id, added_at) VALUES
('00000000-0000-0000-0000-000000000003', 'p0000019', '2024-09-01 10:00:00'),
('00000000-0000-0000-0000-000000000003', 'p0000005', '2024-09-05 14:00:00'),
('00000000-0000-0000-0000-000000000004', 'p0000016', '2024-08-10 11:00:00'),
('00000000-0000-0000-0000-000000000004', 'p0000017', '2024-08-15 09:00:00'),
('00000000-0000-0000-0000-000000000005', 'p0000009', '2024-09-18 08:00:00'),
('00000000-0000-0000-0000-000000000006', 'p0000013', '2024-09-12 20:00:00'),
('00000000-0000-0000-0000-000000000007', 'p0000011', '2024-09-17 15:00:00');


SET foreign_key_checks = 1;
-- =============================================================================
-- Seed complete.
-- =============================================================================
