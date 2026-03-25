# IRONCLAD — AI Recommendation System
## Complete Integration Guide

---

## Quick Start

```bash
# Install
npm install

# Start dev server (port 4001)
npm run dev

# Run all 41 tests
npm test

# Production start
npm start
```

---

## Architecture

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────────┐
│  Express App  (app.js)                        │
│  ├── Rate limiter + CORS                      │
│  └── Router: /api/v1/recommendations/...      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Controller  (recommendation.controller.js)   │
│  • Parses HTTP context (brand, model, year,   │
│    viewedIds, strategy, limit)                │
│  • Validates with express-validator           │
│  • Formats response envelope                  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Service  (recommendation.service.js)         │
│  • Checks TTL cache (miss → compute)          │
│  • Loads candidate products from repository   │
│  • Retrieves co-purchase affinity matrix      │
│  • Selects strategy function                  │
│  • Calls scorer.scoreProducts()               │
│  • Applies diversity filter                   │
│  • Builds reason strings                      │
│  • Caches result                              │
└────────┬───────────────────┬─────────────────┘
         │                   │
         ▼                   ▼
┌────────────────┐  ┌────────────────────────┐
│  Scorer Engine │  │  Product Repository    │
│  (scorer.js)   │  │  (product.repository)  │
│                │  │                        │
│  8 signals:    │  │  getCandidateProducts  │
│  • compat   40 │  │  getProductById        │
│  • category 25 │  │  getRecentOrderItems   │
│  • co-buy   20 │  │  (mock → Sequelize)    │
│  • trending 15 │  └────────────────────────┘
│  • rating   10 │
│  • price     8 │
│  • new       5 │
│  • viewed  -30 │
└────────────────┘
```

---

## API Reference

### Base URL
```
http://localhost:4001/api/v1
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/recommendations` | General personalised |
| GET | `/recommendations/popular` | Trending products |
| GET | `/recommendations/vehicle` | Compatible with a car |
| GET | `/recommendations/similar/:id` | Similar to one product |
| POST | `/recommendations/batch` | Multiple widgets, 1 request |
| GET | `/recommendations/cache/stats` | Cache diagnostics |
| DELETE | `/recommendations/cache` | Flush cache (admin) |
| GET | `/health` | Health check |

---

## HTTP Request Examples

### 1. Popular products (homepage widget)

```http
GET /api/v1/recommendations/popular?limit=8
```

```json
{
  "success": true,
  "data": [
    {
      "id": "p019",
      "name": "Oil Filter Premium Synthetic",
      "brand": "BMW",
      "price": 24.99,
      "originalPrice": 34.99,
      "ratingAvg": 4.8,
      "ratingCount": 892,
      "score": 52.14,
      "reason": "Trending this week"
    }
  ],
  "meta": {
    "total": 8,
    "strategy": "popular",
    "fromCache": false,
    "latencyMs": 18
  }
}
```

---

### 2. Vehicle-targeted parts

```http
GET /api/v1/recommendations/vehicle?brand=BMW&model=3+Series&year=2021&limit=8
```

```json
{
  "success": true,
  "data": [
    {
      "id": "p001",
      "name": "OEM Brake Pad Set — Front",
      "brand": "BMW",
      "price": 89.99,
      "score": 74.20,
      "reason": "Perfect fit for your BMW"
    },
    {
      "id": "p011",
      "name": "Brake Rotor Slotted Pair",
      "brand": "BMW",
      "price": 149.99,
      "score": 71.80,
      "reason": "Perfect fit for your BMW"
    }
  ],
  "meta": {
    "vehicle": { "brand": "BMW", "model": "3 Series", "year": 2021 },
    "total": 8,
    "fromCache": false,
    "latencyMs": 22
  }
}
```

---

### 3. Similar products (product detail page)

```http
GET /api/v1/recommendations/similar/p001?viewedIds=p011,p019&limit=6
```

Response includes products in the same category (brakes) with co-purchase boosts.

---

### 4. Fully personalised (all signals active)

```http
GET /api/v1/recommendations?brand=BMW&model=3+Series&year=2021&viewedIds=p001,p011,p019&limit=10&strategy=personal
```

Or as POST with JSON body:

```http
POST /api/v1/recommendations
Content-Type: application/json

{
  "brand": "BMW",
  "model": "3 Series",
  "year": 2021,
  "viewedIds": ["p001", "p011", "p019"],
  "strategy": "personal",
  "limit": 10
}
```

---

### 5. Batch — 3 widget types, 1 round-trip

```http
POST /api/v1/recommendations/batch
Content-Type: application/json

{
  "requests": [
    { "type": "popular",  "limit": 6 },
    { "type": "vehicle",  "brand": "BMW", "model": "3 Series", "year": 2021, "limit": 6 },
    { "type": "personal", "viewedIds": ["p001","p011"], "brand": "BMW", "limit": 4 }
  ]
}
```

Response:

```json
{
  "success": true,
  "results": [
    { "type": "popular",  "success": true, "data": [...], "meta": { "total": 6 } },
    { "type": "vehicle",  "success": true, "data": [...], "meta": { "total": 6 } },
    { "type": "personal", "success": true, "data": [...], "meta": { "total": 4 } }
  ]
}
```

---

### 6. Signal explain mode (debug)

```http
GET /api/v1/recommendations/vehicle?brand=BMW&model=3+Series&year=2021&limit=5&explain=true
```

Each item includes a `signals` object:

```json
{
  "id": "p001",
  "name": "OEM Brake Pad Set — Front",
  "score": 74.20,
  "reason": "Perfect fit for your BMW",
  "signals": {
    "vehicleCompat":   1.0,
    "categoryMatch":   0.0,
    "coPurchase":      0.3,
    "trending":        0.218,
    "rating":          0.771,
    "priceSimilarity": 0.0,
    "newArrival":      0.0,
    "alreadyViewed":   0.0
  }
}
```

---

### 7. Cache bypass (force fresh score)

```http
GET /api/v1/recommendations/popular?limit=8&noCache=true
```

---

## Frontend React Integration

### Minimal — 5 lines

```jsx
import { usePopularProducts } from './hooks/useRecommendations';
import RecommendationWidget from './components/RecommendationWidget';

