# PaySync Webhook Delivery & Verification Guide

Webhooks allow PaySync to notify your application when asynchronous events occur (e.g. customer completes payment via MFS app).

---

## 1. Supported Webhook Events
| Event Name | Trigger Description |
|---|---|
| `payment.created` | New checkout session created |
| `payment.completed` | Payment verified and confirmed (credit granted) |
| `payment.cancelled` | Payment cancelled by merchant or user |
| `payment.expired` | Payment expired after TTL elapsed |
| `transaction.ingested` | Raw SMS received and parsed from collector |

---

## 2. Webhook Payload Structure
```json
{
  "event": "payment.completed",
  "data": {
    "paymentId": "pay_98a72b81fa9",
    "orderId": "ORD-2026-90214",
    "amount": 1450.00,
    "currency": "BDT",
    "status": "COMPLETED",
    "transaction": {
      "trxId": "9JH28AK91L",
      "provider": "BKASH",
      "amount": 1450.00
    },
    "customer": {
      "name": "Arif Ahmed",
      "email": "arif@example.com",
      "phone": "01712345678"
    },
    "metadata": {
      "cartId": "cart_9921"
    }
  },
  "timestamp": "2026-09-22T10:18:22.000Z",
  "requestId": "wh_1727001999_xyz"
}
```

---

## 3. Webhook Delivery & Retry Policy
- **HTTP Timeout**: 10 seconds per attempt.
- **Success Criteria**: PaySync considers delivery successful when your endpoint returns HTTP `200`, `201`, `202`, or `204`.
- **Exponential Retry Schedule**:
  - Attempt 1: Immediate
  - Attempt 2: 10 seconds after failure
  - Attempt 3: 30 seconds after failure
  - Attempt 4: 2 minutes after failure
  - Attempt 5: 10 minutes after failure
  - Attempt 6: 1 hour after failure
- **Dead-Letter Queue**: After 6 consecutive failed attempts, the webhook is marked `FAILED` in the dashboard with the exact HTTP error code and response body for merchant debugging.

---

## 4. Verification in SDKs

### Node.js / TypeScript:
```typescript
import { PaySyncClient } from '@paysync/node-sdk';

const isValid = PaySyncClient.verifyWebhookSignature(
  req.rawBody,
  req.headers['x-paysync-signature'],
  process.env.PAYSYNC_WEBHOOK_SECRET
);
```

### PHP:
```php
use PaySync\PaySyncClient;

$isValid = PaySyncClient::verifyWebhookSignature(
  file_get_contents('php://input'),
  $_SERVER['HTTP_X_PAYSYNC_SIGNATURE'],
  getenv('PAYSYNC_WEBHOOK_SECRET')
);
```

### Python:
```python
from paysync import PaySyncClient

is_valid = PaySyncClient.verify_webhook_signature(
  request.get_data(as_text=True),
  request.headers.get("X-PaySync-Signature"),
  os.getenv("PAYSYNC_WEBHOOK_SECRET")
)
```
