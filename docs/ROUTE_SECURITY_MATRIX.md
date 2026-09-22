# PaySync MFS Gateway — Route Security & Access Control Matrix

**Document Version:** 1.0.0  
**Phase:** Phase 6.2 — Route Security, Public Pages & Protected Pages  
**Last Updated:** September 22, 2026  
**Status:** AUDITED & SECURED  

---

## 1. Executive Security Overview

The PaySync MFS Gateway operates a strict **4-Level Security Hierarchy** governing all frontend views, REST API endpoints, Android Collector APIs, and Super Admin management interfaces.

```
+-------------------------------------------------------------------------+
|                  LEVEL 4: SUPER ADMIN ONLY                              |
|   (Platform Admin Metrics, Tenant Controls, Global Settings, Releases)  |
+-------------------------------------------------------------------------+
                                     ^
                                     |
+-------------------------------------------------------------------------+
|              LEVEL 3: MERCHANT / TENANT PROTECTED                       |
|   (Wallets, API Keys, Webhooks, Billing, Custom Domains, Team, Refunds)  |
+-------------------------------------------------------------------------+
                                     ^
                                     |
+-------------------------------------------------------------------------+
|                 LEVEL 2: AUTHENTICATED USER                             |
|   (User Profile /me, User Active Sessions, Support Tickets)             |
+-------------------------------------------------------------------------+
                                     ^
                                     |
+-------------------------------------------------------------------------+
|                     LEVEL 1: PUBLIC ACCESSIBLE                          |
|   (Landing, Checkout UI, Public APK Downloads, API Docs, Health Checks) |
+-------------------------------------------------------------------------+
```

---

## 2. Security Levels Definition

| Security Level | Name | Description | Authentication Mechanism | Tenant Scope |
| :--- | :--- | :--- | :--- | :--- |
| **LEVEL 1** | **PUBLIC** | Openly accessible to any unauthenticated user or browser. | None required | Global / Public |
| **LEVEL 2** | **AUTHENTICATED USER** | Accessible to any active registered user account. | Bearer JWT (`JWT_ACCESS_SECRET`) | User Scope |
| **LEVEL 3** | **MERCHANT / TENANT** | Restricted to authenticated users belonging to a specific merchant account (`merchantId`). Also accepts Merchant API Keys (`X-API-Key` + `X-API-Secret`). | Bearer JWT or API Key Hash | Strictly Isolated by `merchantId` |
| **LEVEL 4** | **SUPER ADMIN ONLY** | Strictly restricted to platform Super Administrators (`SUPER_ADMIN` / `ADMIN` roles). | Bearer JWT + Role Guard | Cross-Tenant Platform Control |

---

## 3. Frontend App Views Matrix

| View Route | Security Level | Auth Required | Allowed Roles | Description & Protection Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Overview / Landing) | **LEVEL 1** | No | Any | Gateway landing page, features overview, and public navigation. |
| `/checkout/:paymentId` | **LEVEL 1** | No | Any | Customer payment checkout screen. Exposes only public merchant branding and payment metadata. No secrets exposed. |
| `/docs` (API Documentation) | **LEVEL 1** | No | Any | Developer documentation, curl code samples, and OpenAPI spec viewer. |
| `/android-app` | **LEVEL 1** | No | Any | Android Collector APK Release Center. Public downloads & release history. |
| `/merchant` | **LEVEL 3** | Yes | `MERCHANT_OWNER`, `MERCHANT_ADMIN`, `MERCHANT_STAFF`, `MERCHANT_FINANCE`, `MERCHANT_DEVELOPER`, `MERCHANT_VIEWER` | Merchant Portal Dashboard. Renders tenant metrics, transactions, and settings. |
| `/admin` | **LEVEL 4** | Yes | `SUPER_ADMIN`, `ADMIN` | Super Admin Control Panel. Guarded by frontend 403 Access Denied screen and server-side JWT role validation. |

---

## 4. API Routes Security Matrix

### 4.1 System & Health Routes

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | **LEVEL 1** | Public | No | System health metrics, DB connection status, memory usage, uptime. |
| `/api/health/live` | `GET` | **LEVEL 1** | Public | No | Liveness probe for Cloud Run container orchestration. |
| `/api/health/ready` | `GET` | **LEVEL 1** | Public | No | Readiness probe for DB connectivity. |

---

### 4.2 Authentication & User Account Routes (`/api/auth/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | **LEVEL 1** | Public | No | Rate-limited merchant self-registration endpoint. Creates merchant & owner user. |
| `/api/auth/login` | `POST` | **LEVEL 1** | Public | No | Rate-limited user authentication. Returns JWT access & refresh tokens. |
| `/api/auth/me` | `GET` | **LEVEL 2** | Bearer JWT | User | Returns authenticated user profile and associated merchant metadata. |

---

