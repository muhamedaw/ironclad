# Ironclad — Complete Deployment Guide

Everything needed to take Ironclad from local development to production.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION                                 │
│                                                                      │
│   Browser ──→  Vercel CDN  ──→  React SPA (frontend)                │
│                    │                                                 │
│                    ├──→  Render / VPS  ──→  API Service  :4000      │
│                    │                            │                   │
│                    └──→  Render / VPS  ──→  Checkout     :4002      │
│                                                 │                   │
│                                          PlanetScale MySQL           │
│                                          Redis (Render/Upstash)     │
└─────────────────────────────────────────────────────────────────────┘

  Deploy pipeline:
  GitHub push → CI tests → Docker build → Vercel (FE) + Render (BE)
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | `nvm install 20` |
| Docker Desktop | latest | https://docker.com |
| Vercel CLI | latest | `npm i -g vercel` |
| Git | any | pre-installed |

---

## Part 1 — Local Development

### 1.1 Clone and configure

```bash
git clone https://github.com/yourorg/ironclad.git
cd ironclad

# Copy environment template
cp .env.example .env
```

Open `.env` and fill in **at minimum**:

```bash
MYSQL_ROOT_PASSWORD=devroot123
MYSQL_PASSWORD=devpass123
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Stripe test keys (from dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Leave PayPal as sandbox defaults for now
PAYPAL_ENV=sandbox
```

### 1.2 Start the full local stack

```bash
# Start all services (MySQL + Redis + API + Checkout + Frontend)
docker compose --profile local up

# First run takes ~3 minutes to pull images and run migrations
# Services ready when you see:
#   api        | [INFO] ironclad-api listening on :4000
#   checkout   | [INFO] ironclad-recommendations listening on :4002
#   frontend   | nginx: ready
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Checkout | http://localhost:4002/api/v1 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

### 1.3 Run database migrations

```bash
# Apply all pending migrations
docker compose exec api node scripts/migrate.js

# Seed with sample data
docker compose exec api node scripts/migrate.js --seed

# Check migration status
docker compose exec api node scripts/migrate.js --status
```

### 1.4 Verify everything is working

```bash
# Health checks
curl http://localhost:4000/api/v1/health
# → {"success":true,"service":"ironclad-api","uptime":12}

curl http://localhost:4002/api/v1/health
# → {"success":true,"service":"ironclad-checkout","uptime":8}

# Quick API test
curl http://localhost:4000/api/v1/recommendations/popular?limit=3
```

---

## Part 2 — Database (PlanetScale / Cloud MySQL)

PlanetScale is recommended for managed MySQL with branching and zero-downtime schema changes. Alternatives: Railway, Aiven, DigitalOcean Managed MySQL.

### 2.1 PlanetScale setup

```bash
# 1. Install pscale CLI
brew install planetscale/tap/pscale
# or: https://github.com/planetscale/cli#installation

# 2. Authenticate
pscale auth login

# 3. Create database
pscale database create ironclad --region us-east

# 4. Create development branch
pscale branch create ironclad initial-schema

# 5. Open a secure tunnel
pscale connect ironclad initial-schema --port 3309
# Leave this running in a separate terminal

# 6. Apply schema through the tunnel
mysql -h 127.0.0.1 -P 3309 -u root < db/schema.sql
mysql -h 127.0.0.1 -P 3309 -u root < db/sample_data.sql

# 7. Promote branch to main
pscale branch promote ironclad initial-schema

# 8. Create a production password
pscale password create ironclad main production-app
# → Saves username/password — copy DATABASE_URL from output
```

Your `DATABASE_URL` will look like:
```
mysql://abc123:pscale_pw_xyz@aws.connect.psdb.cloud/ironclad?sslaccept=strict
```

### 2.2 Schema migrations workflow (PlanetScale)

PlanetScale uses a branch-based workflow instead of raw ALTER TABLE:

```bash
# Create a new branch for your schema change
pscale branch create ironclad add-product-tags

# Connect and modify
pscale connect ironclad add-product-tags --port 3309
mysql -h 127.0.0.1 -P 3309 -u root < db/migrations/20241201_add_tags.sql

# Create a deploy request (like a PR for your schema)
pscale deploy-request create ironclad add-product-tags

# Review and merge in PlanetScale dashboard (zero downtime!)
```

---

## Part 3 — Frontend → Vercel

### 3.1 One-time Vercel project setup

```bash
cd frontend

# Install Vercel CLI if not already
npm i -g vercel

# Link project (follow prompts — create new project)
vercel link

# This creates .vercel/project.json — commit it
```

### 3.2 Set environment variables in Vercel

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://api.yourbackend.onrender.com` | Production |
| `VITE_CHECKOUT_URL` | `https://checkout.yourbackend.onrender.com` | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Preview |
| `VITE_YOUTUBE_API_KEY` | `AIzaSy...` | All |

