# PaySync MFS Gateway — Database Index Audit & Optimization

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Overview & Indexing Philosophy

The PaySync MFS Gateway relies on MongoDB for persistent record keeping, real-time transaction matching, device heartbeat tracking, and multi-tenant isolation. To ensure sub-millisecond query execution and zero full-collection scans under high-throughput SMS ingestion and payment processing, all Mongoose models have been audited and indexed according to access patterns.

### Key Performance Targets
1. **TrxID Deduplication & Matching:** $O(1)$ unique lookup on `(provider, walletId, trxId)` and `messageHash`.
2. **Tenant Isolation:** $O(\log N)$ indexed query path filtering by `merchantId` on every resource query.
3. **Replay Protection:** $O(1)$ lookup on `(deviceId, nonce)` compound index with automatic TTL expiration.
4. **Heartbeat & Watchdog Queries:** Efficient index scans on `(status, lastSeenAt)` for device connectivity monitoring.

---

## 2. Complete Index Inventory by Collection

### A. Users Collection (`users`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ email: 1 }` | Single Field | **Yes** | Authentication lookup & user uniqueness |
| `{ merchantId: 1 }` | Single Field | No | Querying team members belonging to a merchant tenant |

---

### B. Merchants Collection (`merchants`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ email: 1 }` | Single Field | **Yes** | Merchant registration & owner lookup |

---

### C. Wallets Collection (`wallets`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ merchantId: 1 }` | Single Field | No | Fetching wallets by merchant |
| `{ merchantId: 1, provider: 1, walletNumber: 1 }` | Compound | **Yes** | Prevents duplicate wallet numbers per provider per merchant |

---

### D. Devices Collection (`devices`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ deviceId: 1 }` | Single Field | **Yes** | Android Collector authentication and heartbeat updates |
| `{ merchantId: 1 }` | Single Field | No | Fetching devices associated with a merchant |
| `{ pairingToken: 1 }` | Single Field | No | Fast QR pairing token resolution during setup |

---

### E. Transactions Collection (`transactions`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ provider: 1, walletId: 1, trxId: 1 }` | Compound | **Yes** | Strict double-spending prevention per provider & wallet |
| `{ messageHash: 1 }` | Single Field | **Yes** | Replay defense preventing re-ingestion of identical SMS payloads |
| `{ merchantId: 1, createdAt: -1 }` | Compound | No | High-speed paginated merchant transaction history |
| `{ trxId: 1 }` | Single Field | No | Quick TrxID matching during payment verification |
| `{ reference: 1 }` | Single Field | No | Reference matching during automated reconciliation |
| `{ used: 1 }` | Single Field | No | Rapid filtering for unverified/unused transactions |

---

### F. Payments Collection (`payments`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ paymentId: 1 }` | Single Field | **Yes** | Primary hosted checkout session lookup (`ps_pay_...`) |
| `{ merchantId: 1, createdAt: -1 }` | Compound | No | Merchant dashboard payment history list |
| `{ status: 1, expiresAt: 1 }` | Compound | No | Automated background worker for expiring unpaid payments |
| `{ invoiceId: 1 }` | Single Field | No | Merchant invoice reference lookup |

---

### G. API Keys Collection (`apikeys`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ keyPrefix: 1 }` | Single Field | **Yes** | Fast $O(1)$ API key identification during request authentication |
| `{ merchantId: 1 }` | Single Field | No | Listing merchant API keys |

---

### H. Device Nonces Collection (`devicenonces`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ deviceId: 1, nonce: 1 }` | Compound | **Yes** | Strict Android Collector replay attack prevention |
| `{ createdAt: 1 }` | TTL Index | No | **Automatic 10-minute expiration** (`expireAfterSeconds: 600`) |

---

### I. Webhook Logs Collection (`webhooklogs`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ merchantId: 1, createdAt: -1 }` | Compound | No | Merchant webhook delivery history |
| `{ status: 1, attempts: 1, nextAttemptAt: 1 }` | Compound | No | Background Webhook Retry Worker dispatch queue |

---

### J. Subscriptions Collection (`subscriptions`)
| Index Specs | Index Type | Unique | Purpose |
| :--- | :---: | :---: | :--- |
| `{ merchantId: 1 }` | Single Field | **Yes** | Active merchant subscription lookup |
| `{ status: 1, currentPeriodEnd: 1 }` | Compound | No | Automated subscription billing renewal & grace period processor |

---

## 3. Production Index Verification Script

Run the following Mongoose script after deploying to Staging/Production to verify that all indexes are built properly:

```typescript
import mongoose from 'mongoose';

async function verifyIndexes() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const indexes = await mongoose.connection.db.collection(col.name).indexes();
    console.log(`Collection [${col.name}] Indexes:`, JSON.stringify(indexes, null, 2));
  }
}
```
