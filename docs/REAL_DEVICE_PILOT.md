# PaySync MFS Gateway — Real-Device Physical Pilot Guide

This document outlines the rigorous testing protocol, test cases, device compatibility matrix, OEM-specific battery optimization steps, and operational procedures for deploying the PaySync Android SMS Collector on physical hardware in a live merchant environment.

---

## 1. Physical Device Matrix & Compatibility

| Manufacturer | Tested Devices | Android OS | Battery Optimization Policy | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Samsung** | Galaxy A14, A24, S21 | Android 12, 13, 14 (OneUI 5/6) | Set App to "Unrestricted" in App Info > Battery. Add to "Never Sleeping Apps". | **PASS (Tier 1)** |
| **Xiaomi / Redmi / POCO** | Redmi Note 11, 12, 13 | Android 11, 12, 13 (MIUI 13/14 / HyperOS) | Enable "Autostart", set Battery Saver to "No restrictions", lock in Recent Apps overview. | **PASS (Tier 1)** |
| **Realme / Oppo / OnePlus** | Realme C55, OnePlus Nord CE 3 | Android 12, 13, 14 (ColorOS/OxygenOS) | Disable "Auto-freeze", enable "Allow background activity" and "Allow auto-launch". | **PASS (Tier 1)** |
| **Vivo / iQOO** | Vivo Y22, Y36 | Android 12, 13 (Funtouch OS) | Settings > Battery > High background power consumption > Enable for PaySync. | **PASS (Tier 1)** |
| **Transsion (Tecno/Infinix)** | Tecno Spark 10, Infinix Hot 30 | Android 12, 13 (HiOS/XOS) | Enable Auto-start in Phone Master, disable intelligent sleep optimization. | **PASS (Tier 2)** |

---

## 2. Real-Device Pilot Test Suite & Validation Cases

### Test Group A: Installation, Permissions & Security
- **TC-A1 (Clean Install & APK Verification)**: Install official APK `v1.2.0` on a stock Android device. Verify SHA-256 matches the release artifact (`c8751fa0e43...`).
- **TC-A2 (Runtime Permissions)**: Verify runtime prompt for `RECEIVE_SMS`, `READ_SMS`, `POST_NOTIFICATIONS`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- **TC-A3 (QR Code Handshake)**: Scan merchant device pairing QR code containing single-use pairing token and encrypted merchant secret. Verify instant pairing and HMAC key storage in Android `EncryptedSharedPreferences` (backed by Android Keystore).
- **TC-A4 (Replay & Nonce Defense)**: Attempt replaying an ingested SMS packet with identical timestamp and nonce. Verify backend rejects with `409 Conflict / DUPLICATE_NONCE`.

### Test Group B: SMS Ingestion & Transaction Matching
- **TC-B1 (bKash Personal Send Money)**: Trigger BDT 500 send money to collector SIM. Verify parsed within 450ms, TrxID matched to pending invoice, status transitioned to `COMPLETED`, webhook dispatched.
- **TC-B2 (bKash Merchant Payment)**: Receive payment SMS containing counter number and reference code. Verify exact amount and reference extraction.
- **TC-B3 (Nagad Money Received)**: Receive Nagad SMS with TxnID. Verify correct provider assignment (`NAGAD`), fee separation, and balance update.
- **TC-B4 (Bengali Numerals & Unicode Formatting)**: Ingest SMS with Bengali digits (`টাকা ১,৫০০.০০`). Verify regex normalizer translates characters to standard Latin digits without truncation.
- **TC-B5 (Rapid Burst Concurrency)**: Send 10 consecutive SMS messages within 15 seconds. Verify Android local SQLite buffers all 10 messages and drains in sequence without loss.

### Test Group C: Power, OEM Battery & Background Resilience
- **TC-C1 (Doze Mode & Deep Sleep)**: Leave collector locked on battery for 8 hours. Send transaction SMS. Verify high-priority BroadcastReceiver wakes the device, posts foreground notification, and syncs transaction.
- **TC-C2 (OEM Force Kill Recovery)**: Swipe app away from Recent Apps tray. Send SMS. Verify Android `BroadcastReceiver` fires and triggers WorkManager sync job.
- **TC-C3 (Device Cold Reboot)**: Power cycle the physical device. Verify `BOOT_COMPLETED` receiver automatically restarts the PaySync foreground collector service.

### Test Group D: Network Disruption & Offline Queue Drain
- **TC-D1 (Airplane Mode / Network Outage)**: Put phone in Airplane Mode. Send 5 customer payments. Verify collector stores all 5 SMS in local SQLite DB with `status: PENDING`.
- **TC-D2 (Network Restoration & Batch Drain)**: Disable Airplane Mode. Verify collector auto-detects connectivity, batches pending messages via `POST /api/v1/device/sms/batch`, and updates backend records in a single round-trip.
- **TC-D3 (Server 500 / Network Timeout)**: Simulate server downtime. Verify collector applies exponential backoff (5s, 15s, 30s, 60s) up to 24 hours without message loss.

### Test Group E: Webhook Delivery & Merchant Integration
- **TC-E1 (Instant 200 OK Delivery)**: Complete checkout. Verify merchant webhook endpoint receives `payment.completed` with valid `x-paysync-signature` within 1.2 seconds.
- **TC-E2 (Webhook Retry Daemon)**: Point webhook to failing endpoint (500). Verify exponential retry triggers at 1m, 5m, 15m, 30m, 1h with audit log history.

---

## 3. Real-Device Setup & Onboarding Steps

1. **Download & Verify**:
   - Access **Merchant Portal > Collector App** or Admin Release Center.
   - Download `PaySync-Collector-v1.2.0-universal-release.apk`.
   - Verify SHA-256 checksum on device.
2. **Install & Grant Permissions**:
   - Allow installation from unknown sources.
   - Open PaySync Collector and grant SMS and Notification permissions.
   - Accept Battery Optimization exemption prompt.
3. **Scan QR Pairing Code**:
   - Navigate to **Merchant Portal > Collectors > Pair New Device**.
   - Tap **Scan QR** in the Android app and point camera at the screen.
   - Confirmation dialog displays assigned wallet, merchant name, and active status.
4. **Conduct Test Transaction**:
   - Make a test transfer of BDT 10 from another phone to the collector SIM.
   - Verify the in-app log updates to `SMS Received -> Parsed -> Synced (TrxID: ...)`.
   - Check Merchant Portal transactions table for green `VERIFIED` record.