> **Note:** `VITE_` prefix is required for Vite to expose variables to the browser bundle. Never put secret keys with `VITE_` prefix.

### 3.3 Configure vercel.json

The `vercel.json` file in the project root handles:
- SPA routing (all paths → `index.html`)
- Security headers (CSP, HSTS, etc.)
- Asset caching (1 year for hashed assets)

This file is already configured — just deploy.

### 3.4 Deploy

```bash
# Deploy to production
vercel --prod

# Or trigger via git push (auto-deploy on main branch)
git push origin main
```

**Custom domain:**
```bash
vercel domains add ironclad-parts.com
# Follow DNS instructions — typically CNAME to cname.vercel-dns.com
```

### 3.5 Preview deployments

Every pull request automatically gets a preview URL:
```
https://ironclad-git-feature-xyz-yourorg.vercel.app
```

---

## Part 4 — Backend → Render

### 4.1 Create Render account and connect GitHub

1. Go to https://render.com → Sign up with GitHub
2. Authorize Render to access your repository

### 4.2 Deploy API service

1. **New → Web Service**
2. Connect `yourorg/ironclad` repository
3. Configure:

```
Name:             ironclad-api
Region:           Oregon (US West)
Branch:           main
Runtime:          Docker
Dockerfile path:  ./docker/Dockerfile.api
Docker context:   ./api
Plan:             Starter ($7/mo) or Standard ($25/mo)
```

4. **Environment variables** (Add these in the Render dashboard):

```
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://... (from PlanetScale)
REDIS_URL=redis://... (from Render Redis or Upstash)
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate separately>
FRONTEND_URL=https://ironclad.vercel.app
LOG_LEVEL=info
```

5. **Health Check Path:** `/api/v1/health`
6. Click **Create Web Service**

### 4.3 Deploy Checkout service

Repeat the above with:
```
Name:             ironclad-checkout
Dockerfile path:  ./docker/Dockerfile.checkout
Docker context:   ./checkout-service
Port:             4002
```

Additional environment variables:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  (add after step 4.5)
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=production
FRONTEND_ORIGIN=https://ironclad.vercel.app
```

### 4.4 Create Redis on Render

1. **New → Redis**
2. Name: `ironclad-redis`, Plan: Starter
3. Copy the **Internal Redis URL** → paste as `REDIS_URL` in both services

### 4.5 Configure Stripe webhooks

```bash
# 1. Get your Render checkout service URL
# e.g. https://ironclad-checkout.onrender.com

# 2. Stripe Dashboard → Developers → Webhooks → Add endpoint
# Endpoint URL: https://ironclad-checkout.onrender.com/api/payment/webhook
# Events to listen:
#   payment_intent.succeeded
#   payment_intent.payment_failed
#   charge.dispute.created

# 3. Copy the Signing secret (whsec_...)
# 4. Add as STRIPE_WEBHOOK_SECRET in Render dashboard
```

### 4.6 Custom domains on Render

```
In Render dashboard → Service → Settings → Custom Domains
Add: api.ironclad-parts.com
Add CNAME record in your DNS: api → your-service.onrender.com
```

---

## Part 5 — VPS Deployment (Alternative to Render)

Use this if you want more control or lower costs at scale.

### 5.1 Provision a server

Recommended: DigitalOcean Droplet, Hetzner CX21, or Linode.
- **Minimum:** 2 vCPU, 2 GB RAM, 40 GB SSD (Ubuntu 22.04 LTS)
- **Recommended:** 4 vCPU, 4 GB RAM for production

### 5.2 Initial server setup

```bash
# Run as root on the fresh server
curl -fsSL https://raw.githubusercontent.com/yourorg/ironclad/main/scripts/setup-vps.sh | bash
```

This installs Docker, nginx, fail2ban, configures UFW, and creates the app user.

### 5.3 Deploy application

```bash
# SSH to server
ssh ubuntu@YOUR_SERVER_IP

# Switch to app user
sudo -u ironclad bash
cd /opt/ironclad

# Copy your .env file (from local machine)
# scp .env ubuntu@YOUR_SERVER_IP:/opt/ironclad/.env

# Start services (infra only first)
docker compose up -d mysql redis
sleep 30   # Wait for MySQL to initialize

# Run migrations
docker compose run --rm api node scripts/migrate.js
docker compose run --rm api node scripts/migrate.js --seed

# Start application services
docker compose up -d api checkout
```

### 5.4 SSL certificate with Let's Encrypt

```bash
# On the VPS as root:
certbot --nginx -d api.ironclad-parts.com -d checkout.ironclad-parts.com \
    --non-interactive --agree-tos --email your@email.com

# Auto-renewal is configured automatically by certbot
# Test renewal:
certbot renew --dry-run
```

### 5.5 nginx reverse proxy config

```nginx
# /etc/nginx/sites-available/ironclad
# (certbot will add SSL blocks automatically)

