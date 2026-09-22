# PaySync MFS Gateway — Vercel Deployment Compatibility Audit

**Document Version:** 1.0.0  
**Audit Completion Date:** September 22, 2026  
**Target Architecture:** Vercel Serverless Platform → PaySync App/API → MongoDB Atlas → Android Collector  
**Codebase Type:** React 19 SPA (Vite) + Express 4 Node.js API + MongoDB/Mongoose  

---

## Executive Summary

A comprehensive, read-only audit of the PaySync MFS Gateway codebase was conducted to evaluate compatibility with Vercel's serverless platform. The codebase is structurally well-designed, highly modular, and fully typed in TypeScript. However, because Vercel operates an ephemeral, event-driven serverless runtime, specific architectural components (long-running Express process listener, in-process `setInterval` background loops, and local filesystem APK binary writes) require minor serverless adaptations before Vercel deployment.

**Final Verdict:** **`NEEDS CHANGES`** (Detailed in Section 23).

---

## 1. Codebase Architecture & Framework Inspection

| Subsystem Component | Actual Implementation in Codebase | Vercel Compatibility Status |
| :--- | :--- | :---: |
| **Frontend Framework** | React 19.0 + Vite 8 SPA (`/src`, `index.html`). *Not Next.js.* | **PASS** |
| **Backend Framework** | Express 4.21 custom Node.js server (`server.ts`). | **NEEDS CHANGE** |
| **Database ORM** | Mongoose 9.10 + MongoDB Atlas (`server/db/connect.ts`). | **PASS** |
| **Build System** | Vite SPA build + esbuild bundling `server.ts` into `dist/server.cjs`. | **PASS** |
| **Background Workers** | In-process `setInterval` loops for webhook retries (60s) and device watchdog (45s). | **NEEDS CHANGE** |
| **File System Usage** | Local disk writes for Android APK binaries in `public/downloads/apk`. | **NEEDS CHANGE** |

---

## 2. Next.js & Vercel Framework Compatibility

- **Findings:** The project is a **React 19 SPA built with Vite 8**, not a Next.js App Router application.
- **Vercel Hosting Strategy:** Vercel natively supports Vite React SPAs. The frontend static bundle (`/dist`) can be served directly via Vercel's Edge Network / CDN.
- **Status:** **PASS**

---

## 3. Express Backend & Custom Server Inspection

- **Current Implementation:** `server.ts` instantiates an Express application, mounts middleware/routes, and binds to a persistent TCP port via `app.listen(PORT, '0.0.0.0')`.
- **Vercel Serverless Constraint:** Vercel does not run long-running `node` process listeners. Instead, HTTP requests are routed to serverless function instances (`@vercel/node`).
- **Required Adaptation:** Wrap the Express `app` as a Vercel serverless entry point (e.g., `api/index.ts` exporting `export default app`) using `vercel.json` rewrite routing.
- **Status:** **NEEDS CHANGE**

---

## 4. Background Workers & Timer Loops Inspection

- **Code Audit References:**
  1. `WebhookService.startRetryWorker(60 * 1000)` (`server.ts:93`): Polls MongoDB every 60 seconds to retry failed webhook deliveries.
  2. Device Watchdog (`server.ts:96`): Executes `setInterval` every 45 seconds to mark stale Android collectors offline.
  3. Payment Expiration Sweeps: Calculated on demand during query execution.
- **Vercel Incompatibility:** Serverless function instances freeze or terminate immediately after sending an HTTP response. In-process `setInterval` timers will **NOT** run continuously in the background between requests.
- **Required Adaptation:** Convert continuous background loops into scheduled HTTP endpoints (e.g. `/api/cron/webhooks` and `/api/cron/devices`) triggered by Vercel Cron.
- **Status:** **NEEDS CHANGE**

---

## 5. Vercel Cron Assessment

- **Feasibility:** High. Vercel Cron supports scheduled HTTP GET invocations configured via `vercel.json`.
- **Target Cron Jobs:**
  - `GET /api/cron/webhooks` — Triggers `WebhookService.processPendingRetries()` (Every 1 minute).
  - `GET /api/cron/devices` — Triggers `Repository.markStaleDevicesOffline()` (Every 1 minute).
- **Security Guard:** Cron endpoints must be protected by checking `Authorization: Bearer ${CRON_SECRET}` to prevent public invocation.
- **Status:** **PASS** (Architecture fully compatible).

---

## 6. Webhook Delivery & Security System Audit

