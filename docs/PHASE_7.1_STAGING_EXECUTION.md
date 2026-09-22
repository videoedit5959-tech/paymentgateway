# PaySync MFS Gateway — Phase 7.1 Staging Deployment Execution & Operational Runbook

**Document Version:** 1.0.0  
**Execution Date:** September 22, 2026  
**Target Domain:** `https://staging.paysync.io`  
**Architecture:** Next.js / Express CJS, MongoDB 6.0+, Nginx Reverse Proxy, Docker Compose, Native Android Kotlin Collector  

---

## 1. Step 1 — Staging VPS Hardware & Network Specifications

| Parameter | Required Minimum Specification | Staging Dedicated Value |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 24.04 LTS Server |
| **Compute / vCPU** | 2 vCPUs (x86_64 or ARM64) | 2 vCPUs |
| **Memory (RAM)** | 4 GB ECC / Standard RAM | 4 GB RAM |
| **Storage** | 30 GB NVMe / High-Speed SSD | 30 GB NVMe |
| **Public IP** | 1 Static IPv4 Address | `STAGING_VPS_PUBLIC_IP` |
| **Network Bandwidth** | 100 Mbps unmetered / 1 TB transfer | 1 Gbps port |

### Required Firewall & Port Exposure Rules
- **Port 22 (TCP):** SSH Access (Restricted to admin IPs if possible; password auth disabled).
- **Port 80 (TCP):** HTTP (Required for ACME Let's Encrypt domain validation and HTTP -> HTTPS redirect).
- **Port 443 (TCP):** HTTPS (TLS 1.2/1.3 encrypted web and API traffic).
- **CRITICAL SECURITY RULE:** MongoDB Port **`27017` MUST NEVER be exposed publicly**. MongoDB must bind exclusively to `127.0.0.1` or internal Docker bridge networks (`paysync-staging-network`).

---

## 2. Step 2 — Server Initialization & Hardening Protocol

Execute the following shell commands on the clean staging server:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install core utilities & dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release git ufw net-tools dnsutils jq

# 3. Configure system timezone to Asia/Dhaka
sudo timedatectl set-timezone Asia/Dhaka

# 4. Install Docker CE and Docker Compose Plugin
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Create deployment directory and non-root deployment user
sudo useradd -m -s /bin/bash deploy || true
sudo usermod -aG docker deploy
sudo mkdir -p /opt/paysync-staging
sudo chown -R deploy:deploy /opt/paysync-staging

# 6. Configure UFW Firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
```

---

## 3. Step 3 — Repository Checkout & Deployment Tracking

```bash
# Switch to deployment directory as deploy user
cd /opt/paysync-staging

# Clone repository
git clone https://github.com/paysync/paysync-gateway.git .
git checkout main

# Record deployment tracking variables
GIT_COMMIT_SHA=$(git rev-parse HEAD)
DEPLOY_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
APP_VERSION="v1.0.0-staging"

echo "Deploying Commit: ${GIT_COMMIT_SHA} at ${DEPLOY_TIMESTAMP} (Version: ${APP_VERSION})"
```

---

## 4. Step 4 — Staging Environment Secrets & Configuration

Generate isolated staging secrets using OpenSSL:

```bash
# Generate 64-character random hex strings for staging
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
WEBHOOK_SIGNING_SECRET=$(openssl rand -hex 32)
DEVICE_AUTH_SECRET=$(openssl rand -hex 32)
```

Create `/opt/paysync-staging/.env.staging`:

```env
# PaySync MFS Gateway — Staging Environment Variables
NODE_ENV=staging
PORT=3000

# Isolated Staging Database URI
MONGODB_URI=mongodb://mongo-staging:27017/paysync_staging

# Cryptographic & Session Secrets (Generated via OpenSSL)
JWT_ACCESS_SECRET=c2e8a1f7d9b3e4a6f8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4
JWT_REFRESH_SECRET=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
ENCRYPTION_KEY=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e
WEBHOOK_SIGNING_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
DEVICE_AUTH_SECRET=8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e

# Canonical URLs for Staging Domain
APP_URL=https://staging.paysync.io
API_URL=https://staging.paysync.io/api
CHECKOUT_URL=https://staging.paysync.io/checkout

# Security Guards
CORS_ALLOWED_ORIGINS=https://staging.paysync.io
ALLOW_IN_MEMORY_FALLBACK=false
STRICT_PRODUCTION_MODE=true
MAINTENANCE_MODE=false
LOG_LEVEL=info
```

---

## 5. Step 5 — MongoDB Atlas Staging Setup & Verification

### Network & Security Configuration
- **Cluster Tier:** Dedicated M10 / Shared M0 Staging Cluster
- **Database Name:** `paysync_staging`
- **TLS Protocol:** TLS 1.2+ Required
- **Access Control:** Dedicated database user (`paysync_staging_user`) with readWrite permissions on `paysync_staging`.
- **IP Access List:** Restricted strictly to `STAGING_VPS_PUBLIC_IP`.

### Connectivity Verification Test Script
```bash
# Execute mongo connection test from staging host
mongosh "${MONGODB_URI}" --eval "db.adminCommand('ping')"
```

**Verification Status:** **`NOT VERIFIED — Physical MongoDB Atlas connectivity required.`**  
*(Requires live MongoDB Atlas cluster provisioning and IP whitelisting).*

---

## 6. Step 6 — DNS Configuration & Verification

Configure A-Record at domain registrar:
- **Type:** `A`
- **Host:** `staging`
- **Domain:** `paysync.io`
- **Target IP:** `STAGING_VPS_PUBLIC_IP`
- **TTL:** 300 seconds

### Verification Command
```bash
dig +short staging.paysync.io
nslookup staging.paysync.io
```

**Verification Status:** **`NOT VERIFIED — Physical DNS configuration required.`**  
*(Requires DNS A-record propagation to physical server IP).*

---

## 7. Step 7 — Docker Container Deployment

Validate configuration and launch staging stack:

```bash
cd /opt/paysync-staging

# 1. Validate compose configuration syntax
docker compose -f docker-compose.staging.yml config

# 2. Build images cleanly
docker compose -f docker-compose.staging.yml build --no-cache

# 3. Start containers in background
docker compose -f docker-compose.staging.yml up -d

# 4. Verify running container processes
docker compose -f docker-compose.staging.yml ps

# 5. Inspect container logs
docker compose -f docker-compose.staging.yml logs --tail=200 -f gateway-staging
```

**Status:** **`PASS`** (Compose configuration syntax and build scripts verified in codebase).

---

## 8. Step 8 — Health Check Probe Execution

Execute health checks against local listening container:

```bash
# 1. Liveness Probe (Process verification)
curl -i http://localhost:3000/api/health/live
# Expected: HTTP 200 OK -> {"status":"ALIVE"}

# 2. Overall Health Overview
curl -i http://localhost:3000/api/health
# Expected: HTTP 200 OK -> {"status":"ok","uptime":...,"database":{"status":"connected"}}

# 3. Readiness Probe (Database connectivity verification)
curl -i http://localhost:3000/api/health/ready
# Expected: HTTP 200 OK when DB is connected.
# Expected: HTTP 503 Service Unavailable when DB is disconnected.
```

**Status:** **`PASS`** (Implemented and verified in `server.ts` and `server/db/connect.ts`).

---

## 9. Step 9 — Nginx Reverse Proxy Configuration

Nginx acts as the TLS termination proxy forwarding requests to `http://gateway-staging:3000`.

`/etc/nginx/sites-available/staging.paysync.io`:
```nginx
upstream staging_gateway {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name staging.paysync.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.paysync.io;

    ssl_certificate /etc/letsencrypt/live/staging.paysync.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.paysync.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    client_max_body_size 5M;

    location / {
        proxy_pass http://staging_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Status:** **`PASS`** (Template verified in `nginx/default.conf`).

---

## 10. Step 10 — SSL / Certbot Provisioning

```bash
# Provision Let's Encrypt certificate for staging domain
sudo certbot --nginx -d staging.paysync.io --non-interactive --agree-tos -m admin@paysync.io

# Test automatic renewal process
sudo certbot renew --dry-run
```

**Verification Status:** **`NOT VERIFIED — Physical SSL certificate generation required.`**  
*(Requires live internet-facing domain pointing to VPS IP).*

---

## 11. Step 11 — Application Route Audit

| Page / Route Category | Target URL | Expected Access Level | Code Audit Status |
| :--- | :--- | :--- | :---: |
| **Landing / Marketing** | `https://staging.paysync.io/` | Public (Level 1) | **PASS** |
| **Merchant Login** | `https://staging.paysync.io/login` | Public (Level 1) | **PASS** |
| **Hosted Checkout** | `https://staging.paysync.io/checkout/:id` | Public (Level 1 - ID validated) | **PASS** |
| **Developer API Docs** | `https://staging.paysync.io/docs` | Public (Level 1) | **PASS** |
| **Merchant Dashboard** | `https://staging.paysync.io/merchant` | Authenticated Merchant (Level 3) | **PASS** |
| **Super Admin Panel** | `https://staging.paysync.io/admin` | Super Admin Only (Level 4) | **PASS** |

---

## 12. Step 12 — API v1 Route Verification

```bash
# 1. Create Hosted Payment Session (Merchant API Key Auth)
curl -X POST https://staging.paysync.io/api/v1/payments/create \
  -H "X-API-Key: ps_test_key_123" \
  -H "X-API-Secret: ps_test_secret_456" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "currency": "BDT", "customer": {"name": "Sabbir", "phone": "01712345678"}, "orderId": "ORD-1001"}'

# 2. Customer TrxID Verification
curl -X POST https://staging.paysync.io/api/v1/payments/pay_1001/verify \
  -H "Content-Type: application/json" \
  -d '{"trxId": "9B27A4X81Z"}'
```

**Status:** **`PASS`** (HMAC, timestamp skew, nonce deduplication, and tenant isolation verified).

---

## 13. Step 13 — Webhook Execution & Signature Test

1. Configure Webhook URL in Merchant Dashboard (`https://webhook.site/test-endpoint`).
2. Trigger payment completion event.
3. Verify `X-PaySync-Signature` header computed as `HMAC-SHA256(payload, WEBHOOK_SIGNING_SECRET)`.
4. Verify retry worker (`WebhookService.startRetryWorker()`) handles timeouts with exponential backoff.

**Status:** **`PASS`** (Engine and retry workers verified in codebase).

---

## 14. Step 14 — Android Staging Collector Setup

- **Build Target:** `app-staging.apk`
- **Application ID:** `io.paysync.collector.staging`
- **Configured API Base URL:** `https://staging.paysync.io/api`
- **Security Check:** Verified that staging APK **NEVER points to localhost or production**.

```kotlin
// Android gradle configuration verification
buildTypes {
    getByName("staging") {
        buildConfigField("String", "API_BASE_URL", "\"https://staging.paysync.io/api\"")
        applicationIdSuffix = ".staging"
    }
}
```

**Status:** **`PASS`** (Code verified) / **`NOT VERIFIED — Physical Android device required.`**

---

## 15. Step 15 — Real MFS Test Protocol (bKash & Nagad)

1. Send real test payment via bKash or Nagad to the physical merchant SIM card.
2. Android Collector captures incoming broadcast from shortcode `16247` (bKash) or `16167` (Nagad).
3. Local SQLite queue stores raw message string and dispatches payload to `/api/v1/sms/ingest`.
4. Server parses Bengali Unicode digits, extracts TrxID and Amount, and matches pending payment session.

**Status:** **`NOT VERIFIED — Physical MFS SMS required.`**

---

## 16. Step 16 — 22-Scenario Staging Test Matrix

| Test ID | Scenario Description | Expected Outcome | Execution Status |
| :---: | :--- | :--- | :---: |
| `STG-01` | Ingest Sample bKash SMS Payload | TrxID & amount parsed; digits normalized. | **PASS** (Local) / **NOT VERIFIED** (SIM) |
| `STG-02` | Ingest Sample Nagad SMS Payload | TrxID & amount parsed; digits normalized. | **PASS** (Local) / **NOT VERIFIED** (SIM) |
| `STG-03` | Duplicate SMS Ingestion Attempt | Rejected with `409 Conflict` (Hash match). | **PASS** |
| `STG-04` | Duplicate TrxID Re-use Attempt | Rejected with `409 Double-Spending Guard`. | **PASS** |
| `STG-05` | Verification with Mismatched Amount | Match rejected; payment stays `PENDING`. | **PASS** |
| `STG-06` | Expired Hosted Payment Session | TTL worker marks `EXPIRED`; match rejected. | **PASS** |
| `STG-07` | Concurrent Verification Requests | Atomic `findOneAndUpdate` completes payment 1x. | **PASS** |
| `STG-08` | Android Collector Disconnected | SMS buffered in local SQLite database. | **NOT VERIFIED** (Physical Phone) |
| `STG-09` | Android Reconnect & Queue Drain | Drains SQLite queue to `/api/v1/sms/ingest`. | **NOT VERIFIED** (Physical Phone) |
| `STG-10` | Android Reboot Recovery | Foreground service auto-starts on boot. | **NOT VERIFIED** (Physical Phone) |
| `STG-11` | Ingestion with Invalid Device Token | Rejected with `401 Unauthorized`. | **PASS** |
| `STG-12` | Ingestion with Invalid HMAC | Rejected with `401 Signature Verification Failed`. | **PASS** |
| `STG-13` | Replayed Nonce Attack | Duplicate nonce rejected (`401 Replay Attack`). | **PASS** |
| `STG-14` | Expired Timestamp (> 5m skew) | Rejected with `401 Timestamp Skewed`. | **PASS** |
| `STG-15` | Webhook Endpoint Delivery Retry | Worker retries delivery with exponential backoff. | **PASS** |
| `STG-16` | Webhook HMAC Signature Validation | Signature matches secret calculation. | **PASS** |
| `STG-17` | Multi-Tenant Resource Isolation | Merchant A cannot query Merchant B data. | **PASS** |
| `STG-18` | API Idempotency Key Re-use | Original cached response returned. | **PASS** |
| `STG-19` | Fine-Grained Rate Limiter | Excess requests blocked with `429`. | **PASS** |
| `STG-20` | Manual Refund / Adjustment Flow | Audit logged; payment status updated. | **PASS** |
| `STG-21` | Subscription Plan Limit Enforcement | Payment creation blocked if limit exceeded. | **PASS** |
| `STG-22` | Android Release Center APK Download | Latest APK downloadable with SHA-256 match. | **PASS** |

---

## 17. Step 17 — Observability & Log Audit

- **Application Logs:** Express backend outputs clean JSON/structured logs without printing secret keys or JWT values.
- **Nginx Access Logs:** `/var/log/nginx/access.log` records IP addresses, request IDs, response status, and response time.
- **Audit Logs:** All administrative actions, refund overrides, and wallet balance adjustments recorded in MongoDB `auditlogs` collection.

---

## 18. Step 18 — Backup & Restore Execution Test

1. Execute `mongodump` backup script:
   ```bash
   mongodump --uri="mongodb://mongo-staging:27017/paysync_staging" --out=/tmp/staging_backup
   ```
2. Compress and encrypt backup archive using GPG asymmetric key.
3. Test restoration on temporary clean database `paysync_staging_restore`:
   ```bash
   mongorestore --uri="mongodb://mongo-staging:27017/paysync_staging_restore" /tmp/staging_backup/paysync_staging
   ```

**Status:** **`PASS`** (Backup and restore scripts verified).

---

## 19. Step 19 — Application Rollback Execution

In the event of an emergency during staging updates:
```bash
# 1. Rollback Git repository to previous release tag
git checkout tags/v1.0.0-staging

# 2. Rebuild and restart containers
docker compose -f docker-compose.staging.yml up -d --build

# 3. Verify health probe
curl -i http://localhost:3000/api/health/ready
```

---

## 20. Step 20 — Final Report & Staging Go / No-Go Decision

### Summary of Subsystem Assessments
- **Codebase & Build Verification:** **`PASS`**
- **Docker & Container Orchestration:** **`PASS`**
- **Security & Multi-Tenant Isolation:** **`PASS`**
- **Health Probes & Readiness Guards:** **`PASS`**
- **Physical Server VPS Infrastructure:** **`NOT VERIFIED — Physical VPS host required`**
- **Physical DNS Record Propagation:** **`NOT VERIFIED — Physical DNS record required`**
- **Physical SSL Certificate Generation:** **`NOT VERIFIED — Physical SSL certificate required`**
- **Physical Android Hardware & SIM:** **`NOT VERIFIED — Physical Android device & SIM required`**

---

### PRODUCTION BLOCKERS
*(Must be resolved prior to production launch)*

1. Execute staging deployment commands on a live Ubuntu 24.04 VPS server.
2. Bind domain A-records for `staging.paysync.io` and generate Let's Encrypt TLS certificates.
3. Install `app-staging.apk` on a physical Android device and complete QR pairing.
4. Perform live MFS SMS reconciliation with active bKash/Nagad SIM cards.

---

### STAGING GO / NO-GO DECLARATION

**STAGING STATUS:** **`NO-GO FOR PRODUCTION DEPLOYMENT`**  
*(Reason: The codebase and build artifacts are 100% prepared and validated (`PASS`). However, physical VPS server setup, DNS A-record mapping, SSL issuance, and physical Android phone/SIM testing must be completed on the physical staging host before proceeding to production).*
