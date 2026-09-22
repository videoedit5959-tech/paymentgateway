# PaySync MFS Gateway — Authorization Architecture & RBAC Model

**Document Version:** 1.0.0  
**Phase:** Phase 6.2 — Route Security, Public Pages & Protected Pages  
**Last Updated:** September 22, 2026  
**Status:** AUDITED & SECURED  

---

## 1. Overview & Security Philosophy

The PaySync MFS Gateway authorization architecture is engineered around three fundamental tenets:

1. **Server-Authoritative Control:** Client-side UI controls are for presentation only. All permission checks, role checks, and tenant isolation constraints are executed strictly on the server (`/server/middleware/auth.ts`).
2. **Strict Multi-Tenant Isolation:** Every merchant data resource (wallets, devices, payments, transactions, API keys, webhooks, support tickets, custom domains, white-label branding, team invitations) is irrevocably bound to a unique `merchantId`. Cross-tenant queries are blocked at the repository layer.
3. **Least Privilege Principle:** Every role possesses only the minimum set of permissions required to fulfill its operational function.

---

## 2. Role-Based Access Control (RBAC) Hierarchy

PaySync defines 8 distinct user roles grouped into two primary domains: **Platform Administration** and **Merchant Tenant Operations**.

```
                           +------------------------+
                           |      SUPER_ADMIN       |  (Level 4)
                           +------------------------+
                                       |
                           +------------------------+
                           |         ADMIN          |  (Level 4)
                           +------------------------+
                                       |
       +-------------------------------+-------------------------------+
       |                               |                               |
+--------------+               +--------------+               +--------------+
|MERCHANT_OWNER| (Level 3)     |MERCHANT_ADMIN| (Level 3)     |MERCHANT_FINANCE|(Level 3)
+--------------+               +--------------+               +--------------+
       |                               |                               |
+----------------+             +----------------+             +--------------+
|MERCHANT_DEVELOP| (Level 3)   | MERCHANT_STAFF | (Level 3)   |MERCHANT_VIEWER|(Level 3)
+----------------+             +----------------+             +--------------+
```

---

### 2.1 Role Matrix & Capabilities

| Role Name | Scope | Capabilities | Access Level |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Global Platform | Full system control. Manage merchants, system configuration, global billing, manual payment override, pilot fleet telemetry, and Android APK releases. | **LEVEL 4** |
| `ADMIN` | Global Operations | Operations management, fraud review queue, merchant status toggles, support escalation. | **LEVEL 4** |
| `MERCHANT_OWNER` | Single Tenant | Full merchant tenant authority. Manage wallets, devices, team members, billing, custom domains, API keys, and white-label branding. | **LEVEL 3** |
| `MERCHANT_ADMIN` | Single Tenant | Full operational control of merchant tenant, excluding owner transfer. | **LEVEL 3** |
| `MERCHANT_FINANCE` | Single Tenant | Manage payments, wallets, billing invoices, manual refunds, and financial reporting. Cannot alter API keys or devices. | **LEVEL 3** |
| `MERCHANT_DEVELOPER` | Single Tenant | Manage API keys, webhook URLs, test webhook pings, integration logs, and developer documentation. | **LEVEL 3** |
| `MERCHANT_STAFF` | Single Tenant | View payments, verify customer transactions, submit support tickets, manage connected SIM collector devices. | **LEVEL 3** |
| `MERCHANT_VIEWER` | Single Tenant | Read-only access to transaction history, payments, and analytics. Cannot perform mutations. | **LEVEL 3** |

---

## 3. Server-Side Authentication & Authorization Middlewares

All API routes in `/server/routes/` utilize Express middlewares defined in `/server/middleware/auth.ts`:

### 3.1 `authenticateJwt(req, res, next)`
- **Function:** Validates the HTTP `Authorization: Bearer <token>` header against the server `JWT_ACCESS_SECRET`.
- **Session Injection:** Attaches `req.user` (containing `id`, `email`, `role`, `merchantId`) and `req.merchantId` directly to the request context.
- **Error Response:** Returns `401 AUTH_REQUIRED` if the header is missing or invalid; returns `401 TOKEN_EXPIRED` if the token timestamp has elapsed.

```ts
// Example: Attaching user and merchantId to context
req.user = decodedUser;
req.merchantId = decodedUser.merchantId;
```

### 3.2 `requireRole(...allowedRoles)`
- **Function:** Enforces role-based authorization rules.
- **Behavior:** Checks whether `req.user.role` matches one of the specified `allowedRoles`.
- **Error Response:** Returns `403 FORBIDDEN` if the user's role is not authorized.

