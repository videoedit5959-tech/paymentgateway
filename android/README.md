# PaySync Android SMS Collector App

A native Kotlin Android application that securely forwards incoming bKash & Nagad transaction SMS messages to the PaySync Payment Gateway.

## Architecture & Features

1. **Strict Privacy Filter**:
   - Only messages originating from authorized MFS senders (`bKash`, `Nagad`, `16247`, `16167`) or containing valid `TrxID` / `TxnID` patterns are processed.
   - **Personal conversations and unrelated SMS messages are immediately discarded and never read or transmitted**.

2. **Secure QR Device Pairing**:
   - Single-use, temporary pairing token scanned via camera.
   - Device exchanges pairing token for a cryptographically secure `deviceToken`.

3. **Offline Resilience & Duplicate Protection**:
   - Generates SHA-256 hash of message before sending.
   - In case of mobile network loss, messages are persisted in Room database and retried via Android `WorkManager` with exponential backoff.

4. **Periodic Heartbeat & Telemetry**:
   - Transmits battery level, network status (WiFi / 4G), and timestamp every 15 minutes to notify merchant dashboard if collector phone battery is low or disconnected.

## Requirements & Setup

- **Min SDK**: 26 (Android 8.0 Oreo)
- **Target SDK**: 34 (Android 14)
- **Kotlin**: 1.9+
- **Gradle**: 8.2+
- Required Permissions:
  - `RECEIVE_SMS`
  - `READ_SMS`
  - `INTERNET`
  - `ACCESS_NETWORK_STATE`
  - `CAMERA` (for QR pairing)
