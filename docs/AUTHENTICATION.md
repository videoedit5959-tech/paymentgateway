# PaySync Authentication Guide

PaySync supports three robust authentication paradigms depending on your integration tier.

---

## 1. API Key & Secret Authentication (Server-to-Server)

The primary method for merchant backend systems to communicate with the PaySync v1 REST API.

### Headers
```http
X-API-Key: ps_live_99a8b7c6
X-API-Secret: ps_live_sec_11002233445566778899aabb
```

### Prefix Conventions
- **Live Mode**: `ps_live_...` (Affects real bank accounts and wallets)
- **Test Mode**: `ps_test_...` (Simulated sandbox payments for testing)

### Secret Security Rules
- **Never expose API secrets on the client side** (React, Android client, iOS app, browser).
- Store API keys in server environment variables or encrypted secrets managers (e.g. AWS Secrets Manager, GCP Secret Manager, Vault).
- If your secret is compromised, immediately rotate the key from the PaySync Merchant Portal (`/api/api-keys/:id/rotate`).

---

## 2. JWT Authentication (Merchant Dashboard & Web Portal)

Used for browser-based interactive sessions and dashboard operations.

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

- Access tokens are signed using HMAC-SHA256 and expire in 1 hour.
- Refresh tokens can be exchanged at `POST /api/auth/refresh`.

---

## 3. Webhook HMAC-SHA256 Signatures

PaySync cryptographically signs all outbound webhook notifications using your merchant Webhook Secret.

### Header Format
```http
X-PaySync-Signature: t=1727001234,v1=9f8a3c2b1e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a
```

### Signature Verification Algorithm
1. Extract the timestamp `t` and signature `v1` from the `X-PaySync-Signature` header.
2. Form the signature payload: `t + "." + rawBody` (where `rawBody` is the exact UTF-8 byte stream received).
3. Compute `HMAC-SHA256(signaturePayload, webhookSecret)`.
4. Compare the computed hex digest against `v1` using a constant-time comparison (`timingSafeEqual`).
5. Ensure `abs(currentTime - t) <= 300` seconds to reject replay attacks.
