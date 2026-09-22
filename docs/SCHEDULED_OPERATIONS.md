# PaySync MFS Gateway — Scheduled Operations & Background Workers

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Architectural Strategy

The PaySync MFS Gateway performs asynchronous background operations (such as webhook retries, device health watchdog checks, payment session TTL expiry, and subscription renewal checks) without relying on heavy external queue infrastructure (such as Redis, BullMQ, Kafka, or RabbitMQ). 

All scheduled tasks are implemented as **in-process cron loops** backed by MongoDB atomic updates (`findOneAndUpdate`, atomic status transitions, and lease timestamps) ensuring safe execution, strict idempotency, and clean failure recovery.

---

## 2. Complete Scheduled Operations Inventory

### Task 1: Webhook Retry Dispatch Worker
- **Purpose:** Automatically retries failed webhook event deliveries to merchant endpoints with exponential backoff.
- **Frequency:** Runs every **60 seconds** (`60000ms`).
- **Execution Mechanism:** Node.js interval loop in `server/services/webhookService.ts` calling `WebhookService.startRetryWorker()`.
- **Query Filter:** `WebhookLogModel.find({ status: 'FAILED', attempts: { $lt: 5 }, nextAttemptAt: { $lte: new Date() } })`.
- **Idempotency & Concurrency:** Each webhook log entry is locked using an atomic status transition (`status: 'PROCESSING'`). If another instance picks up the worker, `attempts` increment prevents duplicate processing.
- **Failure Recovery:** Exponential backoff delays next attempt (`2^attempt * 60s`). Max attempts = 5. After 5 failures, status shifts to `PERMANENTLY_FAILED` and alerts merchant dashboard.

---

### Task 2: Android Collector Health Watchdog
- **Purpose:** Detects Android Collector devices that have stopped sending 30-second keepalive heartbeats and marks them `OFFLINE`.
- **Frequency:** Runs every **45 seconds** (`45000ms`).
- **Execution Mechanism:** Node.js interval loop in `server.ts`.
- **Query Filter:** Updates `DeviceModel` where `lastSeenAt < (NOW - 90 seconds)` and `status == 'ONLINE'`.
- **Idempotency:** Atomic bulk update `updateMany({ status: 'ONLINE', lastSeenAt: { $lt: threshold } }, { $set: { status: 'OFFLINE' } })`.
- **Failure Recovery:** When the Android phone reconnects and sends a valid signed heartbeat (`POST /api/v1/device/heartbeat`), its status immediately reverts to `ONLINE`.

---

### Task 3: Unpaid Payment Expiration Engine
- **Purpose:** Expire hosted checkout payment sessions whose TTL timer (`expiresAt`) has passed without verified SMS matching.
- **Frequency:** Evaluated lazily on payment status queries and swept globally every **5 minutes**.
- **Execution Mechanism:** Background worker in `server/routes/payments.ts` / `Repository.expireOldPayments()`.
- **Query Filter:** `PaymentModel.find({ status: 'PENDING', expiresAt: { $lte: new Date() } })`.
- **Idempotency:** Atomic `findOneAndUpdate` setting status from `PENDING` -> `EXPIRED`. If the payment was already completed or cancelled, state transition fails atomically.
- **Failure Recovery:** Idempotent sweep guarantees no payment remains stuck in `PENDING` indefinitely.

---

### Task 4: QR Pairing Token TTL Expiration
- **Purpose:** Invalidate Android QR pairing setup tokens after their 10-minute validity window.
- **Frequency:** Evaluated upon pairing attempt (`POST /api/v1/device/pair`) and cleared periodically.
- **Execution Mechanism:** In-memory / MongoDB timestamp check verifying `pairingTokenExpiresAt > NOW`.
- **Idempotency:** Token validation rejects expired timestamps deterministically.
- **Failure Recovery:** Merchant simply regenerates a new QR pairing code from the Merchant Portal.

---

### Task 5: Subscription Billing & Grace Period Watchdog
- **Purpose:** Check active merchant subscriptions nearing period end, process renewals, and enforce grace period downgrades.
- **Frequency:** Runs daily at midnight (`00:00 UTC`).
- **Execution Mechanism:** Subscription service job in `server/routes/billing.ts`.
- **Idempotency:** Compares `currentPeriodEnd` against current date and checks `status`. Updates `status: 'PAST_DUE'` or `'EXPIRED'` atomically.
- **Failure Recovery:** Merchants receive email notifications and dashboard warnings to update payment methods before service downgrade occurs.

---

## 3. Operations Monitoring Matrix

| Operation | Target Latency | Max Execution Time | Error Log Tag |
| :--- | :---: | :---: | :--- |
| Webhook Retry Worker | < 500ms | 10 seconds | `[WEBHOOK_RETRY_ERROR]` |
| Collector Watchdog | < 100ms | 2 seconds | `[WATCHDOG_ERROR]` |
| Payment Expire Sweep | < 200ms | 5 seconds | `[PAYMENT_EXPIRE_ERROR]` |
