# PaySync MFS Gateway — Android App Distribution & Release Architecture

## 1. Overview

The **PaySync Android SMS Collector** (`com.paysync.collector`) is a high-performance, security-hardened background daemon designed to intercept, parse, and securely relay incoming Mobile Financial Service (MFS) SMS transactions (bKash & Nagad) from merchant/agent Android smartphones to the PaySync Gateway backend.

This document outlines the end-to-end architecture for building, signing, distributing, updating, and verifying Android collector release artifacts.

---

## 2. Technical Specifications

| Parameter | Specification |
| :--- | :--- |
| **Application ID** | `com.paysync.collector` |
| **Target SDK** | Android 14 (API level 34) |
| **Minimum SDK** | Android 8.0 Oreo (API level 26) |
| **Compile SDK** | Android 14 (API level 34) |
| **Native Architecture** | Universal (`arm64-v8a`, `armeabi-v7a`, `x86_64`) |
| **Code Language** | Kotlin 1.9+ |
| **Background Framework** | Android `WorkManager` & Foreground Service Daemon |
| **Local Persistence** | AndroidX `Room` / SQLite Offline Deduplication Queue |
| **Key Storage** | Android `EncryptedSharedPreferences` (AES256-GCM + MasterKey) |
| **Binary Signing** | `SHA256withRSA` 4096-bit Keystore |

---

## 3. Required Android Permissions & Security Rationale

| Permission | Technical Requirement & Justification |
| :--- | :--- |
| `android.permission.RECEIVE_SMS` | Captures incoming bKash & Nagad notification SMS with `priority="999"` broadcast receiver. |
| `android.permission.READ_SMS` | Fallback scanner to verify multiline SMS buffers during device reboot or high burst throughput. |
| `android.permission.INTERNET` | Delivers encrypted JSON payloads signed with HMAC-SHA256 nonces to the PaySync Gateway. |
| `android.permission.ACCESS_NETWORK_STATE` | WorkManager network constraint watchdog ensuring offline queue is drained immediately upon network reconnection. |
| `android.permission.CAMERA` | Instant CameraX QR code scanning for zero-friction device pairing with ephemeral keys. |
| `android.permission.FOREGROUND_SERVICE` | Ensures continuous 24/7 background operation on OEM skins (MIUI, OneUI, ColorOS). |
| `android.permission.POST_NOTIFICATIONS` | Android 13+ requirement for active foreground service sticky notification bar. |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Whitelists daemon from aggressive OEM deep-sleep background killer tasks. |

---

## 4. Release Distribution & API Architecture

### Endpoints

1. **`GET /api/android/releases/latest`**
   - Returns metadata for the official production release.
   - Public & merchant accessible.

2. **`GET /api/android/releases`**
   - Returns the array of all published production releases, sorted by `versionCode` descending.

3. **`GET /api/android/releases/:id/download`**
   - Downloads the physical APK binary package directly from release storage.
   - Response headers:
     - `Content-Type: application/vnd.android.package-archive`
     - `Content-Disposition: attachment; filename="PaySync-MFS-Collector-v1.2.0.apk"`
     - `X-Checksum-SHA256: <64-character hex hash>`
   - Atomically records download telemetry counter.

4. **`POST /api/android/releases`** *(Super Admin Only)*
   - Compiles and publishes a new release version artifact.
   - Computes live SHA-256 and byte sizes.

5. **`POST /api/android/releases/:id/set-latest`** *(Super Admin Only)*
   - Promotes a published release to the official latest build.

---

## 5. Merchant Device Pairing Flow

```
+--------------------------+             +--------------------------+
| PaySync Merchant Portal  |             | Android Collector Phone  |
+--------------------------+             +--------------------------+
             |                                         |
    1. Click "Pair Device"                             |
    2. Backend generates ephemeral                     |
       token (tok_pair_xxx)                            |
    3. Renders QR Code on screen                       |
             |                                         |
             |          4. Scan QR Code                |
             |<----------------------------------------|
             |                                         |
             |  5. POST /api/devices/pair              |
             |<----------------------------------------|
             |                                         |
    6. Backend returns 256-bit                         |
       HMAC Device Secret                              |
             |---------------------------------------->|
             |                                         |
             |  7. Store in EncryptedSharedPreferences |
             |  8. Initiate Heartbeat Daemon (45s)     |
             |                                         |
```

---

## 6. Cryptographic Integrity Verification

Merchants and system operators can verify the integrity of their downloaded APK binaries:

### Linux / macOS
```bash
sha256sum PaySync-MFS-Collector-v1.2.0.apk
```

### Windows (PowerShell)
```powershell
Get-FileHash .\PaySync-MFS-Collector-v1.2.0.apk -Algorithm SHA256
```

Compare the resulting output against the SHA-256 hash displayed in the PaySync Dashboard.
