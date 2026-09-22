# Hosted Checkout Integration & User Experience

PaySync provides a responsive, hosted checkout interface that works on mobile devices, tablets, and desktops.

---

## 1. Hosted Checkout Workflow

1. **Initiate Payment**: Your backend calls `POST /api/v1/payments/create`.
2. **Redirect Customer**: Redirect the customer's browser to the returned `checkoutUrl` (e.g. `https://gateway.paysync.io/checkout?id=pay_98a72b81fa9`).
3. **MFS Method Selection**: Customer selects their preferred provider (bKash, Nagad, Rocket, Upay).
4. **Step-by-Step Payment Instructions**:
   - Displays merchant wallet number (with one-tap copy button).
   - Displays dynamic QR code compatible with the provider's mobile app.
   - Shows USSD code instructions (e.g. `*247#` for bKash, `*167#` for Nagad, `*322#` for Rocket).
5. **TrxID Entry & Automated Polling**:
   - Customer submits the 10-character alphanumeric TrxID received in SMS.
   - Real-time polling (`GET /payments/:paymentId/status`) continuously monitors for automated SMS ingestion in the background.
6. **Confirmation & Redirect**:
   - On completion, the checkout displays a success animation and redirects the customer to your `successUrl`.

---

## 2. Dynamic QR Codes
PaySync dynamically formats payment QR payloads compatible with Bangladeshi MFS app deep links, encoding the merchant wallet number, payment reference, and amount.

---

## 3. Handling Expiration & Cancellation
- The checkout page renders a live countdown timer showing the remaining TTL.
- When expired, the UI disables the input form and offers the customer a clean button to return to the merchant's store (`cancelUrl`).
