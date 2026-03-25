# 🔩 Ironclad API
> Scalable Node.js / Express backend for a car spare parts marketplace.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# 3. Seed database (creates tables + sample data)
npm run seed

# 4. Start development server
npm run dev
# → http://localhost:4000/api/v1
```

## Folder Structure

```
ironclad-api/
├── src/
│   ├── server.js           # Entry point — DB connect + HTTP listen
│   ├── app.js              # Express factory — all middleware wired
│   │
│   ├── config/
│   │   └── database.js     # Sequelize instance + connection pool
│   │
│   ├── models/
│   │   ├── index.js        # Associations + syncModels()
│   │   ├── User.js         # bcrypt hook, toSafeJSON(), comparePassword()
│   │   ├── Product.js      # Indexes: vehicle, category, price, fulltext
│   │   └── Order.js        # Order header + OrderItem (price snapshot)
│   │
│   ├── services/           # ← All business logic lives here
│   │   ├── auth.service.js     register / login / refresh / profile
│   │   ├── product.service.js  filter / CRUD / stock management
│   │   └── order.service.js    atomic order creation + cancellation
│   │
│   ├── controllers/        # HTTP layer only — delegates to services
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   └── order.controller.js
│   │
│   ├── routes/
│   │   ├── index.js        # Mounts all sub-routers at /api/v1
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   └── order.routes.js
│   │
│   ├── middleware/
│   │   ├── auth.js         # protect / authorize / optionalAuth
│   │   ├── errorHandler.js # global error + 404 handler
│   │   └── security.js     # rate limiters / sanitiser / requireJson
│   │
│   ├── validators/
│   │   ├── auth.validator.js
│   │   └── product.validator.js  (+ order validators)
│   │
│   └── utils/
│       ├── ApiError.js     # Custom error class + asyncHandler
│       ├── response.js     # Envelope helpers + getPagination()
│       ├── jwt.js          # sign / verify / cookie helpers
│       ├── logger.js       # Winston (JSON prod / pretty dev)
│       └── seeder.js       # Dev data seeder
│
├── tests/
│   └── api.test.js         # 36 integration tests (SQLite in-memory)
│
├── requests.http           # VS Code REST Client examples
├── .env.example
└── package.json
```

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create customer account |
| POST | `/auth/login` | — | Get access + refresh tokens |
| POST | `/auth/refresh` | Cookie | Rotate tokens |
| POST | `/auth/logout` | — | Clear refresh cookie |
| GET | `/auth/me` | ✓ | Get profile |
| PUT | `/auth/me` | ✓ | Update profile |
| PUT | `/auth/me/password` | ✓ | Change password |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | — | Filtered, paginated list |
| GET | `/products/:id` | — | Full product detail |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Soft delete |

**Product Filters** (`GET /products`):

| Param | Type | Example |
|-------|------|---------|
| `brand` | string | `BMW` |
| `model` | string | `3 Series` |
| `year` | integer | `2020` (matches year_from ≤ year ≤ year_to) |
| `category` | enum | `brakes` |
| `min_price` | float | `50` |
| `max_price` | float | `300` |
| `in_stock` | boolean | `true` |
| `featured` | boolean | `true` |
| `search` | string | `brake pads` |
| `sort` | enum | `price_asc`, `price_desc`, `rating`, `newest`, `featured` |
| `page` | int | `1` |
| `limit` | int | `20` (max 100) |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | ✓ | Place order (atomic stock deduction) |
| GET | `/orders` | ✓ | Own orders (admin: all orders) |
| GET | `/orders/:id` | ✓ | Order detail with items |
| PATCH | `/orders/:id/status` | ✓ | Update status / tracking |

## Response Envelope

Every response follows this structure:

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [...],
  "meta": {
    "total": 96,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Input validation failed",
  "code": "UNPROCESSABLE",
  "errors": [
    { "field": "password", "message": "Must contain an uppercase letter" }
  ]
}
```

## Security Features

- **Helmet** — sets 11 security response headers
- **CORS** — configurable allowed origins with credentials
- **Rate limiting** — 100 req/15min global; 10 req/15min on auth; 30 req/min on writes
- **JWT** — HS256 signed access tokens (7d) + httpOnly refresh cookie (30d)
- **bcrypt** — configurable work factor (default: 12 rounds)
- **Input sanitisation** — null bytes stripped, strings trimmed
- **express-validator** — field-level validation on all write endpoints
- **SQL injection** — prevented by Sequelize parameterised queries
- **Soft deletes** — `paranoid: true` on all models

## Running Tests

```bash
npm test
# 36 tests, 0 failures
# Uses SQLite in-memory — no MySQL needed
```

## Scripts

```bash
npm run dev    # nodemon watch mode
npm run start  # production start
npm run seed   # populate DB with sample data
npm test       # Jest integration tests
```

## Environment Variables

See `.env.example` for all options. Key variables:

```
PORT=4000
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
JWT_SECRET                  (min 64 chars in production)
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
ALLOWED_ORIGINS=http://localhost:5173
```
