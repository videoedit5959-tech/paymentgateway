# PaySync Security & Compliance Architecture

PaySync is designed with defense-in-depth security principles to handle sensitive financial notifications and high-volume transaction verifications.

---

## 1. Authentication & Cryptography
- **API Secret Storage**: Merchant API secrets are hashed using `bcrypt` (10 rounds). Raw secrets are never persisted or logged in plain text.
- **Device Authentication**: Android collector nodes authenticate using unique HMAC-SHA256 device tokens with replay protection nonces.
- **Webhook Integrity**: Outbound webhooks include timestamped HMAC-SHA256 signatures (`X-PaySync-Signature`) to verify authenticity.
- **JWT Protection**: Web dashboard sessions use cryptographically signed JWT tokens with 1-hour expiration and 7-day refresh tokens.

---

## 2. Injection & OWASP Top 10 Defenses
- **Input Sanitization**: All incoming request parameters undergo recursive recursive sanitization stripping HTML/script injections.
- **NoSQL Injection Prevention**: Mongoose and parameterized repository queries prevent MongoDB query operator injection attacks.
- **Rate Limiting**: Multi-tiered rate limiters applied at IP, API key, device, and route levels.
- **Replay Attack Defense**: Replay protection middleware rejects reused nonces and timestamps skewed by > 300 seconds.

---

## 3. Double-Spending & Race Condition Locks
- **Atomic MongoDB Operations**: Payments and transaction verification use atomic `findOneAndUpdate` queries ensuring that concurrent requests cannot match the same Transaction ID twice.
- **Database Unique Constraints**: `trxId` carries a database-level unique index.

---

## 4. Audit Logging & Compliance
- Full immutable audit logs recorded for every administrative action, API key generation/rotation, wallet modification, and role update.
- Every audit entry stores the actor ID, actor email, IP address, timestamp, resource type, and unique correlation `requestId`.
