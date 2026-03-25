#!/usr/bin/env bash
# scripts/setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-time VPS setup for Ubuntu 22.04 LTS
# Run once as root on a fresh server:  bash setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_USER="ironclad"
DEPLOY_DIR="/opt/ironclad"

log() { echo -e "\n\033[1;34m▶  $*\033[0m"; }
ok()  { echo -e "\033[1;32m✓  $*\033[0m"; }

# ── 1. System updates ─────────────────────────────────────────────────────
log "System updates"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git htop ufw fail2ban \
    ca-certificates gnupg lsb-release \
    unzip jq
ok "System updated"

# ── 2. Create app user ────────────────────────────────────────────────────
log "Creating app user: $APP_USER"
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"
usermod -aG sudo "$APP_USER"
mkdir -p /home/"$APP_USER"/.ssh
cp ~/.ssh/authorized_keys /home/"$APP_USER"/.ssh/authorized_keys 2>/dev/null || true
chown -R "$APP_USER":"$APP_USER" /home/"$APP_USER"/.ssh
chmod 700 /home/"$APP_USER"/.ssh
chmod 600 /home/"$APP_USER"/.ssh/authorized_keys 2>/dev/null || true
ok "User created"

# ── 3. Firewall ───────────────────────────────────────────────────────────
log "Configuring UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP"
ufw allow 443/tcp  comment "HTTPS"
ufw allow 4000/tcp comment "API (temporary — restrict after nginx setup)"
ufw allow 4002/tcp comment "Checkout (temporary)"
ufw --force enable
ok "Firewall configured"

# ── 4. Fail2ban ───────────────────────────────────────────────────────────
log "Configuring fail2ban"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
EOF
systemctl enable fail2ban && systemctl restart fail2ban
ok "Fail2ban active"

# ── 5. Docker ─────────────────────────────────────────────────────────────
log "Installing Docker Engine"
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
usermod -aG docker "$APP_USER"
systemctl enable docker
ok "Docker installed"

# ── 6. nginx (reverse proxy + SSL) ───────────────────────────────────────
log "Installing nginx + certbot"
apt-get install -y -qq nginx certbot python3-certbot-nginx
systemctl enable nginx
ok "nginx installed"

# ── 7. Deploy directory ───────────────────────────────────────────────────
log "Creating deploy directory"
mkdir -p "$DEPLOY_DIR"
chown -R "$APP_USER":"$APP_USER" "$DEPLOY_DIR"
ok "Deploy dir: $DEPLOY_DIR"

# ── 8. Swap (prevents OOM on small instances) ─────────────────────────────
log "Configuring 2GB swap"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
ok "Swap configured"

# ── 9. Log rotation ───────────────────────────────────────────────────────
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF
ok "Log rotation configured"

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓  VPS setup complete                                 "
echo "                                                       "
echo " Next steps:                                           "
echo "   1. sudo -u $APP_USER bash                          "
echo "   2. cd $DEPLOY_DIR                                  "
echo "   3. Copy your .env file                             "
echo "   4. docker compose up -d                            "
echo "   5. certbot --nginx -d yourdomain.com               "
echo "═══════════════════════════════════════════════════════"
