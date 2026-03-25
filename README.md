# Ironclad — Car Spare Parts Marketplace

Full-stack e-commerce platform. React frontend + Node.js APIs + MySQL.

## Quick start (local)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/ironclad.git
cd ironclad

# 2. Start the API (uses SQLite in dev — no MySQL needed)
cd api
cp .env.example .env
npm install
npm run dev
# API running at http://localhost:4000

# 3. Start the frontend (new terminal)
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:5173
```

## What's inside

| Folder | What it does |
|--------|-------------|
| `frontend/` | React + Vite marketplace (product grid, cart, checkout, admin) |
| `api/` | Express REST API (auth, products, orders, reviews, wishlist) |
| `recommendations/` | Recommendation engine with 8-signal scorer |
| `checkout-service/` | Stripe + PayPal + COD payment processing |
| `db/` | MySQL schema, seed data, sample queries |
| `deploy/` | Docker, Vercel config, GitHub Actions CI/CD |

## Tests

```bash
cd api && npm test              # 50 tests
cd recommendations && npm test  # 41 tests
```

## Deploy

See [deploy/DEPLOYMENT_GUIDE.md](deploy/DEPLOYMENT_GUIDE.md) for full step-by-step.

- **Frontend** → Vercel (automatic on push to main)
- **API** → Render.com
- **Database** → PlanetScale (managed MySQL)
