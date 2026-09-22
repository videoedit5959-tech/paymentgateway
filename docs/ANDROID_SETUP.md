# Android SMS Collector Node Setup Guide

The PaySync Android Collector app operates as an autonomous, encrypted SMS ingestion node that forwards real-time MFS payment confirmation messages to your gateway.

---

## 1. Prerequisites
- Dedicated Android physical smartphone (Android 8.0 Oreo or newer, API 26+).
- Active SIM card(s) inserted (bKash, Nagad, Rocket, or Upay merchant/personal accounts).
- Continuous power connection and reliable 4G / Wi-Fi internet connectivity.

---

## 2. Step-by-Step Installation

### Step 1: Install APK
Download the compiled `PaySync-Collector.apk` and install it on the dedicated phone. Enable "Install from unknown sources" if prompted.

### Step 2: Grant Permissions
The app will request:
1. **SMS Receive (`RECEIVE_SMS`, `READ_SMS`)**: Required to intercept MFS transaction notifications.
2. **Phone State (`READ_PHONE_STATE`)**: Required to identify SIM slot index for dual-SIM phones.
3. **Notification Access & Foreground Service (`FOREGROUND_SERVICE_DATA_SYNC`)**: Keeps the background daemon permanently active.
4. **Boot Completed (`RECEIVE_BOOT_COMPLETED`)**: Automatically resumes collection after a device reboot.

### Step 3: Battery Optimization Whitelist (CRITICAL)
Android OS power managers will kill background listeners unless whitelisted:
1. Open phone **Settings** -> **Apps** -> **PaySync Collector**.
2. Tap **Battery** -> select **Unrestricted / Don't Optimize**.
3. On OEM ROMs (Xiaomi/MIUI, Oppo/ColorOS, Vivo, Samsung):
   - Enable **Autostart**.
   - Lock PaySync Collector in the Recent Apps drawer.

### Step 4: Device Pairing
1. In your PaySync Admin / Merchant Dashboard, navigate to **Devices** -> **Register Device**.
2. Click **Generate QR Pairing Code**.
3. Open the PaySync Collector app on your phone and tap **Scan QR Code**.
4. The device will automatically exchange hardware IDs, securely store the secret device token in the Android Keystore, and register with the gateway.

---

## 3. Dual-SIM Configuration
PaySync Collector automatically detects SIM 1 and SIM 2. You can link SIM 1 to your bKash merchant number and SIM 2 to your Nagad wallet in the dashboard settings.

---

## 4. Heartbeat & Health Monitoring
- The Collector sends a keepalive ping every **30 seconds**.
- If no ping is received for 5 minutes, the gateway triggers an alert in the dashboard and flags the device as `OFFLINE`.
