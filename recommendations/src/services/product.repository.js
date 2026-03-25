/**
 * services/product.repository.js
 * ─────────────────────────────────────────────────────────────────
 * Data access for the recommendation engine.
 * In production this would query MySQL via Sequelize.
 * The mock implementation lets unit tests run without a DB.
 */

'use strict';

// ── Mock product catalog (swap for Sequelize queries in production) ──────────
const MOCK_PRODUCTS = [
  // Engine
  { id:'p001', name:'OEM Brake Pad Set — Front', categoryId:'c-brakes', parentCategoryId:null, brand:'BMW', price:89.99, ratingAvg:4.8, ratingCount:234, salesVelocity:12, isActive:true, createdAt:'2024-01-15', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2015,yearTo:2023},{brand:'BMW',model:'5 Series',yearFrom:2017,yearTo:2023}] },
  { id:'p002', name:'Timing Belt Kit with Water Pump', categoryId:'c-engine', parentCategoryId:null, brand:'Toyota', price:189.99, originalPrice:249.99, ratingAvg:4.9, ratingCount:312, salesVelocity:18, isActive:true, createdAt:'2024-02-01', compatibleVehicles:[{brand:'Toyota',model:'Camry',yearFrom:2012,yearTo:2023}] },
  { id:'p003', name:'Alternator 140A Remanufactured', categoryId:'c-electrical', parentCategoryId:null, brand:'Ford', price:249.99, ratingAvg:4.6, ratingCount:89, salesVelocity:7, isActive:true, createdAt:'2024-01-20', compatibleVehicles:[{brand:'Ford',model:'F-150',yearFrom:2015,yearTo:2024}] },
  { id:'p004', name:'Full Aluminium Radiator', categoryId:'c-cooling', parentCategoryId:null, brand:'Honda', price:159.99, originalPrice:199.99, ratingAvg:4.7, ratingCount:156, salesVelocity:9, isActive:true, createdAt:'2024-03-01', compatibleVehicles:[{brand:'Honda',model:'Civic',yearFrom:2016,yearTo:2023}] },
  { id:'p005', name:'Front Strut Assembly Pair', categoryId:'c-suspension', parentCategoryId:'c-brakes', brand:'Toyota', price:289.99, originalPrice:349.99, ratingAvg:4.8, ratingCount:201, salesVelocity:14, isActive:true, createdAt:'2024-02-15', compatibleVehicles:[{brand:'Toyota',model:'RAV4',yearFrom:2019,yearTo:2023}] },
  { id:'p006', name:'MAF Sensor — 2.0T', categoryId:'c-electrical', parentCategoryId:null, brand:'BMW', price:119.99, originalPrice:149.99, ratingAvg:4.5, ratingCount:67, salesVelocity:5, isActive:true, createdAt:'2024-01-10', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2012,yearTo:2019},{brand:'BMW',model:'5 Series',yearFrom:2013,yearTo:2020}] },
  { id:'p007', name:'Upstream O2 Sensor', categoryId:'c-electrical', parentCategoryId:null, brand:'Honda', price:59.99, originalPrice:79.99, ratingAvg:4.4, ratingCount:145, salesVelocity:20, isActive:true, createdAt:'2024-03-10', compatibleVehicles:[{brand:'Honda',model:'Civic',yearFrom:2020,yearTo:2024}] },
  { id:'p008', name:'Head Gasket Set 2.0T', categoryId:'c-engine', parentCategoryId:null, brand:'BMW', price:219.99, ratingAvg:4.7, ratingCount:44, salesVelocity:3, isActive:true, createdAt:'2023-12-01', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2012,yearTo:2019}] },
  { id:'p009', name:'Catalytic Converter Direct-Fit', categoryId:'c-exhaust', parentCategoryId:null, brand:'Audi', price:449.99, ratingAvg:4.4, ratingCount:67, salesVelocity:4, isActive:true, createdAt:'2024-01-05', compatibleVehicles:[{brand:'Audi',model:'A4',yearFrom:2013,yearTo:2022}] },
  { id:'p010', name:'Fuel Pump Assembly', categoryId:'c-fuel', parentCategoryId:null, brand:'VW', price:179.99, originalPrice:219.99, ratingAvg:4.6, ratingCount:120, salesVelocity:8, isActive:true, createdAt:'2024-02-20', compatibleVehicles:[{brand:'Volkswagen',model:'Golf',yearFrom:2012,yearTo:2020}] },
  { id:'p011', name:'Brake Rotor Slotted Pair — Front', categoryId:'c-brakes', parentCategoryId:null, brand:'BMW', price:149.99, originalPrice:189.99, ratingAvg:4.8, ratingCount:178, salesVelocity:15, isActive:true, createdAt:'2024-03-15', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2015,yearTo:2023},{brand:'BMW',model:'M3',yearFrom:2018,yearTo:2023}] },
  { id:'p012', name:'Water Pump with Gasket', categoryId:'c-cooling', parentCategoryId:null, brand:'Toyota', price:89.99, ratingAvg:4.6, ratingCount:98, salesVelocity:11, isActive:true, createdAt:'2024-01-25', compatibleVehicles:[{brand:'Toyota',model:'Camry',yearFrom:2018,yearTo:2024}] },
  { id:'p013', name:'Spark Plugs NGK Iridium (Set of 4)', categoryId:'c-engine', parentCategoryId:null, brand:'Honda', price:44.99, ratingAvg:4.9, ratingCount:420, salesVelocity:28, isActive:true, createdAt:'2023-11-01', compatibleVehicles:[{brand:'Honda',model:'Civic',yearFrom:2016,yearTo:2024},{brand:'Honda',model:'Accord',yearFrom:2016,yearTo:2024}] },
  { id:'p014', name:'Engine Air Filter K&N Performance', categoryId:'c-engine', parentCategoryId:null, brand:'Ford', price:39.99, ratingAvg:4.7, ratingCount:560, salesVelocity:35, isActive:true, createdAt:'2023-10-15', compatibleVehicles:[{brand:'Ford',model:'Mustang',yearFrom:2015,yearTo:2024},{brand:'Ford',model:'F-150',yearFrom:2015,yearTo:2024}] },
  { id:'p015', name:'Timing Chain Kit Complete — N20', categoryId:'c-engine', parentCategoryId:null, brand:'BMW', price:349.99, originalPrice:429.99, ratingAvg:4.6, ratingCount:52, salesVelocity:4, isActive:true, createdAt:'2024-03-20', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2012,yearTo:2019},{brand:'BMW',model:'5 Series',yearFrom:2013,yearTo:2020}] },
  { id:'p016', name:'Cabin Air Filter — Carbon', categoryId:'c-interior', parentCategoryId:null, brand:'Nissan', price:22.99, originalPrice:32.99, ratingAvg:4.9, ratingCount:488, salesVelocity:42, isActive:true, createdAt:'2024-02-05', compatibleVehicles:[{brand:'Nissan',model:'Rogue',yearFrom:2014,yearTo:2024}] },
  { id:'p017', name:'Front Bumper Cover Primed', categoryId:'c-body', parentCategoryId:null, brand:'Mercedes-Benz', price:399.99, ratingAvg:4.5, ratingCount:43, salesVelocity:3, isActive:true, createdAt:'2024-01-18', compatibleVehicles:[{brand:'Mercedes-Benz',model:'C-Class',yearFrom:2019,yearTo:2024}] },
  { id:'p018', name:'Power Steering Pump Rebuilt', categoryId:'c-steering', parentCategoryId:null, brand:'Toyota', price:139.99, ratingAvg:4.5, ratingCount:76, salesVelocity:6, isActive:true, createdAt:'2024-02-10', compatibleVehicles:[{brand:'Toyota',model:'Camry',yearFrom:2012,yearTo:2018}] },
  { id:'p019', name:'Oil Filter Premium Synthetic', categoryId:'c-engine', parentCategoryId:null, brand:'BMW', price:24.99, originalPrice:34.99, ratingAvg:4.8, ratingCount:892, salesVelocity:55, isActive:true, createdAt:'2023-09-01', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2010,yearTo:2024},{brand:'BMW',model:'5 Series',yearFrom:2010,yearTo:2024},{brand:'Volkswagen',model:'Golf',yearFrom:2012,yearTo:2020}] },
  { id:'p020', name:'Coil Pack Ignition Set', categoryId:'c-electrical', parentCategoryId:null, brand:'Audi', price:169.99, ratingAvg:4.6, ratingCount:88, salesVelocity:7, isActive:true, createdAt:'2024-03-05', compatibleVehicles:[{brand:'Audi',model:'A4',yearFrom:2009,yearTo:2018},{brand:'Volkswagen',model:'Passat',yearFrom:2011,yearTo:2019}] },
  { id:'p021', name:'EBC Greenstuff Brake Pads — Rear', categoryId:'c-brakes', parentCategoryId:null, brand:'Ford', price:79.99, originalPrice:99.99, ratingAvg:4.6, ratingCount:133, salesVelocity:10, isActive:true, createdAt:'2024-01-30', compatibleVehicles:[{brand:'Ford',model:'Mustang',yearFrom:2015,yearTo:2024}] },
  { id:'p022', name:'Thermostat Housing Assembly', categoryId:'c-cooling', parentCategoryId:null, brand:'BMW', price:69.99, originalPrice:89.99, ratingAvg:4.5, ratingCount:61, salesVelocity:6, isActive:true, createdAt:'2024-01-12', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2012,yearTo:2019}] },
  { id:'p023', name:'Windshield Wiper Set — 24+19', categoryId:'c-exterior', parentCategoryId:'c-body', brand:'Honda', price:28.99, ratingAvg:4.7, ratingCount:344, salesVelocity:38, isActive:true, createdAt:'2023-08-01', compatibleVehicles:[] },
  { id:'p024', name:'CV Axle Shaft — Front Left', categoryId:'c-drivetrain', parentCategoryId:null, brand:'Toyota', price:119.99, ratingAvg:4.5, ratingCount:97, salesVelocity:9, isActive:true, createdAt:'2024-02-28', compatibleVehicles:[{brand:'Toyota',model:'Camry',yearFrom:2012,yearTo:2023}] },
  { id:'p025', name:'Control Arm Kit — Front Lower', categoryId:'c-suspension', parentCategoryId:'c-brakes', brand:'BMW', price:199.99, ratingAvg:4.7, ratingCount:72, salesVelocity:5, isActive:true, createdAt:'2024-03-08', compatibleVehicles:[{brand:'BMW',model:'3 Series',yearFrom:2006,yearTo:2013}] },
];

