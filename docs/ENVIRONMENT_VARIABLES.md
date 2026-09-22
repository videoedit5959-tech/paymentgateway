# PaySync MFS Gateway — Environment Variables Master Reference

**Document Version:** 2.0.0  
**Phase:** Phase 7 — Comprehensive Codebase Environment Audit  
**Last Updated:** September 22, 2026  

---

## 1. Codebase Audit Overview

This document provides a complete, line-by-line environment variable specification derived from an exhaustive audit of all `process.env.*` references across the PaySync MFS Gateway repository (including Express backend routes, authentication middlewares, MongoDB repository connection handlers, rate limiters, webhooks, Android device APIs, SDK examples, and build configurations).

### Security & Compliance Rules
1. **Zero Secret Exposure in Client Bundles:** No private secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_SIGNING_SECRET`, `DEVICE_AUTH_SECRET`, `MONGODB_URI`) are exposed to client-side bundles or prefixed with `NEXT_PUBLIC_`.
2. **Fail-Fast Startup Enforcement:** On startup, `server/utils/envValidator.ts` evaluates all required production secrets. If any required variable is missing, shorter than 24 characters, or set to a sample default value in `production` mode, process execution is immediately aborted.
3. **Multi-Environment Isolation:** Staging and production MUST use isolated databases, separate cryptographic secrets, and distinct domain origins.

---

## 2. Complete Environment Variable Inventory Table

| Variable Name | Required / Optional | Purpose / Description | Example Format | Secret? | Target Environments | Code Reference Location |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `NODE_ENV` | **REQUIRED** | Defines execution mode (`development`, `staging`, `production`, `test`). | `production` | No | Dev, Staging, Prod | `server.ts`, `connect.ts`, `envValidator.ts` |
| `PORT` | Optional | Internal HTTP port for Express application server. | `3000` | No | Dev, Staging, Prod | `server.ts` |
| `LOG_LEVEL` | Optional | Logging verbosity (`debug`, `info`, `warn`, `error`). | `warn` | No | Dev, Staging, Prod | `server/utils/logger.ts` |
| `MONGODB_URI` | **REQUIRED** (Prod/Staging) | MongoDB database connection URI string. | `mongodb+srv://user:pass@cluster.mongodb.net/paysync_prod` | **YES** | Dev, Staging, Prod | `server/db/connect.ts`, `envValidator.ts` |
| `ALLOW_IN_MEMORY_FALLBACK` | Optional | When set to `'false'`, disables falling back to in-memory DB if MongoDB fails. | `false` | No | Staging, Prod | `server/db/connect.ts` |
| `STRICT_PRODUCTION_MODE` | Optional | Enforces strict MongoDB connection validation and disables mock mode. | `true` | No | Staging, Prod | `server.ts`, `connect.ts` |
| `SEED_DEMO_DATA` | Optional | When `'true'`, seeds demo records into MongoDB if database is empty. | `false` | No | Dev, Staging | `server/db/repository.ts` |
| `JWT_ACCESS_SECRET` | **REQUIRED** (Prod/Staging) | Cryptographic secret for signing JWT user access tokens (>=24 chars). | `64-char random hex string` | **YES** | Dev, Staging, Prod | `server/middleware/auth.ts`, `maintenance.ts` |
| `JWT_REFRESH_SECRET` | **REQUIRED** (Prod/Staging) | Cryptographic secret for signing user refresh tokens (>=24 chars). | `64-char random hex string` | **YES** | Dev, Staging, Prod | `server/middleware/auth.ts`, `envValidator.ts` |
| `ENCRYPTION_KEY` | **REQUIRED** (Prod/Staging) | 32-byte (256-bit) secret key for AES-256 data encryption at rest. | `64-char random hex string` | **YES** | Dev, Staging, Prod | `server/utils/envValidator.ts` |
| `WEBHOOK_SIGNING_SECRET` | **REQUIRED** (Prod/Staging) | Default HMAC-SHA256 secret key for signing outgoing webhook events. | `64-char random hex string` | **YES** | Dev, Staging, Prod | `server/services/webhookService.ts`, `webhooks.ts` |
| `DEVICE_AUTH_SECRET` | **REQUIRED** (Prod/Staging) | Master key for Android Collector QR device pairing and HMAC auth. | `64-char random hex string` | **YES** | Dev, Staging, Prod | `server/utils/envValidator.ts`, `deviceAuth.ts` |
| `CRON_SECRET` | **REQUIRED** (Vercel Prod/Staging) | Authorization secret for Vercel Cron background worker triggers. | `64-char random hex string` | **YES** | Vercel Staging, Prod | `server/routes/cron.ts`, `envValidator.ts` |
| `APP_URL` | **REQUIRED** (Prod/Staging) | Canonical base URL for web application & merchant portal. | `https://paysync.io` | No | Dev, Staging, Prod | `server/routes/devices.ts`, `payments.ts` |
| `API_URL` | **REQUIRED** (Prod/Staging) | Base URL for REST API endpoints. | `https://paysync.io/api` | No | Dev, Staging, Prod | `.env.example`, `STAGING_DEPLOYMENT.md` |
| `CHECKOUT_URL` | Optional | Base URL for hosted customer payment checkout sessions. | `https://paysync.io/checkout` | No | Dev, Staging, Prod | `.env.example`, `PRODUCTION_DEPLOYMENT.md` |
| `CORS_ALLOWED_ORIGINS` | **REQUIRED** (Prod/Staging) | Comma-separated allowed origins for cross-origin browser requests. | `https://paysync.io,https://app.paysync.io` | No | Staging, Prod | `server.ts` |
| `MAINTENANCE_MODE` | Optional | Global kill-switch: `'true'` blocks non-admin API writes with 503 error. | `false` | No | Dev, Staging, Prod | `server/middleware/maintenance.ts` |
| `DISABLE_HMR` | Optional | Disables Hot Module Replacement in Vite container environment. | `true` | No | Dev | `vite.config.ts` |
| `PAYMENT_EXPIRY_MINUTES` | Optional | Hosted payment checkout session TTL expiry window in minutes. | `15` | No | Dev, Staging, Prod | `server/routes/v1/index.ts` |
| `RATE_LIMIT_AUTH_WINDOW_MS` | Optional | Window duration for authentication rate limiter in milliseconds. | `900000` (15 mins) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_AUTH_MAX` | Optional | Max request count for authentication rate limiter. | `20` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_REGISTER_WINDOW_MS` | Optional | Window duration for user registration rate limiter in milliseconds. | `1800000` (30 mins) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_REGISTER_MAX` | Optional | Max request count for user registration rate limiter. | `10` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_PAYMENT_WINDOW_MS` | Optional | Window duration for payment creation rate limiter in milliseconds. | `60000` (1 min) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_PAYMENT_MAX` | Optional | Max request count for payment creation rate limiter. | `60` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_VERIFY_WINDOW_MS` | Optional | Window duration for TrxID customer verification rate limiter. | `300000` (5 mins) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_VERIFY_MAX` | Optional | Max attempt count for customer TrxID verification rate limiter. | `25` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_SMS_WINDOW_MS` | Optional | Window duration for Android SMS ingestion rate limiter. | `60000` (1 min) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_SMS_MAX` | Optional | Max request count for Android SMS ingestion rate limiter. | `150` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_PAIRING_WINDOW_MS` | Optional | Window duration for QR pairing rate limiter in milliseconds. | `600000` (10 mins) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_PAIRING_MAX` | Optional | Max request count for QR device pairing rate limiter. | `15` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_APIKEY_WINDOW_MS` | Optional | Window duration for API key management rate limiter. | `60000` (1 min) | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `RATE_LIMIT_APIKEY_MAX` | Optional | Max request count for API key management rate limiter. | `30` | No | Staging, Prod | `server/middleware/rateLimiter.ts` |
| `PAYSYNC_API_KEY` | *SDK/Docs Only* | Sample merchant API key used in SDK integration examples. | `ps_test_sample_key_123` | No | SDK Examples / Docs | `src/components/ApiDocs.tsx`, `sdk/node/example.ts` |
| `PAYSYNC_API_SECRET` | *SDK/Docs Only* | Sample merchant API secret used in SDK integration examples. | `ps_test_sample_sec_456` | No | SDK Examples / Docs | `src/components/ApiDocs.tsx`, `sdk/node/example.ts` |
| `PAYSYNC_WEBHOOK_SECRET` | *SDK/Docs Only* | Sample webhook secret used in merchant SDK documentation. | `ps_test_webhook_sec_789` | No | SDK Examples / Docs | `src/components/ApiDocs.tsx`, `docs/WEBHOOKS.md` |
| `PAYSYNC_BASE_URL` | *SDK/Docs Only* | Sample base URL used in merchant SDK documentation. | `https://paysync.io` | No | SDK Examples / Docs | `sdk/node/example.ts` |

