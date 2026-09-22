# PaySync Operations & Troubleshooting Runbook

This guide covers resolution steps for common operational incidents and production warnings.

---

## 1. Android Collector Disconnected (Status: OFFLINE)

### Symptoms
- Gateway dashboard flags collector phone as `OFFLINE`.
- Incoming SMS transactions are not being processed in real time.

### Resolution Steps
1. **Check Power & Wi-Fi/4G**: Ensure the phone has power and an active data connection.
2. **Check Battery Saver**: Ensure Android Battery Optimization is set to **"Don't optimize" / "Unrestricted"**.
3. **Verify Foreground Service**: Check the phone's notification tray to verify the PaySync Collector persistent notification is visible.
4. **Resend Test SMS**: From another phone, send a test SMS to the SIM card. Open the collector app and verify the message appears in the local log.
5. **Re-pair Device**: If token expired, tap **Re-pair** and scan a new QR code from the PaySync Admin dashboard.

---

## 2. Webhook Deliveries Failing

### Symptoms
- Merchant reports not receiving payment completion notifications.
- Webhook status in dashboard displays `FAILED` or `RETRYING`.

### Resolution Steps
1. **Check Merchant Webhook URL**: Ensure the merchant's endpoint is reachable and returns HTTP `200` or `204`.
2. **Test Endpoint**: Use the dashboard **Send Test Webhook** button or call `POST /api/v1/webhooks/test` to inspect the exact HTTP response code and body.
3. **Inspect SSL Certificates**: If the merchant's server has an invalid or self-signed SSL certificate, the webhook dispatcher will abort for security.
4. **Review Firewalls / Cloudflare**: Ensure the merchant's Cloudflare or WAF does not block requests containing user-agent `PaySync-Webhook-Dispatcher/1.0`.

---

## 3. Customer Reports "Transaction ID Already Used"

### Symptoms
- Customer enters a valid TrxID on the hosted checkout page, but receives error `TRX_ALREADY_USED`.

### Resolution Steps
1. **Search Transactions**: In Admin Dashboard -> **Transactions**, search by the exact TrxID.
2. **Review Matched Order**: Check the `usedForPaymentId` field to verify if the TrxID was already credited to a prior order or duplicate attempt.
3. **Dispute Resolution**: If a customer accidentally reused a TrxID from yesterday, ask them to check their SMS for the latest transaction ID.