// ── Mock order history for co-purchase matrix ─────────────────────
const MOCK_ORDER_ITEMS = [
  // Orders that contain multiple products (simulate real purchases)
  { orderId:'o001', productId:'p001' }, { orderId:'o001', productId:'p011' }, { orderId:'o001', productId:'p019' },
  { orderId:'o002', productId:'p002' }, { orderId:'o002', productId:'p012' }, { orderId:'o002', productId:'p024' },
  { orderId:'o003', productId:'p001' }, { orderId:'o003', productId:'p022' }, { orderId:'o003', productId:'p006' },
  { orderId:'o004', productId:'p013' }, { orderId:'o004', productId:'p014' }, { orderId:'o004', productId:'p019' },
  { orderId:'o005', productId:'p003' }, { orderId:'o005', productId:'p014' },
  { orderId:'o006', productId:'p004' }, { orderId:'o006', productId:'p007' }, { orderId:'o006', productId:'p013' },
  { orderId:'o007', productId:'p015' }, { orderId:'o007', productId:'p022' }, { orderId:'o007', productId:'p019' },
  { orderId:'o008', productId:'p011' }, { orderId:'o008', productId:'p001' }, { orderId:'o008', productId:'p025' },
  { orderId:'o009', productId:'p005' }, { orderId:'o009', productId:'p012' },
  { orderId:'o010', productId:'p020' }, { orderId:'o010', productId:'p009' },
  { orderId:'o011', productId:'p016' }, { orderId:'o011', productId:'p023' },
  { orderId:'o012', productId:'p019' }, { orderId:'o012', productId:'p002' }, { orderId:'o012', productId:'p008' },
  { orderId:'o013', productId:'p001' }, { orderId:'o013', productId:'p011' }, { orderId:'o013', productId:'p025' },
  { orderId:'o014', productId:'p006' }, { orderId:'o014', productId:'p015' }, { orderId:'o014', productId:'p022' },
  { orderId:'o015', productId:'p021' }, { orderId:'o015', productId:'p003' },
];


