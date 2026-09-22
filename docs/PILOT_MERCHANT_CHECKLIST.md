# PaySync MFS Gateway — Pilot Merchant Onboarding & Operational Checklist

This checklist is used by Technical Account Managers and Merchant Ops to onboard and monitor early pilot merchants during Phase 6.1.

---

## 1. Merchant Pre-Pilot Verification

| Step | Task | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **1.1** | Account Registration & KYC | Verify business registration, trade license, and email confirmation. | [x] Completed |
| **1.2** | API Key & Secret Generation | Verify merchant generated `pk_live_...` and `sk_live_...` keys. | [x] Completed |
| **1.3** | Webhook Endpoint & Secret | Webhook URL configured with HTTPS and valid SSL certificate. Test ping verified. | [x] Completed |
| **1.4** | MFS Wallet Numbers Configured | bKash Personal/Merchant and Nagad Personal numbers registered in Merchant Portal. | [x] Completed |

---

## 2. Dedicated Hardware & SIM Card Setup

| Step | Task | Requirements | Status |
| :--- | :--- | :--- | :--- |
| **2.1** | Dedicated Physical Device | Low-cost Android phone (e.g. Samsung A14, Redmi 12) dedicated exclusively to PaySync. | [x] Ready |
| **2.2** | SIM Card Installation | SIM cards matching registered wallet numbers inserted into SIM Slot 1 / Slot 2. | [x] Verified |
| **2.3** | MFS SMS Service Active | Verified test SMS from bKash (16247) and Nagad (16167) can be received on device. | [x] Verified |
| **2.4** | Always-on Power & Wi-Fi | Phone placed in secure location connected to constant power and stable Wi-Fi with 4G fallback. | [x] Verified |

---

## 3. Collector App Installation & Pairing

| Step | Task | Instructions | Sign-off |
| :--- | :--- | :--- | :--- |
| **3.1** | APK Download | Download latest verified APK from Merchant Portal > Android App. | Verified SHA-256 |
| **3.2** | Permissions Granted | Grant SMS Read, SMS Receive, Notifications, and Battery Unrestricted. | Granted |
| **3.3** | OEM Autostart Configured | For Xiaomi/Realme/Vivo, configure Autostart and Lock in Recent Apps. | Configured |
| **3.4** | QR Code Pairing | Scan device pairing QR from Merchant Portal > Devices > Add Device. | Device Online |
| **3.5** | Initial Heartbeat Check | Verify device heartbeat shows green `ONLINE` status in Merchant Dashboard. | Confirmed |

---

## 4. End-to-End Live Transaction Testing

| Test | Flow | Expected Result | Result |
| :--- | :--- | :--- | :--- |
| **T-1** | Small Test bKash (BDT 10) | Send BDT 10 -> SMS arrives -> Auto-matches checkout invoice -> Webhook 200 OK. | **PASS** |
| **T-2** | Small Test Nagad (BDT 10) | Send BDT 10 -> SMS arrives -> Auto-matches checkout invoice -> Webhook 200 OK. | **PASS** |
| **T-3** | Duplicate TrxID Replay | Attempt paying same invoice with used TrxID -> System marks as DUPLICATE. | **PASS** |
| **T-4** | Offline Simulation | Unplug Wi-Fi -> Send BDT 20 -> Reconnect -> Batch drained in under 5 seconds. | **PASS** |

---

## 5. Daily Operations & Pilot Support Runbook

1. **Morning Battery & Connectivity Check**:
   - Check Super Admin Telemetry / Merchant Dashboard: Verify collector shows `ONLINE` within last 60 seconds.
   - Battery level must be ≥ 80% or plugged into continuous power.
2. **Review Manual Queue**:
   - Check `Manual Review Queue` for any payments with minor customer typos or mismatching sender numbers.
   - Click "Approve & Complete" or "Reject" with audit notes.
3. **Escalation Contacts**:
   - Primary DevOps: `support@paysync.local`
   - Real-Time Emergency Hotline / Slack Channel: `#pilot-war-room`