---

## 3. Detailed Environment Subsystem Categorization

### A. Core Server & Database Subsystem
- **`NODE_ENV`**: Set to `production` in live environments. Triggers strict security headers, disables Vite dev middleware, and enforces fail-fast secret checks.
- **`MONGODB_URI`**: Production MongoDB replica set connection string (e.g., MongoDB Atlas M10/M20+ cluster).
- **`ALLOW_IN_MEMORY_FALLBACK`**: Must be set to `false` in production so the application refuses to run on volatile in-memory fallback databases.
- **`STRICT_PRODUCTION_MODE`**: Set to `true` to ensure all queries execute against live MongoDB.

### B. Security & Cryptographic Keying Subsystem
- **`JWT_ACCESS_SECRET`**: Cryptographic signing secret for user access tokens. Must be generated using `openssl rand -hex 32`.
- **`JWT_REFRESH_SECRET`**: Cryptographic signing secret for user refresh tokens. Must be generated using `openssl rand -hex 32`.
- **`ENCRYPTION_KEY`**: 32-byte hexadecimal key for AES-256 data encryption at rest.
- **`WEBHOOK_SIGNING_SECRET`**: Secret key for computing HMAC-SHA256 signatures (`X-PaySync-Signature`) on outgoing webhook notifications.
- **`DEVICE_AUTH_SECRET`**: Secret key for validating Android Collector HMAC signatures (`X-Signature`) and QR pairing tokens.

