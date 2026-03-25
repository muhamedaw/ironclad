// ─── Brands / Models / Years ─────────────────────────────────────
export const BRANDS = ['BMW', 'Mercedes-Benz', 'Toyota', 'Ford', 'Audi', 'Honda', 'Volkswagen', 'Nissan', 'Hyundai', 'Chevrolet'];

export const MODELS = {
  BMW: ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'M3', 'M5', 'Z4'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'AMG GT', 'CLA', 'GLA'],
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', '4Runner', 'Land Cruiser', 'Supra'],
  Ford: ['Mustang', 'F-150', 'Explorer', 'Bronco', 'Ranger', 'Edge', 'Focus', 'Fusion'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT', 'R8', 'e-tron'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V', 'Ridgeline', 'Odyssey'],
  Volkswagen: ['Golf', 'Passat', 'Tiguan', 'Atlas', 'Jetta', 'Arteon', 'ID.4'],
  Nissan: ['Altima', 'Maxima', 'Sentra', 'Rogue', 'Pathfinder', 'Frontier', 'GT-R'],
  Hyundai: ['Sonata', 'Elantra', 'Tucson', 'Santa Fe', 'Palisade', 'Ioniq 5'],
  Chevrolet: ['Silverado', 'Camaro', 'Corvette', 'Equinox', 'Tahoe', 'Suburban', 'Colorado'],
};

export const YEARS = Array.from({ length: 25 }, (_, i) => 2024 - i);

export const CATEGORIES = [
  { id: 'engine', label: 'Engine & Drivetrain', icon: '⚙️' },
  { id: 'brakes', label: 'Brakes & Suspension', icon: '🛞' },
  { id: 'electrical', label: 'Electrical & Lighting', icon: '⚡' },
  { id: 'body', label: 'Body & Exterior', icon: '🚗' },
  { id: 'interior', label: 'Interior & Comfort', icon: '💺' },
  { id: 'exhaust', label: 'Exhaust & Emissions', icon: '💨' },
  { id: 'cooling', label: 'Cooling System', icon: '❄️' },
  { id: 'fuel', label: 'Fuel System', icon: '⛽' },
];

// ─── YouTube video IDs for injection ────────────────────────────
export const TUTORIAL_VIDEOS = [
  { id: 'vid1', youtubeId: 'scK77q0TSEE', title: 'How to Replace Brake Pads — Full Guide', channel: 'ChrisFix', duration: '14:22' },
  { id: 'vid2', youtubeId: 'X4RL8-GGLO8', title: 'Engine Oil Change Step by Step', channel: 'Scotty Kilmer', duration: '11:05' },
  { id: 'vid3', youtubeId: 'j3PxEXpMlrw', title: 'How to Change Air Filter (Any Car)', channel: 'ChrisFix', duration: '8:47' },
  { id: 'vid4', youtubeId: 'GAJl6Nnck10', title: 'Spark Plug Replacement Guide', channel: 'EricTheCarGuy', duration: '12:30' },
  { id: 'vid5', youtubeId: 'TmjDnXD2Fhg', title: 'Timing Belt Replacement Tips', channel: 'SouthernSaab', duration: '18:15' },
  { id: 'vid6', youtubeId: '5wdUFnBNgBg', title: 'How to Replace a Car Battery', channel: 'ChrisFix', duration: '9:12' },
];

// ─── Parts names by category ─────────────────────────────────────
const PART_NAMES = {
  engine: ['Timing Belt Kit', 'Oil Filter Premium', 'Spark Plugs Set (8)', 'Engine Mount', 'Valve Cover Gasket', 'Head Gasket Set', 'Cam Shaft Seal', 'Crankshaft Pulley', 'Piston Ring Set', 'Con Rod Bearing Kit'],
  brakes: ['Brake Pad Set — Front', 'Brake Pad Set — Rear', 'Brake Rotor Pair', 'Brake Caliper Assembly', 'ABS Sensor Ring', 'Brake Drum', 'Wheel Cylinder', 'Master Cylinder', 'Brake Hose Kit', 'Shock Absorber Pair'],
  electrical: ['Alternator 140A', 'Starter Motor', 'Ignition Coil Pack', 'Oxygen Sensor — Upstream', 'MAF Sensor', 'Throttle Position Sensor', 'Crankshaft Position Sensor', 'Fuel Injector Set', 'ECU Module', 'Battery 74Ah AGM'],
  body: ['Front Bumper Cover', 'Side Mirror Assembly', 'Hood Strut Pair', 'Door Handle — Exterior', 'Windshield Wiper Set', 'Headlight Assembly', 'Tail Light Assembly', 'Fender Liner', 'Grille Assembly', 'Splash Guard Kit'],
  interior: ['Cabin Air Filter', 'Floor Mat Set — 4pc', 'Seat Cover Set', 'Dashboard Trim Kit', 'Door Sill Plates', 'Center Console Lid', 'Steering Wheel Cover', 'Sun Shade Reflector', 'Cargo Net', 'Gear Knob Shift'],
  exhaust: ['Catalytic Converter', 'Muffler Assembly', 'Exhaust Flex Pipe', 'O2 Sensor — Downstream', 'Exhaust Manifold Gasket', 'Exhaust Tip Chrome', 'Resonator Delete Pipe', 'EGR Valve', 'DPF Diesel Filter', 'Lambda Sensor Kit'],
  cooling: ['Radiator Assembly', 'Water Pump', 'Thermostat Kit', 'Coolant Reservoir', 'Radiator Hose Set', 'Electric Cooling Fan', 'Heater Core', 'Fan Clutch', 'Oil Cooler', 'Intercooler Pipe Kit'],
  fuel: ['Fuel Pump Assembly', 'Fuel Filter In-Line', 'Fuel Pressure Regulator', 'Fuel Injector Cleaner Set', 'Fuel Tank Cap', 'EVAP Canister', 'Carburetor Kit', 'Fuel Rail Assembly', 'Gasoline Strainer', 'Fuel Sender Unit'],
};

