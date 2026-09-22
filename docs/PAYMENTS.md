# PaySync Payment Lifecycle & Verification Engine

## 1. Payment State Machine
Every payment in PaySync follows a strictly governed state machine:

```
                  +--------------+
                  |   PENDING    |
                  +--------------+
                    /     |    \
                   /      |     \
 (Matching TrxID) /       |      \ (TTL Expiry)
                 v        | (Cancel) \
         +-----------+    v           v
         | COMPLETED |  +-----------+  +---------+
         +-----------+  | CANCELLED |  | EXPIRED |
                        +-----------+  +---------+
                              |
                     (Manual Dispute)
                              v
                      +---------------+
                      | MANUAL_REVIEW |
                      +---------------+
```

### State Definitions
- **`PENDING`**: Payment session initiated. Customer is redirected to checkout page. Awaiting MFS Send Money / Payment transaction.
- **`COMPLETED`**: Valid TrxID parsed from official SMS or verified by customer. Amount verified and wallet credited.
- **`CANCELLED`**: Cancelled by merchant API or customer.
- **`EXPIRED`**: TTL window (default 15 minutes) lapsed without receipt of valid payment.
- **`MANUAL_REVIEW`**: Flagged by fraud heuristics (e.g. repeated invalid TrxID brute force attempts or amount discrepancy).

---

## 2. Verification Mechanics & Fraud Defense

### 2.1 Double-Spending Lock
To prevent replay of Transaction IDs across multiple payments:
1. Every ingested SMS transaction is indexed with a `unique: true` constraint on `trxId`.
2. When matching occurs, an atomic database transaction marks `used: true` and sets `usedForPaymentId: paymentId`.
3. If a transaction has already been used, the engine rejects further verifications immediately with error code `TRX_ALREADY_USED`.

### 2.2 Amount Matching
- The parsed transaction amount must match the invoice amount.
- Partial payments or overpayments trigger a `MANUAL_REVIEW` state to protect merchant funds.

### 2.3 Brute-Force Rate Limiting
- The engine limits TrxID submission attempts to **6 attempts per 15-minute window** per payment session.
- Exceeding the limit triggers automatic fraud logging and locks the session for manual administrative review.
