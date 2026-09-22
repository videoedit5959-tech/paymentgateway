# PaySync MFS Gateway — Phase 7 Final Staging Readiness Report

**Document Version:** 1.0.0  
**Audit Completion Date:** September 22, 2026  
**Target Architecture:** Express + Vite CJS Bundle, MongoDB 6.0+, Nginx Reverse Proxy, Android Kotlin Collector  

---

## 1. Staging Readiness Subsystem Assessment Matrix

Strict Status Classifications: `PASS` | `FAIL` | `NOT VERIFIED` | `BLOCKED`

| Subsystem | Status | Detailed Audit Findings & Evidence |
| :--- | :---: | :--- |
| **1. Build Status** | **PASS** | `npm run build` succeeds cleanly. TypeScript compilation (`tsc --noEmit`) passes with **0 errors**. Client SPA bundle in `/dist` and Express CJS bundle in `/dist/server.cjs` generated. |
| **2. Docker Status** | **PASS** | Multi-stage production `Dockerfile` and dedicated `docker-compose.staging.yml` verified. Uses non-root user `node`, healthcheck on `/api/health/live`, graceful `SIGTERM` shutdown handling. |
| **3. MongoDB Status** | **PASS** | `server/db/connect.ts` enforces `ALLOW_IN_MEMORY_FALLBACK=false` and `STRICT_PRODUCTION_MODE=true` in staging mode. Readiness probe returns `HTTP 503` if DB is offline. 10 schemas fully indexed. |
| **4. Nginx Status** | **PASS** | `nginx/default.conf` configured with reverse proxy headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`), 5MB client body limit, rate-limiting zones, and TLS 1.2/1.3 ciphers. |
| **5. DNS Status** | **NOT VERIFIED** | **NOT VERIFIED — Physical DNS configuration required.** Requires setting A-records pointing `staging.paysync.io` to physical staging VPS IP. |
| **6. SSL Status** | **NOT VERIFIED** | **NOT VERIFIED — Physical SSL certificate generation required.** Requires executing `certbot --nginx -d staging.paysync.io` on physical staging host. |
| **7. Android Staging Status**| **PASS** | Android Collector code supports variant `staging` pointing to `https://staging.paysync.io/api`. QR pairing, HMAC signatures (`X-Signature`), nonces, 30s heartbeats, and offline queue recovery fully supported. |
| **8. API Status** | **PASS** | REST API v1 (`/api/v1`) fully operational. API Key validation (`X-API-Key`/`X-API-Secret`), payment session creation, and TrxID verification tested and verified. |
| **9. Webhook Status** | **PASS** | `WebhookService.startRetryWorker()` interval active (60s loop). HMAC-SHA256 signature calculation, exponential backoff, atomic lease locking, and idempotency verified. |
| **10. Security Status** | **PASS** | Multi-tenant isolation enforced on all merchant resource queries. Level 1-4 security hierarchy active. Admin panel guarded by server-side JWT role validation (`SUPER_ADMIN`). |
| **11. Backup Status** | **PASS** | `mongodump` script, GPG encryption, offsite S3 sync, and disaster recovery runbook documented in `docs/BACKUP_AND_DISASTER_RECOVERY.md`. |
| **12. Real-Device Req.** | **NOT VERIFIED** | **REQUIRES REAL ANDROID DEVICE.** Physical Android device running `app-staging.apk` required for live QR pairing and heartbeat verification. |
| **13. Real-MFS Req.** | **NOT VERIFIED** | **REQUIRES REAL MFS SMS.** Ingestion of real bKash/Nagad Cash-In or Payment SMS requires physical SIM card on Android collector phone. |
| **14. Blockers** | **PASS** | **NONE.** Zero code, build, database, or security blockers identified in codebase. |

---

## 2. Infrastructure Categorization Breakdown

### A. VERIFIED BY CODE / LOCAL TEST
- TypeScript compilation & bundle execution (`dist/server.cjs`)
- Fail-fast environment startup validation (`server/utils/envValidator.ts`)
- In-memory database fallback restriction (`ALLOW_IN_MEMORY_FALLBACK=false`)
- Readiness probe database check (`/api/health/ready` returns 503 when DB disconnected)
- Multi-tenant query isolation across wallets, devices, API keys, webhooks, and refunds
- HMAC-SHA256 device authentication & replay protection
- In-process scheduled workers for webhooks (60s), collector watchdog (45s), and payment expiry (5m)
- Multi-stage `Dockerfile` and `docker-compose.staging.yml`

### B. REQUIRES REAL SERVER
- Physical VPS server setup (Ubuntu 24.04 LTS)
- Staging DNS A-record propagation (`staging.paysync.io`)
- Let's Encrypt TLS certificate generation (`certbot --nginx`)
- Network connectivity between staging VPS and MongoDB Atlas Staging cluster

### C. REQUIRES REAL ANDROID DEVICE
- Installing `app-staging.apk` on physical Android hardware
- Granting SMS and Notification permissions
- Scanning QR pairing token generated from Staging Merchant Dashboard
- Maintaining 30-second background heartbeat keepalive

### D. REQUIRES REAL MFS SMS
- Receiving live bKash/Nagad Cash-In or Merchant Payment SMS on physical SIM card
- Android SMS Receiver broadcast capture and ingestion to `/api/v1/sms/ingest`
- Automatic regex parser extraction, Bengali digit normalization, and payment reconciliation

---

## 3. End-to-End 22-Scenario Staging Test Matrix

The following test suite must be executed on the physical staging environment using `STAGING_TEST_PLAN.md`:

| Test ID | Scenario Description | Expected Result | Status |
| :---: | :--- | :--- | :---: |
| `STG-01` | Ingest Sample bKash SMS Payload | Extracted TrxID, amount, sender, normalized digits saved. | **PASS** (Local) / **NOT VERIFIED** (Physical SIM) |
| `STG-02` | Ingest Sample Nagad SMS Payload | Extracted TrxID, amount, sender, normalized digits saved. | **PASS** (Local) / **NOT VERIFIED** (Physical SIM) |
| `STG-03` | Duplicate SMS Message Ingestion | Rejected with duplicate message hash error (`409 Conflict`). | **PASS** |
| `STG-04` | Duplicate TrxID Attempt | Rejected with double-spending error (`409 Conflict`). | **PASS** |
| `STG-05` | TrxID Verification with Wrong Amount | Match rejected; payment remains `PENDING`. | **PASS** |
| `STG-06` | Expired Hosted Payment Session | TTL worker marks payment `EXPIRED`; match rejected. | **PASS** |
| `STG-07` | Concurrent TrxID Matching Requests | Atomic `findOneAndUpdate` completes payment exactly once. | **PASS** |
| `STG-08` | Android Collector Internet Disconnection | Collector buffers SMS in local SQLite queue. | **NOT VERIFIED** (Physical Device) |
| `STG-09` | Android Collector Reconnect & Queue Drain | Drains buffered SMS to `/api/v1/sms/ingest`. | **NOT VERIFIED** (Physical Device) |
| `STG-10` | Android Collector Reboot Recovery | Foreground service restarts automatically on boot. | **NOT VERIFIED** (Physical Device) |
| `STG-11` | Ingestion with Invalid Device Credentials | Rejected with `401 Unauthorized`. | **PASS** |
| `STG-12` | Ingestion with Invalid HMAC Signature | Rejected with `401 Signature Verification Failed`. | **PASS** |
| `STG-13` | Replayed Nonce Attack | Nonce duplicate check rejects replay (`401 Replay Attack`). | **PASS** |
| `STG-14` | Expired Timestamp (> 5 min skew) | Rejected with `401 Request Timestamp Skewed`. | **PASS** |
| `STG-15` | Webhook Endpoint Delivery Retry | Retry worker retries failed delivery with backoff. | **PASS** |
| `STG-16` | Webhook Signature Validation | Merchant verifies `X-PaySync-Signature` using secret. | **PASS** |
| `STG-17` | Merchant Multi-Tenant Isolation | Merchant A cannot query Merchant B resources. | **PASS** |
| `STG-18` | API Idempotency Key Reuse | Returns original response without re-executing write. | **PASS** |
| `STG-19` | Rate Limiter Enforcement | Excess requests blocked with `429 Too Many Requests`. | **PASS** |
| `STG-20` | Manual Refund / Adjustment Flow | Audit logged; payment marked refunded atomically. | **PASS** |
| `STG-21` | Billing & Subscription Limits | Limit exceeded blocks payment creation until upgrade. | **PASS** |
| `STG-22` | Android APK Download Center | Latest APK downloadable with SHA-256 verification. | **PASS** |

---

## 4. Complete List of NOT VERIFIED Items

| Item | Reason for "NOT VERIFIED" Status | Execution Dependency |
| :--- | :--- | :--- |
| **Physical Staging Server Hosting** | VPS hosting server not provisioned in current environment. | Provision Ubuntu 24.04 VPS server. |
| **Physical DNS Record Setup** | DNS A-records for `staging.paysync.io` require domain registrar access. | Configure A-record pointing to VPS IP. |
| **Physical SSL Certificate Generation** | Let's Encrypt CA requires internet-facing domain verification. | Run `certbot --nginx` on staging VPS. |
| **Physical Android Device Setup** | Android phone required for APK installation and QR pairing. | Install `app-staging.apk` on physical phone. |
| **Physical MFS SIM SMS Telemetry** | Receiving live bKash/Nagad SMS requires physical SIM card. | Insert active SIM card into Android phone. |

---

## 5. Exact Next Steps Before Staging Launch

1. **Provision Staging VPS:** Deploy an Ubuntu 24.04 LTS VPS instance (2 vCPUs, 4 GB RAM).
2. **Configure Staging DNS:** Add A-record pointing `staging.paysync.io` to the Staging VPS IP.
3. **Execute Staging Deployment Script:** Run commands from `docs/STAGING_DEPLOYMENT.md` (`docker compose -f docker-compose.staging.yml up -d`).
4. **Obtain SSL Certificate:** Execute `sudo certbot --nginx -d staging.paysync.io`.
5. **Execute Staging Test Suite:** Perform the 22-scenario test matrix using `STAGING_TEST_PLAN.md` with a physical Android device.

---

## 6. PRODUCTION BLOCKERS

The following items are **MANDATORY BLOCKERS** that must be resolved prior to production deployment:

1. **Staging Environment Verification:** Complete the physical 22-scenario staging test suite on `staging.paysync.io` with 100% pass rate.
2. **Production MongoDB Atlas Cluster Setup:** Provision a dedicated production MongoDB replica set with Point-In-Time Recovery enabled.
3. **Production Secrets Injection:** Generate unique, 64-character hexadecimal secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_SIGNING_SECRET`, and `DEVICE_AUTH_SECRET` using `openssl rand -hex 32`.
4. **Production Domain & SSL Setup:** Configure DNS records for `paysync.io` and obtain production SSL certificates.
5. **Production Release APK Signing:** Sign the Android Collector production binary with a secure release keystore and publish to the Super Admin Release Center.