```ts
// Example: Restricting endpoint to Super Admin
router.get('/metrics', authenticateJwt, requireRole('SUPER_ADMIN', 'ADMIN'), handler);
```

### 3.3 `authenticateMerchant(req, res, next)`
- **Function:** Enforces that the requesting user is authenticated **and** belongs to an active merchant tenant (`req.user.merchantId` must exist).
- **Behavior:** Rejects unauthenticated callers (`401`) or users without a merchant association (`403 NO_MERCHANT_ASSOCIATED`).

### 3.4 `authenticateApiKey(req, res, next)`
- **Function:** Authenticates external API integration requests via HTTP headers:
  - `X-API-Key: ps_live_...`
  - `X-API-Secret: sec_live_...`
- **Validation:** Matches `keyPrefix`, computes HMAC/bcrypt verification of `secretHash`, verifies that the key status is `ACTIVE`, and attaches `req.apiKey` and `req.merchantId`.

### 3.5 `authenticateDevice(req, res, next)`
- **Function:** Authenticates Android SMS Collector devices via headers:
  - `X-Device-ID: dev_...`
  - `X-Device-Token: tok_dev_...`
- **Validation:** Lookups device record in database, verifies `deviceToken`, ensures device status is `ONLINE` or `PAIRED`, and injects `req.deviceId` and `req.merchantId`.

---

## 4. Multi-Tenant Isolation Architecture

To prevent **Insecure Direct Object Reference (IDOR)** or **Broken Object Level Authorization (BOLA)** vulnerabilities, tenant isolation is enforced at the repository query level.

### 4.1 Tenant Scoping Pattern

Every database read, update, or deletion operation for a merchant resource requires matching the session's `merchantId`:

```ts
// CORRECT — Enforcing tenant isolation
const wallet = await WalletModel.findOne({
  id: walletId,
  merchantId: req.merchantId // Injected by middleware from JWT or API Key
});

if (!wallet) {
  return sendError(res, 'NOT_FOUND', 'Wallet not found or access denied.', 404);
}
```

### 4.2 Anti-IDOR Check in Mutations

When updating resources by unique ID (e.g. `/api/api-keys/:id/status`, `/api/refunds`), the handler first fetches the resource and validates that `resource.merchantId === req.merchantId` (unless caller is `SUPER_ADMIN`).

```ts
const keyDoc = await Repository.getApiKeyById(id);
if (!keyDoc) {
  return sendError(res, 'NOT_FOUND', 'Resource not found.', 404);
}

const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
if (!isSuperOrAdmin && keyDoc.merchantId !== req.merchantId) {
  return sendError(res, 'FORBIDDEN', 'Access denied to this merchant resource.', 403);
}
```

---

## 5. Android Device HMAC Authentication & Anti-Replay Security

Real Android SMS Collector devices transmit sensitive incoming financial SMS logs via `/api/v1/device/sms`. This route is protected by a multi-layered security protocol:

```
+------------------+                                +-------------------+
|  Android Device  | -- 1. Device Token ----------->| PaySync Gateway   |
|  Collector       | -- 2. Timestamp & Nonce ------>| Ingestion Engine  |
|                  | -- 3. HMAC-SHA256 Signature -->|                   |
+------------------+                                +-------------------+
```

1. **Device Identification:** `X-Device-ID` and `X-Device-Token` verify device identity.
2. **Clock Skew Protection:** `X-Timestamp` must be within **300 seconds (5 minutes)** of the server clock to mitigate time-drift attacks.
3. **Nonce Replay Protection:** `X-Nonce` (UUIDv4) is recorded in cache. Duplicate nonces within a 15-minute window are rejected with `401 DUPLICATE_NONCE`.
4. **HMAC-SHA256 Payload Integrity:** `X-Signature` is computed over `timestamp + nonce + rawBody` using the device secret. Re-computed on server and matched in constant time (`crypto.timingSafeEqual`).

---

## 6. Role Escalation Prevention Rules

To prevent privilege escalation attacks:

1. **Forbidden Administrative Elevation:** No merchant role (`MERCHANT_OWNER`, `MERCHANT_ADMIN`) can create or promote accounts to `SUPER_ADMIN` or `ADMIN`.
2. **Team Member Invitation Controls:** `/api/team/invite` explicitly rejects invitation attempts where `role === 'SUPER_ADMIN'` or `role === 'ADMIN'`.
3. **Owner Transfer Guarding:** Changing merchant ownership requires current `MERCHANT_OWNER` authentication plus step-up verification.
4. **API Key Permission Ceiling:** API Keys inherit only the permissions of the merchant account mode (`live` or `test`). API keys cannot perform user management or administrative overrides.
