# PaySync MFS Gateway — Staging Test Plan & Verification Matrix

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Objectives & Testing Scope

The Staging Test Plan provides end-to-end verification of all PaySync subsystems on a staging environment prior to controlled merchant pilot onboarding. Testing must be conducted using a physical Android device running the Staging Collector APK.

---

## 2. Comprehensive Test Execution Matrix

| Test Suite | Test Case ID | Test Scenario | Expected Result | Pass Criteria |
| :--- | :---: | :--- | :--- | :---: |
| **Auth** | `AUTH-01` | Merchant Registration & Login | JWT access token returned; user stored in `users` collection. | HTTP 200 |
| **Auth** | `AUTH-02` | Session Refresh with Refresh Token | New 1-hour access token issued without requiring password. | HTTP 200 |
| **Auth** | `AUTH-03` | Access Admin Panel as Merchant User | Render 403 Forbidden Access Denied view. | HTTP 403 |
| **Merchant** | `MERCH-01` | Create MFS Wallet (`BKASH` / `NAGAD`) | Wallet stored under merchant ID; verified status active. | HTTP 201 |
| **Merchant** | `MERCH-02` | Generate Live API Keys (`ps_live_...`) | Secret returned once; bcrypt hash saved in DB. | HTTP 201 |
| **Merchant** | `MERCH-03` | Rotate API Key Secret | Old secret revoked; new secret returned. | HTTP 200 |
| **Admin** | `ADMIN-01` | Super Admin Login & Dashboard Overview | Fleet status, telemetry, metrics rendered. | HTTP 200 |
| **Admin** | `ADMIN-02` | View Real-Device Fleet Telemetry | Live battery level, charging status, SIM status visible. | HTTP 200 |
| **Checkout** | `CHK-01` | Create Payment Session via API v1 | `paymentId` (`ps_pay_...`) returned with expiry TTL. | HTTP 201 |
| **Checkout** | `CHK-02` | Customer Access Checkout UI | Hosted page displays bKash/Nagad options, QR, timer. | HTTP 200 |
| **Checkout** | `CHK-03` | Manual Payment Verification via TrxID | Customer inputs TrxID; matches ingested transaction. | HTTP 200 |
| **Android** | `AND-01` | QR Pairing with Staging Collector | Device paired; `deviceId` & token generated. | HTTP 200 |
| **Android** | `AND-02` | 30-Second Heartbeat Ping | Device status updated to `ONLINE`; battery level logged. | HTTP 200 |
| **Android** | `AND-03` | Ingest Real bKash SMS with Bengali Digits | Bengali numerals normalized; transaction saved. | HTTP 201 |
| **Android** | `AND-04` | Offline SMS Queue Recovery | Device loses internet, queues SMS, drains upon reconnect. | HTTP 200 |
| **Webhook** | `WHK-01` | Dispatch Event on Payment Completion | HMAC-SHA256 signature verified on merchant receiver. | HTTP 200 |
| **Webhook** | `WHK-02` | Retry Failed Webhook Delivery | Retry worker attempts re-delivery with exponential backoff. | HTTP 200 |
| **Security**| `SEC-01` | Merchant A accesses Merchant B Wallet IDOR | Access denied with 403/404 tenant isolation error. | HTTP 403/404 |
| **Security**| `SEC-02` | Non-Admin invites Super Admin | Role escalation blocked. | HTTP 403 |

---

## 3. Real Device Staging Execution Protocol

```text
[ Physical Android Phone ]
           │
           ├─► Install `app-staging.apk` from Staging Release Center
           ├─► Grant SMS & Notification Permissions
           ├─► Scan QR Pairing Code from Staging Merchant Dashboard
           ├─► Device enters `ONLINE` state on Telemetry Dashboard
           ├─► Send Real Test bKash Cash-In / Payment SMS
           ├─► SMS captured locally ──► Ingested to `/api/v1/sms/ingest`
           ├─► Normalized ──► Payment Matched ──► Webhook Delivered!
```
