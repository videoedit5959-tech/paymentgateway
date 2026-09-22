# PaySync MFS Gateway — Staging Deployment Guide

**Document Version:** 2.0.0  
**Phase:** Phase 7 — Staging Environment Deployment  
**Last Updated:** September 22, 2026  

---

## 1. Staging Server Requirements & Environment Isolation

| Component | Minimum Specification | Dedicated Staging Value |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 24.04 LTS |
| **Compute** | 2 vCPUs, 4 GB RAM | 2 vCPUs, 4 GB RAM |
| **Docker Engine** | Docker Engine 24.0+ & Docker Compose v2 | Docker 26.x + Compose v2.27 |
| **Database** | MongoDB 6.0+ (Isolated Staging Database) | `paysync_staging` (Separate DB instance/URI) |
| **Base Domain** | Staging Domain / Subdomain | `staging.paysync.io` |

---

## 2. Step-by-Step Staging Deployment Instructions

### Step 1: Install Docker & Dependencies
Log into your staging server and install Docker Engine & Compose:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release git nginx certbot python3-certbot-nginx

# Install Docker GPG key and repository
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

### Step 2: Clone Codebase & Configure Staging Environment Variables
```bash
cd /var/www
sudo git clone https://github.com/paysync/paysync-gateway.git staging-paysync
cd staging-paysync

# Copy staging environment template
cp .env.staging.example .env.staging
nano .env.staging
```

Ensure `.env.staging` contains isolated staging configuration:
```env
NODE_ENV=staging
PORT=3000
MONGODB_URI=mongodb://mongo-staging:27017/paysync_staging
JWT_ACCESS_SECRET=staging_jwt_access_secret_sample_key_min_32_chars_long
JWT_REFRESH_SECRET=staging_jwt_refresh_secret_sample_key_min_32_chars_long
ENCRYPTION_KEY=staging_aes256_encryption_key_32bytes_sample
WEBHOOK_SIGNING_SECRET=staging_webhook_hmac_secret_sample_key_32chars
DEVICE_AUTH_SECRET=staging_device_pairing_and_auth_secret_sample
APP_URL=https://staging.paysync.io
API_URL=https://staging.paysync.io/api
CHECKOUT_URL=https://staging.paysync.io/checkout
CORS_ALLOWED_ORIGINS=https://staging.paysync.io
STRICT_PRODUCTION_MODE=true
ALLOW_IN_MEMORY_FALLBACK=false
```

### Step 3: Launch Staging Docker Stack
```bash
# Build and start staging containers in background
docker compose -f docker-compose.staging.yml up -d --build
```

### Step 4: Verify Container Execution & Logs
```bash
# Check container status
docker compose -f docker-compose.staging.yml ps

# View live application logs
docker compose -f docker-compose.staging.yml logs -f gateway-staging
```

### Step 5: Execute Health Probe Checks
```bash
# Test Liveness Probe
curl -i http://localhost:3000/api/health/live

# Test Database Readiness Probe
curl -i http://localhost:3000/api/health/ready
```

Both probes must return `HTTP 200 OK` with `"status": "ALIVE"` and `"status": "READY"`.

---

## 3. Operations & Maintenance Runbook

### Restarting Staging Stack
```bash
docker compose -f docker-compose.staging.yml restart
```

### Stopping Staging Stack
```bash
docker compose -f docker-compose.staging.yml down
```

### Updating Application Code
```bash
git pull origin main
docker compose -f docker-compose.staging.yml up -d --build
```

### Rollback to Previous Release
```bash
git checkout tags/v1.0.0-staging
docker compose -f docker-compose.staging.yml up -d --build
```

---

## 4. Android Collector Staging Setup
1. Build Staging APK with `API_BASE_URL="https://staging.paysync.io/api"`.
2. Install APK on staging Android device.
3. Generate QR pairing token in Merchant Portal at `https://staging.paysync.io/merchant`.
4. Scan QR token with Android Collector to pair staging device.
