# PaySync v1 REST API Reference

Base URL: `https://api.paysync.io/api/v1` (or your private domain)

All API requests must include standard authentication headers. All responses are returned as structured JSON objects containing `success`, `data`, `message`, and `requestId`.

---

## 1. Authentication Headers
| Header | Type | Description |
|---|---|---|
| `X-API-Key` | String (Required) | Your merchant public key prefix (e.g., `ps_live_a1b2c3d4` or `ps_test_x9y8z7`) |
| `X-API-Secret` | String (Required in Prod) | Your secret key (e.g., `ps_live_sec_99a8b7...`) |
| `Idempotency-Key` | String (Optional) | Unique UUID or client-side string to guarantee safe request retries |

---

## 2. Endpoints Catalog

### 2.1 Create Payment Session
`POST /payments/create`

Initiates an idempotent payment checkout session for a customer.

**Request Body:**
```json
{
  "amount": 1450.00,
  "currency": "BDT",
  "orderId": "ORD-2026-90214",
  "description": "Nike Air Max Sports Shoes",
  "customer": {
    "name": "Arif Ahmed",
    "email": "arif@example.com",
    "phone": "01712345678"
  },
  "successUrl": "https://myshop.com/orders/success?order=ORD-2026-90214",
  "cancelUrl": "https://myshop.com/orders/cancel?order=ORD-2026-90214",
  "webhookUrl": "https://myshop.com/api/webhooks/paysync",
  "metadata": {
    "cartId": "cart_9921",
    "discountCode": "PROMO10"
  }
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "orderId": "ORD-2026-90214",
    "amount": 1450,
    "currency": "BDT",
    "status": "PENDING",
    "checkoutUrl": "https://gateway.paysync.io/checkout?id=pay_98a72b81fa9",
    "expiresAt": "2026-09-22T10:30:00.000Z",
    "createdAt": "2026-09-22T10:15:00.000Z"
  },
  "message": "Payment session created successfully.",
  "requestId": "req_1727001234_abc"
}
```

---

### 2.2 Retrieve Payment
`GET /payments/:paymentId`

Returns the full sanitized details of a payment session.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "orderId": "ORD-2026-90214",
    "amount": 1450,
    "currency": "BDT",
    "status": "COMPLETED",
    "description": "Nike Air Max Sports Shoes",
    "customer": {
      "name": "Arif Ahmed",
      "email": "arif@example.com",
      "phone": "01712345678"
    },
    "checkoutUrl": "https://gateway.paysync.io/checkout?id=pay_98a72b81fa9",
    "transaction": {
      "trxId": "9JH28AK91L",
      "matchedAt": "2026-09-22T10:18:22.000Z"
    },
    "timestamps": {
      "createdAt": "2026-09-22T10:15:00.000Z",
      "expiresAt": "2026-09-22T10:30:00.000Z",
      "completedAt": "2026-09-22T10:18:22.000Z"
    }
  },
  "requestId": "req_1727001290_def"
}
```

---

### 2.3 Get Payment Status (Polling)
`GET /payments/:paymentId/status`

Lightweight endpoint optimized for high-frequency frontend polling.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "orderId": "ORD-2026-90214",
    "amount": 1450,
    "currency": "BDT",
    "status": "COMPLETED",
    "timestamps": {
      "createdAt": "2026-09-22T10:15:00.000Z",
      "expiresAt": "2026-09-22T10:30:00.000Z",
      "completedAt": "2026-09-22T10:18:22.000Z"
    },
    "transaction": {
      "trxId": "9JH28AK91L"
    }
  },
  "requestId": "req_1727001300_ghi"
}
```

---

### 2.4 Verify Payment TrxID
`POST /payments/:paymentId/verify`

Programmatically verifies a customer-submitted TrxID.

**Request Body:**
```json
{
  "trxId": "9JH28AK91L"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "status": "COMPLETED",
    "transaction": {
      "trxId": "9JH28AK91L",
      "provider": "BKASH",
      "amount": 1450
    }
  },
  "message": "Payment verified successfully.",
  "requestId": "req_1727001320_jkl"
}
```

---

### 2.5 Cancel Payment
`POST /payments/:paymentId/cancel`

Cancels a pending checkout session.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "status": "CANCELLED"
  },
  "message": "Payment session has been cancelled.",
  "requestId": "req_1727001340_mno"
}
```

---

### 2.6 List Transactions
`GET /transactions?limit=50&provider=BKASH&status=CONFIRMED`

Returns a list of transactions processed for your merchant account.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "trx_68a912c",
      "trxId": "9JH28AK91L",
      "provider": "BKASH",
      "amount": 1450,
      "currency": "BDT",
      "status": "CONFIRMED",
      "used": true,
      "usedForPaymentId": "pay_98a72b81fa9",
      "timestamp": "2026-09-22T10:18:20.000Z",
      "createdAt": "2026-09-22T10:18:21.000Z"
    }
  ],
  "requestId": "req_1727001350_pqr"
}
```

---

### 2.7 OpenAPI Spec
`GET /openapi.json`

Returns the official OpenAPI 3.0.3 specification in JSON format.
