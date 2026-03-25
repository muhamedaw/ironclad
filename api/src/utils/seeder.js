/**
 * utils/seeder.js
 * Populates the database with sample data for development.
 * Run: npm run seed
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { connectDB } = require('../config/database');
const { User, Product, syncModels } = require('../models');
const logger = require('./logger');

// ── Sample products ───────────────────────────────────────────────
const PRODUCTS = [
  {
    name: 'OEM Brake Pad Set — Front',
    sku: 'BP-BMW-3-FRONT-001',
    brand: 'BMW', model: '3 Series', year_from: 2015, year_to: 2023,
    category: 'brakes',
    price: 89.99, original_price: 119.99,
    stock_quantity: 48,
    description: 'Factory-spec ceramic brake pads for front axle. Includes all hardware and anti-squeal shims. OEM part #34116860499.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Brake+Pads'],
    rating_avg: 4.8, rating_count: 234,
    is_featured: true, shipping_days: 2,
  },
  {
    name: 'Timing Belt Kit with Water Pump',
    sku: 'TB-TOY-CAM-KIT-002',
    brand: 'Toyota', model: 'Camry', year_from: 2012, year_to: 2020,
    category: 'engine',
    price: 189.99, original_price: 249.00,
    stock_quantity: 22,
    description: 'Complete timing belt replacement kit including water pump, tensioner, and all gaskets. Fits 2.5L 2AR-FE engine.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Timing+Belt'],
    rating_avg: 4.9, rating_count: 312,
    is_featured: true, shipping_days: 3,
  },
  {
    name: 'Alternator 140A — Remanufactured',
    sku: 'ALT-FORD-F150-003',
    brand: 'Ford', model: 'F-150', year_from: 2015, year_to: 2024,
    category: 'electrical',
    price: 249.99,
    stock_quantity: 15,
    description: 'OEM-spec remanufactured alternator. 140-amp output, fits 5.0L and 3.5L EcoBoost. 2-year unlimited-mileage warranty.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Alternator'],
    rating_avg: 4.6, rating_count: 89,
    is_featured: false, shipping_days: 2,
  },
  {
    name: 'Radiator Assembly — Full Aluminium',
    sku: 'RAD-HOND-CIV-004',
    brand: 'Honda', model: 'Civic', year_from: 2016, year_to: 2021,
    category: 'cooling',
    price: 139.99, original_price: 179.99,
    stock_quantity: 9,
    description: 'Direct-fit aluminium radiator with plastic tanks. Includes drain plug and mounting hardware. No modifications required.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Radiator'],
    rating_avg: 4.7, rating_count: 156,
    is_featured: true, shipping_days: 3,
  },
  {
    name: 'Front Bumper Cover — Primed',
    sku: 'BMP-MERC-C-005',
    brand: 'Mercedes-Benz', model: 'C-Class', year_from: 2019, year_to: 2023,
    category: 'body',
    price: 349.99, original_price: 420.00,
    stock_quantity: 5,
    description: 'CAPA-certified primed front bumper cover with fog light openings and sensor provisions. Ready to paint.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Bumper'],
    rating_avg: 4.5, rating_count: 43,
    is_featured: false, shipping_days: 5,
  },
  {
    name: 'Catalytic Converter — Direct Fit',
    sku: 'CAT-AUD-A4-006',
    brand: 'Audi', model: 'A4', year_from: 2013, year_to: 2018,
    category: 'exhaust',
    price: 399.99,
    stock_quantity: 7,
    description: 'EPA-compliant catalytic converter for 2.0T TFSI engine. Stainless steel housing with pre-installed oxygen sensor bungs.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Cat+Conv'],
    rating_avg: 4.4, rating_count: 67,
    is_featured: false, shipping_days: 4,
  },
  {
    name: 'Fuel Pump Assembly',
    sku: 'FP-VW-GOLF-007',
    brand: 'Volkswagen', model: 'Golf', year_from: 2012, year_to: 2019,
    category: 'fuel',
    price: 179.99, original_price: 219.00,
    stock_quantity: 18,
    description: 'Complete in-tank fuel pump module with sending unit, filter sock, and wiring harness. Fits 1.4T and 2.0T engines.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Fuel+Pump'],
    rating_avg: 4.7, rating_count: 120,
    is_featured: true, shipping_days: 2,
  },
  {
    name: 'Cabin Air Filter — Premium',
    sku: 'CAF-NIS-ROG-008',
    brand: 'Nissan', model: 'Rogue', year_from: 2014, year_to: 2024,
    category: 'interior',
    price: 24.99, original_price: 34.99,
    stock_quantity: 200,
    description: 'High-efficiency cabin air filter with activated carbon layer. Removes 99.5% of particles down to 0.3 microns.',
    images: ['https://placehold.co/480x360/1C1C1E/FFBA08?text=Air+Filter'],
    rating_avg: 4.9, rating_count: 488,
    is_featured: true, shipping_days: 1,
  },
];

// ── Sample admin + customer users ─────────────────────────────────
const USERS = [
  {
    first_name: 'Admin',
    last_name: 'Ironclad',
    email: 'admin@ironclad.dev',
    password: 'Admin1234',
    role: 'admin',
    phone: '+1-555-000-0001',
  },
  {
    first_name: 'Jane',
    last_name: 'Mechanic',
    email: 'jane@example.com',
    password: 'Customer1234',
    role: 'customer',
    phone: '+1-555-000-0002',
  },
];

async function seed() {
  logger.info('── Seeder starting ──────────────────────────────');

  await connectDB();
  await syncModels({ force: true }); // ⚠️  Drops and recreates all tables
  logger.info('Tables recreated');

  // Seed users
  for (const u of USERS) {
    await User.create(u);
    logger.info(`  User created: ${u.email} [${u.role}]`);
  }

  // Seed products
  for (const p of PRODUCTS) {
    await Product.create(p);
    logger.info(`  Product created: ${p.sku}`);
  }

  logger.info(`\n✔  Seeded ${USERS.length} users and ${PRODUCTS.length} products`);
  logger.info('\n  Admin login:    admin@ironclad.dev  / Admin1234');
  logger.info('  Customer login: jane@example.com    / Customer1234\n');

  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seeder failed: ${err.message}`);
  process.exit(1);
});