// ── Repository methods ────────────────────────────────────────────

/**
 * getCandidateProducts — returns products eligible for recommendation.
 * Production: SELECT * FROM products WHERE is_active=1 ... with indexes.
 */
async function getCandidateProducts({ isActive = true, categoryId = null, limit = 500 } = {}) {
  // Simulate async DB call
  await delay(5);
  let products = MOCK_PRODUCTS.filter(p => p.isActive === isActive);
  if (categoryId) products = products.filter(p => p.categoryId === categoryId);
  return products.slice(0, limit);
}


/**
 * getProductById — fetch single product by ID.
 */
async function getProductById(id) {
  await delay(2);
  return MOCK_PRODUCTS.find(p => p.id === id) || null;
}


/**
 * getProductsByIds — fetch multiple products by ID list.
 */
async function getProductsByIds(ids) {
  await delay(3);
  const set = new Set(ids);
  return MOCK_PRODUCTS.filter(p => set.has(p.id));
}


/**
 * getRecentOrderItems — returns order line items for the past N days.
 * Used to build the co-purchase affinity matrix.
 *
 * Production SQL:
 *   SELECT order_id, product_id
 *   FROM order_items oi
 *   JOIN orders o ON o.id = oi.order_id
 *   WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
 *     AND o.status NOT IN ('cancelled','refunded')
 */
async function getRecentOrderItems(_days = 90) {
  await delay(10);
  return MOCK_ORDER_ITEMS;
}


// ── Helpers ───────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }


module.exports = {
  getCandidateProducts,
  getProductById,
  getProductsByIds,
  getRecentOrderItems,
  // Expose mock data for tests
  _MOCK_PRODUCTS:    MOCK_PRODUCTS,
  _MOCK_ORDER_ITEMS: MOCK_ORDER_ITEMS,
};
