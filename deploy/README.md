# Ironclad — Car Spare Parts Marketplace

A full-stack, production-ready e-commerce platform built across 8 modules.

---

## Platform map

```
ironclad/
├── frontend/               React + Vite marketplace
│   ├── src/components/     ProductGrid, VideoCard, RecommendationWidget
│   ├── src/hooks/          useVideoSearch, useRecommendations, useViewHistory
│   ├── src/api/            checkoutApi.js, recommendationsApi.js
│   ├── PageBuilder.jsx     Drag-and-drop page editor (Elementor-style)
│   ├── AdminDashboard.jsx  Full admin panel with RBAC
│   └── CheckoutApp.jsx     Multi-step checkout + payment flow
│
├── api/                    Node.js + Express REST API
│   ├── src/controllers/    auth, product, order, review, wishlist
│   ├── src/services/       auth, product, order, review
│   ├── src/models/         User, Product, Order, OrderItem, Review, Wishlist
│   ├── src/middleware/     auth (JWT), errorHandler, security
│   └── tests/              50 passing integration tests
│
├── checkout-service/       Payment processing microservice
│   └── src/server.js       Stripe + PayPal + COD endpoints
│
├── recommendations/        Scoring engine
│   ├── src/engine/         scorer.js (8 signals), cache.js (TTL+LRU)
│   ├── src/services/       recommendation.service.js
│   └── tests/              41 passing tests
│
└── db/                     MySQL schema + migrations
    ├── schema.sql           17 tables, 37 indexes, 6 triggers, 5 views
    ├── sample_data.sql      Full seed dataset
    └── migrations/          Versioned migration files
```

---

## Module index

| # | Module | Tests | Status |
|---|--------|-------|--------|
| 1 | MySQL database schema | — | 17 tables, 20 FKs, 6 triggers |
| 2 | Node.js REST API | 50/50 | Auth, products, orders, reviews, wishlist |
| 3 | Smart video system | — | YouTube injection, lazy load, LRU cache |
| 4 | Recommendation engine | 41/41 | 8-signal scorer, co-purchase matrix |
| 5 | Drag-and-drop page builder | — | 12 block types, undo/redo, JSON save |
| 6 | Admin dashboard | — | RBAC, 4 roles, full CRUD |
| 7 | Checkout & payment | — | Stripe, PayPal, COD, 5-step flow |
| 8 | Deployment infrastructure | — | Docker, Vercel, Render, CI/CD |

---

## Quick start

```bash
# 1. Clone and configure
cp .env.example .env      # Fill in required values (see .env.example)

# 2. Start full stack
docker compose --profile local up

# Services:
#   Frontend   http://localhost:3000
#   API        http://localhost:4000/api/v1
#   Checkout   http://localhost:4002/api/v1

# 3. Apply migrations + seed
docker compose exec api node scripts/migrate.js --seed

# 4. Run tests
cd api && npm test          # 50 tests
cd recommendations && npm test   # 41 tests
```

---

## Recommendation scoring

The engine scores every product candidate against 8 signals:

| Signal | Weight | How it works |
|--------|--------|--------------|
| Vehicle compatibility | 40 | Exact fitment match in `product_compat` |
| Category match | 25 | User browsed this category recently |
| Co-purchase affinity | 20 | Bought together with viewed items |
| Trending | 15 | Sales velocity vs pool max |
| Rating quality | 10 | Bayesian: `(avg/5) × log(count)` |
| Price similarity | 8 | Gaussian decay from avg viewed price |
| New arrival | 5 | Listed within last 30 days |
| Already viewed | −30 | Recency-weighted penalty |

---

## API endpoints

```
Auth
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
  GET  /api/v1/auth/me

Products
  GET  /api/v1/products           ?brand= &model= &year= &page= &limit=
  GET  /api/v1/products/:id
  POST /api/v1/products           (admin)
  PUT  /api/v1/products/:id       (admin)
  DELETE /api/v1/products/:id     (admin)

Orders
  POST /api/v1/orders
  GET  /api/v1/orders
  GET  /api/v1/orders/:id
  PATCH /api/v1/orders/:id/status

Reviews
  GET  /api/v1/products/:id/reviews
  POST /api/v1/products/:id/reviews
  DELETE /api/v1/products/:id/reviews/:reviewId

Wishlist
  GET  /api/v1/wishlist
  POST /api/v1/wishlist/:productId   (toggle)
  GET  /api/v1/wishlist/:productId   (check)

Recommendations
  GET  /api/v1/recommendations           ?brand= &model= &year= &viewedIds=
  GET  /api/v1/recommendations/popular   ?limit=
  GET  /api/v1/recommendations/vehicle   ?brand= &model= &year=
  GET  /api/v1/recommendations/similar/:id
  POST /api/v1/recommendations/batch

Payment
  POST /api/checkout/session
  POST /api/payment/card/intent
  POST /api/payment/paypal/order
  POST /api/payment/paypal/capture
  POST /api/payment/cod/confirm
  POST /api/payment/webhook
  GET  /api/orders/:id

Health
  GET  /api/v1/health
  GET  /api/v1/ready
  GET  /api/v1/metrics
```

---

## Deployment targets

| Service | Target | URL pattern |
|---------|--------|-------------|
| Frontend | Vercel | `ironclad.vercel.app` |
| API | Render / VPS | `api.ironclad-parts.com` |
| Checkout | Render / VPS | `checkout.ironclad-parts.com` |
| MySQL | PlanetScale | `aws.connect.psdb.cloud` |
| Redis | Render / Upstash | internal |

Full step-by-step guide: see `DEPLOYMENT_GUIDE.md`.

---

## Admin dashboard credentials

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `super@ironclad.dev` | `super123` | Super Admin | Everything |
| `admin@ironclad.dev` | `admin123` | Admin | All except user management |
| `manager@ironclad.dev` | `mgr123` | Manager | Products, orders, analytics |
| `viewer@ironclad.dev` | `view123` | Viewer | Orders + analytics only |

---

## Environment variables

See `.env.example` for the complete reference with descriptions.

Required to start:
```bash
MYSQL_ROOT_PASSWORD=...
MYSQL_PASSWORD=...
JWT_SECRET=...            # 64+ random bytes
JWT_REFRESH_SECRET=...    # 64+ random bytes, different from above
```

Required for payments:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| State management | useReducer + Context |
| Styling | CSS-in-JS (inline) + Google Fonts |
| Backend runtime | Node.js 20 |
| Backend framework | Express 4 |
| ORM | Sequelize 6 |
| Database | MySQL 8.0 |
| Cache | Redis 7 |
| Auth | JWT (access 15m + refresh 30d) |
| Payments | Stripe + PayPal SDK |
| Container | Docker + nginx |
| CI/CD | GitHub Actions |
| Frontend deploy | Vercel |
| Backend deploy | Render |
| DB managed | PlanetScale |

---

## License

MIT — see LICENSE file.
