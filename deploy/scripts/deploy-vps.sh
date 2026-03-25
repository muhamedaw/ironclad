#!/usr/bin/env bash
# scripts/deploy-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
# Zero-downtime deployment to a VPS (Ubuntu 22.04 + Docker)
#
# Usage (from CI or locally):
#   ./scripts/deploy-vps.sh [--migrate] [--seed]
#
# Required env vars:
#   DEPLOY_HOST        VPS IP or hostname
#   DEPLOY_USER        SSH user (default: ubuntu)
#   DEPLOY_KEY_PATH    Path to SSH private key
#   DEPLOY_DIR         Remote directory (default: /opt/ironclad)
#   DOCKER_IMAGE_API      Full image tag for API
#   DOCKER_IMAGE_CHECKOUT Full image tag for Checkout
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST must be set}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_KEY="${DEPLOY_KEY_PATH:-~/.ssh/id_rsa}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/ironclad}"
REMOTE="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST"
DO_MIGRATE="${1:-}"

log()  { echo "▶  $*"; }
ok()   { echo "✓  $*"; }
err()  { echo "✗  $*" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────
log "Pre-flight checks…"
ssh -i "$DEPLOY_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    "$DEPLOY_USER@$DEPLOY_HOST" "echo 'SSH OK'" || err "Cannot connect to $DEPLOY_HOST"
ok "SSH connection OK"

# ── Copy fresh compose + config ────────────────────────────────────────────
log "Syncing deployment files to $DEPLOY_HOST:$DEPLOY_DIR…"
rsync -az --delete \
    -e "ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no" \
    ./docker-compose.yml \
    ./.env \
    ./docker/ \
    "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_DIR/"
ok "Files synced"

# ── Pull latest images ─────────────────────────────────────────────────────
log "Pulling latest Docker images…"
$REMOTE bash -c "
  cd $DEPLOY_DIR
  docker compose pull api checkout
"
ok "Images pulled"

# ── Rolling restart — zero downtime ───────────────────────────────────────
# Strategy: start new containers, wait for health, then stop old ones
log "Rolling update: API service…"
$REMOTE bash -c "
  cd $DEPLOY_DIR
  docker compose up -d --no-deps --scale api=2 api
  sleep 15   # Wait for new container to be healthy

  # Check health of new instance
  NEW_ID=\$(docker compose ps -q api | head -1)
  STATUS=\$(docker inspect --format '{{.State.Health.Status}}' \$NEW_ID 2>/dev/null || echo 'none')
  if [ \"\$STATUS\" != 'healthy' ] && [ \"\$STATUS\" != 'none' ]; then
    echo 'New API container not healthy — aborting rollback'
    docker compose up -d --no-deps --scale api=1 api
    exit 1
  fi

  docker compose up -d --no-deps --scale api=1 api
"
ok "API updated"

log "Rolling update: Checkout service…"
$REMOTE bash -c "
  cd $DEPLOY_DIR
  docker compose up -d --no-deps checkout
"
ok "Checkout updated"

# ── Run migrations (optional) ─────────────────────────────────────────────
if [[ "$DO_MIGRATE" == "--migrate" ]]; then
  log "Running database migrations…"
  $REMOTE bash -c "
    cd $DEPLOY_DIR
    docker compose run --rm api node scripts/migrate.js
  "
  ok "Migrations applied"
fi

# ── Prune old images ──────────────────────────────────────────────────────
log "Pruning dangling images…"
$REMOTE "docker image prune -f --filter 'until=24h'" 2>/dev/null || true
ok "Cleanup done"

# ── Smoke tests ───────────────────────────────────────────────────────────
log "Running smoke tests…"
sleep 5

API_STATUS=$($REMOTE "curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/v1/health")
CO_STATUS=$($REMOTE  "curl -s -o /dev/null -w '%{http_code}' http://localhost:4002/api/v1/health")

[ "$API_STATUS"  = "200" ] && ok "API health: 200" || err "API health check failed: $API_STATUS"
[ "$CO_STATUS"   = "200" ] && ok "Checkout health: 200" || err "Checkout health check failed: $CO_STATUS"

echo ""
echo "═══════════════════════════════════════════════"
echo " ✓  Deployment complete                        "
echo "    API:      http://$DEPLOY_HOST:4000         "
echo "    Checkout: http://$DEPLOY_HOST:4002         "
echo "═══════════════════════════════════════════════"