server {
    server_name api.ironclad-parts.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name checkout.ironclad-parts.com;

    location / {
        proxy_pass http://127.0.0.1:4002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/ironclad /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Part 6 — CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs automatically on every push to `main`.

### 6.1 Required GitHub Secrets

Go to **GitHub Repo → Settings → Secrets and variables → Actions** and add:

```
# Vercel
VERCEL_TOKEN              (from vercel.com/account/tokens)
VERCEL_ORG_ID             (from .vercel/project.json after vercel link)
VERCEL_PROJECT_ID         (from .vercel/project.json)

# Render
RENDER_API_KEY            (from render.com/account → API Keys)
RENDER_API_SERVICE_ID     (from Render service URL: srv-xxx)
RENDER_CHECKOUT_SERVICE_ID

# Docker Hub (for image registry)
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN           (from hub.docker.com → Account Settings → Security)

# Database
PRODUCTION_DATABASE_URL   (for running migrations in CI)
```

### 6.2 Pipeline stages

```
Push to main
  │
  ├── test          (always runs)
  │     ├── API unit + integration tests
  │     ├── Checkout service tests
  │     └── Frontend lint + type-check
  │
  ├── security      (main branch only)
  │     └── npm audit on all packages
  │
  ├── docker-build  (main branch only, after test passes)
  │     ├── Build & push ironclad-api:sha-abc123
  │     └── Build & push ironclad-checkout:sha-abc123
  │
  ├── deploy-frontend  (parallel with docker-build)
  │     └── vercel deploy --prod
  │
  ├── deploy-backend   (after docker-build)
  │     ├── Trigger Render API deploy
  │     ├── Trigger Render Checkout deploy
  │     └── Smoke test both services
  │
  └── migrate          (after deploy-backend)
        └── node scripts/migrate.js
```

---

## Part 7 — Environment Variables Quick Reference

### Frontend (Vite / Vercel)
```bash
VITE_API_URL=https://api.ironclad-parts.com
VITE_CHECKOUT_URL=https://checkout.ironclad-parts.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_YOUTUBE_API_KEY=AIzaSy...
```

### API Service
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://user:pass@host/ironclad_db?ssl=...
REDIS_URL=redis://:password@host:6379
JWT_SECRET=<64-byte hex>
JWT_REFRESH_SECRET=<64-byte hex, different from above>
FRONTEND_URL=https://ironclad.vercel.app
LOG_LEVEL=info
```

### Checkout Service
```bash
NODE_ENV=production
PORT=4002
DATABASE_URL=mysql://...  (same DB, different service)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=production
FRONTEND_ORIGIN=https://ironclad.vercel.app
```

---

## Part 8 — Security Checklist

Before going live, verify each item:

```
✓ All secrets in environment variables — none hardcoded in source
✓ .env in .gitignore (and always has been — check git log)
✓ JWT secrets are 64+ bytes of cryptographic randomness
✓ HTTPS enforced on all services (Vercel, Render, certbot)
✓ CORS configured to only allow your frontend domain
✓ Rate limiting active on all API endpoints
✓ Stripe webhook signature verification enabled
✓ MySQL user has minimal permissions (no SUPER, no DROP DATABASE)
✓ Redis requires password authentication
✓ Docker containers run as non-root users
✓ Security headers set (CSP, HSTS, X-Frame-Options)
✓ npm audit clean (or known false positives documented)
✓ Sensitive routes require authentication (admin endpoints)
```

---

## Part 9 — Monitoring & Maintenance

### Health check endpoints

```bash
# API
GET /api/v1/health
# → {"success":true,"service":"ironclad-api","uptime":3600,"db":"connected","redis":"connected"}

# Checkout
GET /api/v1/health
# → {"success":true,"service":"ironclad-checkout","uptime":3600}
```

### Useful operational commands

```bash
# View live logs
docker compose logs -f api
docker compose logs -f checkout --tail=100

# Check service status
docker compose ps

# Restart a service (no downtime with rolling restart)
docker compose up -d --no-deps api

# Database backup
docker compose exec mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" ironclad_db \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Check disk usage
docker system df
docker image prune -f --filter "until=48h"
```

### Setting up automatic database backups

```bash
# Add to crontab: daily backup at 2am
crontab -e
# Add:
0 2 * * * docker compose -f /opt/ironclad/docker-compose.yml exec -T mysql \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" ironclad_db \
  | gzip > /opt/ironclad/backups/db_$(date +\%Y\%m\%d).sql.gz \
  && find /opt/ironclad/backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Quick-start summary

```bash
# 1. Local dev
cp .env.example .env          # Fill in values
docker compose --profile local up

# 2. Database
pscale database create ironclad --region us-east

# 3. Frontend
cd frontend && vercel --prod

# 4. Backend
# → Create Web Services on render.com pointing to Dockerfile.api / Dockerfile.checkout

# 5. CI/CD
# → Add secrets to GitHub → push to main → pipeline deploys automatically
```