### 4.3 Hosted Checkout & Payment Verification Routes (`/api/payments/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/payments/create` | `POST` | **LEVEL 3** | API Key / JWT | Yes (`merchantId`) | Initializes payment session. Returns checkout URL. Idempotency & rate-limited. |
| `/api/payments/:id` | `GET` | **LEVEL 1** | Public | Payment-bound | Retrieves public checkout details (amount, status, active wallets). |
| `/api/payments/:id/status` | `GET` | **LEVEL 1** | Public | Payment-bound | Lightweight status polling endpoint for customer checkout interface. |
| `/api/payments/:id/verify` | `POST` | **LEVEL 1** | Public | Payment-bound | Customer submits MFS TrxID. Atomically verifies & completes payment. |
| `/api/payments` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists all merchant payment sessions. Strictly scoped by `merchantId`. |
| `/api/payments/:id/review` | `POST` | **LEVEL 3/4** | Bearer JWT | Yes (`merchantId`) | Manual review resolution (Approve/Reject flagged payments). Role checked. |

---

### 4.4 Wallet Management Routes (`/api/wallets/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/wallets` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists all bKash / Nagad / Rocket wallets for current merchant. |
| `/api/wallets` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Adds a new wallet to merchant account. Checks subscription limits. |
| `/api/wallets/:id` | `PATCH` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Updates wallet details (display name, type, status). Tenant verified. |

---

### 4.5 Device Collector & QR Pairing Routes (`/api/devices/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/devices` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists connected Android SMS collector devices for merchant. |
| `/api/devices/pairing-token` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Generates 10-minute temporary pairing token & QR payload. |
| `/api/devices/pair` | `POST` | **LEVEL 1** | Token Pair | Token-bound | Android app exchanges pairing token for permanent `deviceToken`. |
| `/api/devices/heartbeat` | `POST` | **LEVEL 3 (Device)**| Device Token | Device-bound | Android device pinging battery, network status, and liveness. |
| `/api/devices/config` | `GET` | **LEVEL 3 (Device)**| Device Token | Device-bound | Android device syncs active wallet list & system settings. |
| `/api/devices/:id/status` | `PATCH` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Toggles device status (ONLINE/DISABLED/UNPAIRED). Tenant verified. |
| `/api/devices/:id` | `DELETE` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Unpairs Android device and invalidates device token. Tenant verified. |

---

### 4.6 Real Device Android SMS Ingestion Route (`/api/v1/device/sms`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/device/sms` | `POST` | **LEVEL 3 (Device)**| Device Token + HMAC-SHA256 + Nonce | Yes (`deviceId`) | Production SMS collector ingestion API. Verified via device credentials, HMAC signature, replay protection, and server-side parsing. |

---

### 4.7 Merchant API v1 Endpoints (`/api/v1/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/openapi.json` | `GET` | **LEVEL 1** | Public | No | OpenAPI 3.0 specification file for developers. |
| `/api/v1/payments/create` | `POST` | **LEVEL 3** | API Key | Yes (`merchantId`) | External API endpoint to initialize payment session. |
| `/api/v1/payments/:id` | `GET` | **LEVEL 3** | API Key | Yes (`merchantId`) | External API endpoint to query payment status. |
| `/api/v1/payments/:id/verify` | `POST` | **LEVEL 3** | API Key | Yes (`merchantId`) | Server-to-server transaction verification API. |
| `/api/v1/transactions` | `GET` | **LEVEL 3** | API Key | Yes (`merchantId`) | Query raw transaction logs by date, provider, or TrxID. |

---

### 4.8 API Keys & Webhook Management Routes

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/api-keys` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists API keys for current merchant. Secrets are never exposed after creation. |
| `/api/api-keys` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Creates a new API Key & secret pair. One-time secret display. |
| `/api/api-keys/:id` | `DELETE` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Revokes an existing API Key. Tenant verified. |
| `/api/api-keys/:id/rotate` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Rotates secret for an existing API Key. Tenant verified. |
| `/api/api-keys/:id/status` | `PATCH` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Toggles API key status (ACTIVE/REVOKED). Verified for tenant isolation. |
| `/api/webhooks` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists webhook delivery logs & HTTP responses. |
| `/api/webhooks/:id` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Gets detailed payload for single webhook delivery attempt. Tenant verified. |
| `/api/webhooks/test` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Dispatches test webhook ping to merchant endpoint. |
| `/api/webhooks/:id/retry` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Re-dispatches failed webhook payload immediately. Tenant verified. |

---

### 4.9 Billing, Custom Domains, Branding & Team Routes

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/billing/plans` | `GET` | **LEVEL 1** | Public | No | Public active subscription plan catalog & feature matrices. |
| `/api/billing/subscription` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Merchant subscription details, active plan, usage quotas. |
| `/api/billing/subscribe` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Selects plan / cycle and creates billing invoice. |
| `/api/billing/invoices` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists merchant subscription invoices. |
| `/api/billing/invoices/:id` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Gets single invoice details. Tenant verified. |
| `/api/billing/invoices/:id/pay-manual` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Submits manual MFS payment reference & receipt proof. |
| `/api/domains` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists custom domains mapped to merchant checkout. |
| `/api/domains` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Registers custom domain & generates TXT DNS token. |
| `/api/domains/:id/verify` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Triggers automated DNS verification check. Tenant verified. |
| `/api/domains/:id` | `DELETE` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Removes custom domain mapping. Tenant verified. |
| `/api/branding` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Get custom branding, logo, and color theme. |
| `/api/branding` | `PUT` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Updates custom branding settings & white-label CSS. |
| `/api/branding/public/:merchantId` | `GET` | **LEVEL 1** | Public | Public-safe | Returns non-sensitive public branding assets for checkout UI. |
| `/api/team` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists merchant team members and pending invitations. |
| `/api/team/invite` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Invites new staff member. Role-checked (`MERCHANT_OWNER`/`ADMIN`). Prevents privilege escalation. |
| `/api/team/invitations/:id/revoke` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Revokes pending staff invitation. Tenant verified. |