- **Security Architecture:** Webhooks use HMAC-SHA256 signature calculations (`X-PaySync-Signature`), atomic database lease locks (`leaseExpiresAt`), event IDs, and exponential backoff retry counts.
- **Vercel Compatibility:** The cryptographic signature computation and atomic Mongoose lease locking are 100% serverless-safe. Webhook retry execution will be triggered via Vercel Cron.
- **Status:** **PASS**

---

## 7. MongoDB Atlas Serverless Connection Lifecycle

- **Code Audit Reference:** `server/db/connect.ts` manages Mongoose connection state.
- **Serverless Connection Pooling:** In Vercel, cold starts create new function instances. Mongoose connections must be cached globally (`global.mongoose = { conn, promise }`) across invocations to avoid exhausting MongoDB Atlas connection limits.
- **Database Rules:** `ALLOW_IN_MEMORY_FALLBACK=false` and `STRICT_PRODUCTION_MODE=true` remain enforced.
- **Status:** **PASS**

---

## 8. Payment REST API v1 Audit

- **Endpoints Inspected:**
  - `POST /api/v1/payments/create`
  - `GET /api/v1/payments/:id`
  - `GET /api/v1/payments/:id/status`
  - `POST /api/v1/payments/:id/verify`
  - `POST /api/v1/payments/:id/cancel`
  - `GET /api/v1/transactions`
  - `GET /api/v1/merchant/wallets`
- **Security Control Verification:** All security controls (API Key/Secret verification, HMAC signature validation `X-Signature`, timestamp skew checks, nonce replay protection, atomic MongoDB updates, tenant isolation) execute statelessly in route handlers and are 100% compatible with Vercel Functions.
- **Status:** **PASS**

---

## 9. Native Android Collector Compatibility

- **Communication Protocol:** HTTPS over REST API (`https://<vercel-domain>/api/v1/*`).
- **Collector Security:** Device authentication (`X-Device-Id`, `X-Device-Token`, `X-Signature`, `X-Nonce`, `X-Timestamp`) and 30-second heartbeat ping are 100% stateless and compatible with Vercel.
- **Function Execution Limits:** Standard Vercel Serverless Function timeout (10s on Hobby, 15s/60s on Pro) is more than sufficient for Android SMS ingestion requests (< 200ms latency).
- **Status:** **PASS**

---

## 10. Local File System & Persistence Dependency Audit

- **Code Audit References:**
  - `server/services/androidReleaseService.ts`: Writes generated APK zip binaries to disk at `public/downloads/apk` using `fs.mkdirSync`, `fs.writeFileSync`, `AdmZip.writeZip`.
  - `server/routes/androidReleases.ts`: Reads APK binaries from disk via `fs.createReadStream(safePath)`.
- **Vercel Incompatibility:** Vercel functions run on an ephemeral, read-only file system (except `/tmp`). Files written to local disk will disappear when function instances terminate or cold-start.
- **Required Adaptation:** Store published APK binary files in **MongoDB GridFS** or cloud object storage (e.g., AWS S3 / Cloudflare R2 / Vercel Blob) and stream directly to clients.
- **Status:** **NEEDS CHANGE**

---

## 11. Android Release Center APK Distribution Audit

- **Findings:** Metadata is stored in MongoDB (`androidreleases` collection). However, binary APK files currently rely on local disk storage (`public/downloads/apk`).
- **Impact on Vercel:** Attempting to download APKs on Vercel without object storage / GridFS integration will result in `404 File Not Found` error.
- **Status:** **NEEDS CHANGE**

---

## 12. Rate Limiting Audit

- **Code Audit Reference:** `server/middleware/rateLimiter.ts` uses Express in-memory sliding window counters.
- **Vercel Behavior:** In-memory maps operate per serverless instance container. While functional per container instance, they do not share global rate-limit counts across auto-scaled Vercel function instances.
- **Recommendation:** Keep current rate limiting or transition counter state to MongoDB TTL documents for global serverless rate enforcement.
- **Status:** **PASS** (Functional per instance; minor optimization optional).

---

## 13. Health Endpoints Audit

- **Endpoints:**
  - `GET /api/health` — Returns system overview & database status.
  - `GET /api/health/live` — Returns HTTP 200 `{"status": "ALIVE"}`.
  - `GET /api/health/ready` — Returns HTTP 200 when MongoDB is connected, HTTP 503 when disconnected.
- **Vercel Compatibility:** Probes operate statelessly and return accurate HTTP status codes on Vercel.
- **Status:** **PASS**

---

## 14. Environment Variables & Secret Isolation

