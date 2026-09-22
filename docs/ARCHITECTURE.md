# PaySync Architecture Specification

## 1. System Overview
PaySync is a distributed, high-throughput Mobile Financial Services (MFS) payment gateway engineered specifically for Bangladesh's payments ecosystem (bKash, Nagad, Rocket, Upay).

```
+--------------------------------------------------------------------------------+
|                                MERCHANT SYSTEMS                                |
|  (E-Commerce, Subscriptions, Mobile Apps, POS, SaaS Platforms)                 |
+--------------------------------------------------------------------------------+
          |                                                   ^
          | REST API (v1)                                     | Webhook (HMAC-SHA256)
          v                                                   |
+--------------------------------------------------------------------------------+
|                         REVERSE PROXY / NGINX / TLS                            |
|       (DDoS Mitigation, SSL Offloading, Security Headers, Rate Limiting)       |
+--------------------------------------------------------------------------------+
          |
          v
+--------------------------------------------------------------------------------+
|                           PAYSYNC GATEWAY CORE ENGINE                          |
|                                                                                |
|  +--------------------+  +----------------------+  +------------------------+  |
|  | Authentication     |  | Payment Lifecycle    |  | Hosted Checkout        |  |
|  | - API Key (Prefix) |  | - Idempotency Lock   |  | - Dynamic QR Codes     |  |
|  | - Secret (Bcrypt)  |  | - TTL Auto-Expiry    |  | - USSD Step Guide      |  |
|  | - JWT Session Auth |  | - State Transitions  |  | - Real-time Polling    |  |
|  +--------------------+  +----------------------+  +------------------------+  |
|                                                                                |
|  +--------------------+  +----------------------+  +------------------------+  |
|  | SMS Parser Engine  |  | Verification Engine  |  | Webhook Dispatcher     |  |
|  | - Regex Matchers   |  | - Atomic TrxID Lock  |  | - Exponential Backoff  |  |
|  | - Provider Filter  |  | - Amount Validation  |  | - Signature Header     |  |
|  | - SHA-256 Hashes   |  | - Fraud Guard Rules  |  | - Dead-letter Queue    |  |
|  +--------------------+  +----------------------+  +------------------------+  |
+--------------------------------------------------------------------------------+
       |                         |                              ^
       | Persistence             | Pair & Ingestion             | SMS Notifications
       v                         v                              |
+--------------------+   +---------------------+   +-----------------------------+
| MONGO REPLICA SET  |   | REDIS DISTRIBUTED   |   | ANDROID COLLECTOR NODES     |
| - Payments         |   | - Idempotency Cache |   | - Background Service        |
| - Transactions     |   | - Rate Limiters     |   | - SMS Broadcast Receiver    |
| - Merchants & Keys |   | - Pub/Sub Locks     |   | - Hardware Keystore (HMAC)  |
| - Audit & Logs     |   | - Replay Nonces     |   | - Dual-SIM Device Support   |
+--------------------+   +---------------------+   +-----------------------------+
```

## 2. Core Subsystems

### 2.1 API & Lifecycle Engine
- **Idempotent Requests**: Enforces `Idempotency-Key` headers across transaction initiation endpoints to prevent duplicate sessions.
- **Dynamic Payment Sessions**: Generates unique `paymentId` values with configurable TTL timeouts (default 15 minutes).
- **State Machine**: Guaranteed forward-only transitions (`PENDING` -> `COMPLETED` | `CANCELLED` | `EXPIRED` | `MANUAL_REVIEW`).

### 2.2 SMS Ingestion & Android Collector Network
- Android nodes run an unkillable foreground service monitoring incoming SMS from official MFS Shortcodes: `bKash`, `16216` (Nagad), `16216` (Rocket), `Upay`.
- Messages are hashed with `SHA-256(deviceId:timestamp:sender:body)` and signed using HMAC-SHA256 with the device secret token.
- Ingestion endpoint validates device token, verifies HMAC signature, checks timestamp skew (<= 300s), and rejects duplicate message hashes (replay attack defense).

### 2.3 Verification Engine
- **Regex Parsing**: Normalized regex engines extract `trxId`, `amount`, `senderNumber`, and `timestamp` from raw SMS.
- **Double-Spending Prevention**: Enforces database unique index on `trxId`. Transactions already marked `used: true` are immediately rejected.
- **Amount & Provider Matching**: Confirms incoming transaction amount matches the requested invoice amount within acceptable tolerances.
- **Atomic State Updates**: Executes atomic `findOneAndUpdate` operations so that concurrent verification requests cannot execute multiple times.

### 2.4 Webhook Delivery Engine
- Dispatches signed webhook events (`payment.created`, `payment.completed`, `payment.cancelled`, `payment.expired`, `transaction.ingested`).
- Signature header `X-PaySync-Signature: t={timestamp},v1={hmac}` prevents man-in-the-middle manipulation.
- Retry policy: 5 exponential retries (`10s`, `30s`, `2m`, `10m`, `1h`) with dead-letter queue logging for merchant visibility.
