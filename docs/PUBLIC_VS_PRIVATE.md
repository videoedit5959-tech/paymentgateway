# PaySync MFS Gateway — Public vs. Private Asset Specification

**Document Version:** 1.0.0  
**Phase:** Phase 6.2 — Route Security, Public Pages & Protected Pages  
**Last Updated:** September 22, 2026  
**Status:** AUDITED & SECURED  

---

## 1. Overview & Information Classification

The PaySync MFS Gateway enforces strict boundaries between **Public Assets** (accessible to end-customers, prospective merchants, and developers) and **Private / Protected Assets** (restricted to authenticated merchant tenants or platform Super Admins).

```
+-----------------------------------------------------------------------+
|                            PUBLIC DOMAIN                              |
|                                                                       |
|  - Landing Page (/)               - Published APK Downloads           |
|  - Hosted Checkout (/checkout)    - Public Branding Assets            |
|  - Interactive API Docs (/docs)   - Health Probes & Status            |
|  - OpenAPI Spec (/openapi.json)   - Subscription Plans Catalog        |
+-----------------------------------------------------------------------+
                                   |
                          STRICT FIREWALL
                                   |
+-----------------------------------------------------------------------+
|                            PRIVATE DOMAIN                             |
|                                                                       |
|  - Merchant Portal (/merchant)    - Super Admin Panel (/admin)        |
|  - API Key Secret Hashes          - Webhook Signing Secrets           |
|  - Android Device Pairing Tokens  - Raw SMS Payload Logs              |
|  - Connected Merchant SIMs        - Internal Audit Trail Logs         |
+-----------------------------------------------------------------------+
```

---

## 2. Comprehensive Classification Matrix

### 2.1 Public Pages & Endpoints

| Resource Path | Type | Purpose | Security Controls & Data Safeguards |
| :--- | :--- | :--- | :--- |
| `/` | Page | Platform Overview | Public marketing page. Zero sensitive data exposed. |
| `/checkout/:paymentId` | Page | Customer Payment UI | Customer enters MFS TrxID. Renders merchant display name, logo, primary color, payment amount, and active wallets only. **No merchant secrets or API keys exposed.** |
| `/docs` | Page | API Documentation | Public integration guide, code examples, and webhook guides. |
| `/android-app` | Page | Release Center | Public Android Collector APK downloads, SHA-256 verification hashes, and installation guides. |
| `/api/health` | API | Health Check | Public system health probe (`status`, `timestamp`, `uptime`, `database`). No internal stack traces or environment variables exposed. |
| `/api/payments/:id` | API | Checkout Metadata | Returns payment session details (`amount`, `currency`, `status`, `expiresAt`, `wallets`). Masks full wallet SIM numbers if configured. |
| `/api/payments/:id/status` | API | Payment Status Polling | Lightweight status check for checkout redirect triggers (`status: "PENDING" | "COMPLETED"`). |
| `/api/payments/:id/verify` | API | Transaction Verification | Customer submits TrxID for automated verification. Rate-limited to 10 attempts per minute to prevent brute-force TrxID harvesting. |
| `/api/billing/plans` | API | Subscription Catalog | Returns public plan options (`Starter`, `Business Growth`, `Enterprise`). |
| `/api/android/releases/latest` | API | APK Metadata | Returns latest published Android app version, release notes, and download URL. |
| `/api/android/releases/:id/download` | API | Binary APK File | Streams signed `.apk` file binary with `X-Checksum-SHA256` header. |
| `/api/v1/openapi.json` | API | OpenAPI 3.0 Spec | Machine-readable API specification for SDK generation. |

---

### 2.2 Private & Protected Pages & Endpoints

| Resource Path | Type | Level | Required Auth | Sensitivity & Protection |
| :--- | :--- | :--- | :--- | :--- |
| `/merchant` | Page | LEVEL 3 | Bearer JWT | Merchant Portal Dashboard. Displays financial metrics, wallet SIM balances, devices, team members, and API keys. |
| `/admin` | Page | LEVEL 4 | Bearer JWT (`SUPER_ADMIN`) | Super Admin Panel. Controls global merchant statuses, system settings, manual review queue, and pilot fleet telemetry. |
| `/api/wallets` | API | LEVEL 3 | Bearer JWT | Contains active merchant MFS SIM numbers, balance snapshots, and associated Android device IDs. |
| `/api/devices` | API | LEVEL 3 | Bearer JWT / Token | Contains Android device hardware IDs, battery levels, network connectivity, and device tokens. |
| `/api/v1/device/sms` | API | LEVEL 3 | Device Token + HMAC | Ingests live SMS text messages. Contains raw customer mobile numbers, transaction amounts, and TrxIDs. Protected via HMAC signature. |
| `/api/api-keys` | API | LEVEL 3 | Bearer JWT | Generates and manages API keys. Secret key is displayed **once** upon creation and stored exclusively as a bcrypt hash. |
| `/api/webhooks` | API | LEVEL 3 | Bearer JWT | Contains webhook endpoint URLs, signing secrets (`whsec_...`), payload history, and delivery failure logs. |
| `/api/admin/*` | API | LEVEL 4 | Bearer JWT (`SUPER_ADMIN`) | System metrics, merchant block/unblock controls, payment manual overrides, pilot telemetry. |

---

## 3. Data Leakage Prevention Guidelines

### 3.1 Unsafe vs. Safe Data Fields

To ensure public endpoints do not expose internal infrastructure or sensitive merchant data, responses follow strict serialization filters:

```
+-----------------------------------------+-----------------------------------------+
|      UNSAFE FIELDS (NEVER PUBLIC)       |       SAFE FIELDS (PUBLIC ALLOWED)      |
+-----------------------------------------+-----------------------------------------+
| - secretHash / bcrypt hashes            | - paymentId / orderId                   |
| - webhookSecret (whsec_...)             | - amount / currency                     |
| - deviceToken (tok_dev_...)             | - status (PENDING/COMPLETED/EXPIRED)    |
| - passwordHash / refreshTokens          | - businessName / logoUrl / primaryColor |
| - raw SMS text strings                  | - wallet provider (BKASH/NAGAD/ROCKET)  |
| - internal database _id ObjectIDs       | - wallet display name                   |
| - MongoDB connection strings / URIs     | - SHA-256 APK checksum hashes           |
+-----------------------------------------+-----------------------------------------+
```

---

## 4. Public Checkout Page Security Controls

The customer-facing hosted checkout page (`/checkout/:paymentId`) is designed to operate safely in a public browser environment:

1. **Identifier Obfuscation:** Checkout sessions use human-readable, non-sequential payment IDs (e.g., `PAY-1726001200-9182`).
2. **Dynamic Expiration:** Payment sessions automatically expire after 30 minutes (`expiresAt`). Expired sessions reject verification attempts.
3. **No Secret Ingestion:** The checkout frontend never receives or requests merchant API keys, webhook secrets, or private credentials.
4. **Branding Isolation:** Public branding (`/api/branding/public/:merchantId`) returns only visual layout styling (logo URL, colors, business name).
5. **Anti Brute-Force Rate Limiting:** Verification attempts on `/api/payments/:id/verify` are rate-limited to prevent automated TrxID guessing attacks.