### C. Base URLs & CORS Security
- **`APP_URL`**: Canonical production URL (e.g. `https://paysync.io`).
- **`API_URL`**: Canonical API URL (e.g. `https://paysync.io/api`).
- **`CHECKOUT_URL`**: Canonical checkout URL (e.g. `https://paysync.io/checkout`).
- **`CORS_ALLOWED_ORIGINS`**: Explicit list of domain origins allowed to make browser requests (`https://paysync.io,https://app.paysync.io`). Wildcards (`*`) are prohibited.

---

## 4. Production Environment Configuration Checklist

Prior to deploying the PaySync MFS Gateway to staging or production, verify that every item in this checklist is configured in your secure environment / secret manager:

- [ ] **1. `NODE_ENV`** configured to `production`.
- [ ] **2. `PORT`** set to `3000`.
- [ ] **3. `MONGODB_URI`** configured with production MongoDB Atlas cluster URI.
- [ ] **4. `ALLOW_IN_MEMORY_FALLBACK`** set to `false`.
- [ ] **5. `STRICT_PRODUCTION_MODE`** set to `true`.
- [ ] **6. `JWT_ACCESS_SECRET`** generated via `openssl rand -hex 32` (minimum 64 hex characters).
- [ ] **7. `JWT_REFRESH_SECRET`** generated via `openssl rand -hex 32` (minimum 64 hex characters).
- [ ] **8. `ENCRYPTION_KEY`** generated via `openssl rand -hex 32` (exact 32-byte / 64-hex character key).
- [ ] **9. `WEBHOOK_SIGNING_SECRET`** generated via `openssl rand -hex 32`.
- [ ] **10. `DEVICE_AUTH_SECRET`** generated via `openssl rand -hex 32`.
- [ ] **11. `APP_URL`** set to `https://paysync.io` (no trailing slash).
- [ ] **12. `API_URL`** set to `https://paysync.io/api`.
- [ ] **13. `CHECKOUT_URL`** set to `https://paysync.io/checkout`.
- [ ] **14. `CORS_ALLOWED_ORIGINS`** set to `https://paysync.io,https://app.paysync.io`.
- [ ] **15. `MAINTENANCE_MODE`** set to `false`.
- [ ] **16. No Secrets in Client Bundles:** Verified zero `NEXT_PUBLIC_` secret prefixing.