function Sidebar() {
  const { products, loading } = usePopularProducts({ limit: 6 });
  return <RecommendationWidget title="Popular Parts" products={products} loading={loading} />;
}
```

### Full personalised (all signals)

```jsx
import { useViewHistory, useRecommendations } from './hooks/useRecommendations';

function ProductDetail({ product, vehicle }) {
  const { viewedIds, trackView } = useViewHistory();

  // Track this view
  useEffect(() => trackView(product.id), [product.id]);

  const { products, loading } = useRecommendations({
    viewedIds,
    vehicle,           // { brand: 'BMW', model: '3 Series', year: 2021 }
    strategy: 'personal',
    limit: 8,
  });

  return <RecommendationWidget title="Recommended for You" products={products} loading={loading} />;
}
```

### Batch load — one round-trip for entire page

```jsx
import { useState, useEffect } from 'react';
import { fetchBatch } from './api/recommendationsApi';

function MarketplacePage({ vehicle }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchBatch([
      { type: 'popular',  limit: 6 },
      { type: 'vehicle', ...vehicle, limit: 6 },
    ]).then(res => setData(res.results));
  }, [vehicle?.brand]);

  if (!data) return <SkeletonGrid />;
  return (
    <>
      <RecommendationWidget title="Trending"          products={data[0]?.data} />
      <RecommendationWidget title="For Your Vehicle"  products={data[1]?.data} vehicle={vehicle} />
    </>
  );
}
```

---

## Scoring Algorithm

### Weights

```
Signal                Weight    Notes
──────────────────────────────────────────────────────────
vehicleCompat           40      1.0 = exact match, 0.5 = brand only
categoryMatch           25      1.0 = same cat, 0.6 = parent, 0.3 = sibling
coPurchase              20      Normalised against 50 co-purchases = full score
trending                15      salesVelocity / maxVelocity in pool
rating                  10      Bayesian: (avg/5) × log10(count) / log10(maxCount)
priceSimilarity          8      Gaussian centred on avg viewed price, ±30% band
newArrival               5      Listed within last 30 days → 1, else 0
alreadyViewed          -30      Recency-weighted penalty for seen products
```

### Tuning tips

**Boost vehicle compatibility** — increase `W.VEHICLE_COMPAT` to 60 if customers primarily filter by car.

**Boost co-purchase** — increase `W.CO_PURCHASE` after you have 10,000+ real orders (matrix becomes meaningful).

**Reduce penalty** — lower `Math.abs(W.ALREADY_VIEWED)` if you want to re-surface seen but not-purchased items.

**Price band** — reduce `CONFIG.priceSimilarityPct` from 0.30 to 0.20 for stricter price matching.

---

## Connecting to MySQL (production)

Replace the mock functions in `product.repository.js`:

```js
// Before (mock):
async function getCandidateProducts(filter) {
  return MOCK_PRODUCTS.filter(p => p.isActive);
}

// After (Sequelize):
const { Product } = require('../../models');

async function getCandidateProducts({ isActive, categoryId, limit }) {
  return Product.findAll({
    where: {
      is_active: isActive,
      deleted_at: null,
      ...(categoryId && { category_id: categoryId }),
    },
    // Only columns needed for scoring — don't load TEXT description
    attributes: [
      'id','name','sku','brand','model','category_id','price',
      'original_price','stock_quantity','rating_avg','rating_count',
      'is_active','is_featured','created_at','sales_count',
    ],
    limit,
    raw: true,
  });
}

async function getRecentOrderItems(days = 90) {
  const { OrderItem, Order } = require('../../models');
  return OrderItem.findAll({
    attributes: ['order_id', 'product_id'],
    include: [{
      model: Order,
      attributes: [],
      where: {
        status: { [Op.notIn]: ['cancelled', 'refunded'] },
        created_at: { [Op.gte]: new Date(Date.now() - days * 86400000) },
      },
      required: true,
    }],
    raw: true,
  });
}
```

---

## Environment Variables

```bash
# .env
PORT=4001
NODE_ENV=development
LOG_LEVEL=info         # debug | info | warn | error
```

---

## Folder Structure

```
ironclad-recommendations/
├── Dockerfile
├── package.json
├── src/
│   ├── server.js               ← Entry point + graceful shutdown
│   ├── app.js                  ← Express factory
│   ├── engine/
│   │   ├── scorer.js           ← Pure scoring logic (no I/O)
│   │   └── cache.js            ← TTL+LRU cache
│   ├── services/
│   │   ├── recommendation.service.js
│   │   └── product.repository.js
│   ├── controllers/
│   │   └── recommendation.controller.js
│   ├── routes/
│   │   └── recommendation.routes.js
│   ├── middleware/
│   │   └── validators.js
│   └── utils/
│       ├── ApiError.js
│       ├── asyncHandler.js
│       └── logger.js
├── frontend/src/
│   ├── api/recommendationsApi.js    ← Client (dedup + cache + retry)
│   ├── hooks/useRecommendations.js  ← 5 React hooks
│   ├── components/RecommendationWidget.jsx
│   └── examples/UsageExamples.jsx   ← 7 complete usage patterns
└── tests/
    └── recommendations.test.js      ← 41 tests, 0 failures
```