---

### 4.10 Support Tickets & Manual Refunds Routes

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/support/tickets` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists support tickets for current merchant. |
| `/api/support/tickets` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Creates a new support ticket. |
| `/api/support/tickets/:id` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Retrieves ticket message history. Tenant verified. |
| `/api/support/tickets/:id/messages` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Appends message reply to ticket. Tenant verified. |
| `/api/refunds` | `GET` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Lists logged manual refunds for merchant. |
| `/api/refunds` | `POST` | **LEVEL 3** | Bearer JWT | Yes (`merchantId`) | Records a manual refund against a payment. Payment ownership verified. |

---

### 4.11 Android Release Center Routes (`/api/android/*`)

| Endpoint | Method | Level | Auth Type | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/android/releases/latest` | `GET` | **LEVEL 1** | Public | No | Gets latest published production APK release metadata. |
| `/api/android/releases` | `GET` | **LEVEL 1** | Public | No | Lists all published Android releases. |
| `/api/android/releases/:id` | `GET` | **LEVEL 1** | Public | No | Gets single release details by ID or version string. |
| `/api/android/releases/:id/download` | `GET` | **LEVEL 1** | Public | No | Streams APK binary artifact with `X-Checksum-SHA256` header. |
| `/api/android/releases/admin/all` | `GET` | **LEVEL 4** | Bearer JWT | No | Lists all releases including drafts & staging builds. Super Admin only. |
| `/api/android/releases` | `POST` | **LEVEL 4** | Bearer JWT | No | Creates and packages a new signed APK release. Super Admin only. |
| `/api/android/releases/:id` | `PUT` | **LEVEL 4** | Bearer JWT | No | Updates release metadata or release notes. Super Admin only. |
| `/api/android/releases/:id/set-latest` | `POST` | **LEVEL 4** | Bearer JWT | No | Marks release as official latest production build. Super Admin only. |
| `/api/android/releases/:id` | `DELETE` | **LEVEL 4** | Bearer JWT | No | Deletes release artifact. Super Admin only. |

---

### 4.12 Super Admin Control Panel Routes (`/api/admin/*`)

| Endpoint | Method | Level | Auth Type | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/admin/metrics` | `GET` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Global system metrics, revenue, merchant list, settings. |
| `/api/admin/overview` | `GET` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Lightweight overview statistics. |
| `/api/admin/operations` | `GET` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Collector device health, active queues, subscription stats. |
| `/api/admin/pilot-telemetry` | `GET` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Phase 6.1 real-device fleet telemetry and audit logs. |
| `/api/admin/merchants/:id/status` | `PATCH` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Block, suspend, or activate merchant account. |
| `/api/admin/review-queue` | `GET` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | List payments in `MANUAL_REVIEW` status. |
| `/api/admin/payments/:id/manual-approve` | `POST` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Force manual approval for flagged payment. |
| `/api/admin/payments/:id/manual-reject` | `POST` | **LEVEL 4** | Bearer JWT | `SUPER_ADMIN`, `ADMIN` | Force manual rejection for flagged payment. |

---

## 5. Security Audit Verification Summary

All endpoints listed above have been audited and verified for:
1. **Proper Authentication Enforcers:** Authentication middlewares (`authenticateJwt`, `authenticateApiKey`, `authenticateDevice`) applied upstream.
2. **Strict Tenant Isolation:** Cross-tenant resource queries enforce `merchantId` matching on database lookups (`$and: [{ id }, { merchantId }]`).
3. **Role Escalation Prevention:** Team invitations and role updates explicitly block non-admins from assigning `SUPER_ADMIN` or `ADMIN` privileges.
4. **Public Route Containment:** Public routes strip sensitive secrets (`secretHash`, `webhookSecret`, `deviceToken`) prior to JSON serialization.