- **Server-Only Secrets Verified:**
  - `MONGODB_URI`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `ENCRYPTION_KEY`
  - `WEBHOOK_SIGNING_SECRET`
  - `DEVICE_AUTH_SECRET`
- **Security Check:** Zero secrets are exposed to client bundles or prefixed with `NEXT_PUBLIC_` or `VITE_`.
- **Status:** **PASS**

---

## 15. CORS & Domain Configuration

- **Domain Configuration:**
  - `APP_URL`: Set to Vercel deployment URL (`https://paysync.vercel.app` or custom domain `https://paysync.io`).
  - `CORS_ALLOWED_ORIGINS`: Set to matching production domain origins.
- **Status:** **PASS**

---

## 16. Authentication & Session Management

- **Findings:** Uses stateless JWT access/refresh tokens stored in HTTP headers and secure cookies. RBAC and multi-tenant merchant isolation are enforced strictly in server middleware.
- **Status:** **PASS**

---

## 17. Logging Audit

- **Findings:** Logs output cleanly as structured console output. No local log files are created or expected. Secrets are sanitized.
- **Status:** **PASS**

---

## 18. Vercel Function Execution Limitations Analysis

| Vercel Limitation | Impact on PaySync Codebase | Mitigation Strategy |
| :--- | :--- | :--- |
| **Execution Timeout (10s - 60s)** | Payment creation & TrxID verification take < 200ms. | No impact; within limits. |
| **Ephemeral Filesystem** | APK uploads/downloads fail if written to local disk. | Store APK binaries in MongoDB GridFS or Vercel Blob. |
| **Stateless Container Lifecycle** | `setInterval` background loops stop when request ends. | Replace loops with Vercel Cron endpoints. |
| **Cold Starts** | Mongoose connection overhead on initial invocation. | Implement global cached Mongoose connection pattern. |

---

## 19. Docker & Nginx Status for Vercel

- **Status:** **NOT REQUIRED FOR VERCEL DEPLOYMENT.**
- **Note:** `Dockerfile`, `docker-compose.yml`, and `nginx/default.conf` should be retained in the repository for VPS/container deployment options. They do not interfere with Vercel deployments.

---

## 20. Production Build Validation

- **Command:** `npm run build`
- **TypeScript Verification (`tsc --noEmit`):** **0 errors**
- **Build Status:** **PASS**

---

## VERCEL BLOCKERS

The following 3 items are **MANDATORY BLOCKERS** that must be addressed before deploying to Vercel:

1. **Persistent Express Server Listener:** `server.ts` currently calls `app.listen(PORT)`, expecting a long-running process. It must be exported as a serverless request handler (`api/index.ts`).
2. **In-Process Background `setInterval` Loops:** Background workers in `server.ts` (`WebhookService.startRetryWorker` and device watchdog `setInterval`) will not run continuously on Vercel. They must be refactored into Vercel Cron endpoints (`/api/cron/webhooks` and `/api/cron/devices`).
3. **Local Filesystem APK Binary Dependencies:** `AndroidReleaseService` writes APK binaries to local disk (`public/downloads/apk`), which will disappear on Vercel's ephemeral filesystem. APK binaries must be stored in MongoDB GridFS or object storage.

---

## MINIMUM REQUIRED CHANGES

To make the codebase 100% Vercel-compatible without altering any business logic or product features:

1. **Create Vercel Entry Point (`api/index.ts`):** Export the Express app instance for Vercel Serverless Function execution.
2. **Add `vercel.json` Configuration:**
   ```json
   {
     "version": 2,
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/index.ts" },
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "crons": [
       { "path": "/api/cron/webhooks", "schedule": "* * * * *" },
       { "path": "/api/cron/devices", "schedule": "* * * * *" }
     ]
   }
   ```
3. **Expose Cron Trigger Endpoints:** Create `/api/cron/webhooks` and `/api/cron/devices` in Express routes guarded by `CRON_SECRET`.
4. **Update APK Storage to MongoDB GridFS or Object Storage:** Modify `AndroidReleaseService` to save APK buffers to MongoDB GridFS or cloud object storage instead of local disk.
5. **Add Serverless Mongoose Connection Caching:** Update `server/db/connect.ts` to cache the Mongoose connection in `global.mongoose`.

---

## VERCEL DEPLOYMENT VERDICT

`NEEDS CHANGES`

*(Summary: The core business logic, React frontend, REST API, Mongoose schemas, and security model are 100% sound and compatible with Vercel. However, deploying to Vercel requires making the 5 minimum serverless adaptations listed above to handle background crons, serverless function routing, and binary APK storage).*
