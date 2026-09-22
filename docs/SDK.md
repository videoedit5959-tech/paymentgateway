# PaySync Official SDK Guide

PaySync maintains official, production-ready client SDKs for Node.js / TypeScript, PHP, and Python.

---

## 1. Node.js / TypeScript SDK

### Installation
```bash
npm install @paysync/node-sdk
```

### Initializing Client
```typescript
import { PaySyncClient } from '@paysync/node-sdk';

const client = new PaySyncClient({
  apiKey: process.env.PAYSYNC_API_KEY!,
  apiSecret: process.env.PAYSYNC_API_SECRET!,
  baseUrl: 'https://api.paysync.io',
});
```

### Creating Payment
```typescript
const payment = await client.createPayment({
  amount: 850.00,
  currency: 'BDT',
  orderId: 'ORD-98210',
  description: 'Pro Subscription',
  customer: {
    name: 'Tamim Iqbal',
    email: 'tamim@example.com',
    phone: '01812345678'
  },
  successUrl: 'https://myshop.com/success',
  cancelUrl: 'https://myshop.com/cancel',
  webhookUrl: 'https://myshop.com/api/webhooks/paysync'
});

console.log('Redirect user to:', payment.checkoutUrl);
```

---

## 2. PHP SDK

### Installation
```bash
composer require paysync/paysync-php
```

### Usage
```php
require_once __DIR__ . '/vendor/autoload.php';

use PaySync\PaySyncClient;

$client = new PaySyncClient(
    getenv('PAYSYNC_API_KEY'),
    getenv('PAYSYNC_API_SECRET'),
    'https://api.paysync.io'
);

$payment = $client->createPayment([
    'amount' => 1200,
    'currency' => 'BDT',
    'orderId' => 'ORD-54321',
    'customer' => [
        'name' => 'Sakib Hasan',
        'phone' => '01712345678'
    ],
    'successUrl' => 'https://mysite.com/payment/success',
    'cancelUrl' => 'https://mysite.com/payment/cancel'
]);

header('Location: ' . $payment['checkoutUrl']);
exit;
```

---

## 3. Python SDK

### Installation
```bash
pip install paysync-python
```

### Usage
```python
import os
from paysync import PaySyncClient

client = PaySyncClient(
    api_key=os.environ["PAYSYNC_API_KEY"],
    api_secret=os.environ["PAYSYNC_API_SECRET"],
    base_url="https://api.paysync.io"
)

payment = client.create_payment({
    "amount": 2500,
    "currency": "BDT",
    "orderId": "INV-1002",
    "customer": {
        "name": "Mushfiqur Rahim",
        "email": "mushy@example.com"
    },
    "successUrl": "https://mysite.com/orders/success"
})

print(f"Checkout URL: {payment['checkoutUrl']}")
```