// ─── Generate realistic products ────────────────────────────────
let _id = 1;
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function makeProduct(categoryId, nameOverride) {
  const brand = rand(BRANDS);
  const model = rand(MODELS[brand]);
  const year = rand(YEARS.slice(0, 15));
  const price = randNum(19, 489) + 0.99;
  const originalPrice = Math.random() > 0.4 ? price + randNum(20, 120) : null;
  const rating = (3.4 + Math.random() * 1.6).toFixed(1);
  const reviews = randNum(4, 847);
  const inStock = Math.random() > 0.15;
  const isNew = Math.random() > 0.75;
  const isFeatured = Math.random() > 0.8;

  // Placehold images with category-based color seeds
  const colorMap = {
    engine: '1C1C1E/FFBA08', brakes: '3A1C1C/E05C2A',
    electrical: '1A1C2E/08BAFF', body: '1A2E1C/50C878',
    interior: '2E1C2A/FF6B9D', exhaust: '2E2A1C/FFA500',
    cooling: '1C2A2E/00CED1', fuel: '1C2E1C/90EE90',
  };
  const imgColor = colorMap[categoryId] || '1C1C1E/FFBA08';

  return {
    id: `p${_id++}`,
    name: nameOverride || rand(PART_NAMES[categoryId] || PART_NAMES.engine),
    category: categoryId,
    brand,
    model,
    year,
    price,
    originalPrice,
    rating: parseFloat(rating),
    reviews,
    inStock,
    isNew,
    isFeatured,
    sku: `IC-${String(_id).padStart(6, '0')}`,
    image: `https://placehold.co/480x360/${imgColor}?text=${encodeURIComponent(nameOverride?.split(' ')[0] || 'Part')}`,
    image2: `https://placehold.co/480x360/${imgColor}?text=Detail`,
    compatibleBrands: [brand, ...Array.from({ length: randNum(1, 3) }, () => rand(BRANDS))],
    tags: [
      ...(isNew ? ['New'] : []),
      ...(isFeatured ? ['Top Seller'] : []),
      ...(originalPrice ? ['Sale'] : []),
      ...(inStock ? [] : ['Out of Stock']),
    ],
    description: `OEM-grade ${nameOverride || 'part'} engineered for precise fitment on ${brand} ${model} (${year}). Manufactured to original equipment specifications. Includes all required hardware and detailed installation instructions. Backed by a 24-month / 24,000-mile warranty.`,
    specs: {
      'Material': rand(['Steel', 'Cast Iron', 'Aluminum Alloy', 'Polymer Composite', 'Billet Steel']),
      'Finish': rand(['Natural', 'Zinc Coated', 'Anodized', 'Powder Coated', 'Chrome']),
      'Weight': `${(0.3 + Math.random() * 4.7).toFixed(1)} kg`,
      'Warranty': rand(['12 months', '24 months', '36 months', '5 years']),
      'OEM Part #': `OEM-${randNum(10000, 99999)}`,
      'Condition': 'New',
    },
    shippingDays: randNum(1, 5),
  };
}

// Generate 96 products across categories
export const ALL_PRODUCTS = [
  ...CATEGORIES.flatMap(cat =>
    Array.from({ length: 12 }, (_, i) =>
      makeProduct(cat.id, PART_NAMES[cat.id]?.[i])
    )
  ),
];

// Reset id for reproducibility
export const PRODUCTS = ALL_PRODUCTS;

// ─── Reviews ─────────────────────────────────────────────────────
export const SAMPLE_REVIEWS = [
  { author: 'Marcus T.', rating: 5, date: '2024-08-14', text: 'Perfect fit on my X5. Installed in under an hour. Quality exceeds OEM.' },
  { author: 'Sarah K.', rating: 5, date: '2024-07-29', text: 'Fast shipping, well packaged. Part works flawlessly. Will buy again.' },
  { author: 'James R.', rating: 4, date: '2024-07-11', text: 'Good quality but instructions could be better. Part itself is solid.' },
  { author: 'Priya M.', rating: 5, date: '2024-06-30', text: 'Replaced OEM with this — no difference in performance. Highly recommend.' },
  { author: 'Derek L.', rating: 3, date: '2024-06-18', text: 'Decent part. Took a week to arrive but fits correctly.' },
];
