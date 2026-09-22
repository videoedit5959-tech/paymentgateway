import os
import time
from paysync import PaySyncClient, PaySyncError

def main():
    client = PaySyncClient(
        api_key=os.getenv("PAYSYNC_API_KEY", "ps_live_demo"),
        api_secret=os.getenv("PAYSYNC_API_SECRET", "ps_live_sec_demo123"),
        base_url=os.getenv("PAYSYNC_BASE_URL", "http://localhost:3000")
    )

    try:
        print("Creating payment session...")
        payment = client.create_payment({
            "amount": 2400,
            "currency": "BDT",
            "orderId": f"ORD-PY-{int(time.time())}",
            "description": "Electronics Store Order #1042",
            "customer": {
                "name": "Tanvir Hasan",
                "email": "tanvir@example.com",
                "phone": "01912345678"
            },
            "successUrl": "https://myshop.com/success",
            "cancelUrl": "https://myshop.com/cancel",
            "webhookUrl": "https://myshop.com/webhooks/paysync"
        }, idempotency_key=f"idem_py_{int(time.time())}")

        print("Payment created successfully:")
        print("  Payment ID :", payment.get("paymentId"))
        print("  Checkout URL:", payment.get("checkoutUrl"))
        print("  Status      :", payment.get("status"))

        print("\nRetrieving payment status...")
        status = client.get_payment_status(payment.get("paymentId"))
        print("  Status      :", status.get("status"))

    except PaySyncError as e:
        print(f"PaySync Error [{e.code}]: {e} (Status: {e.status_code}, Request ID: {e.request_id})")

if __name__ == "__main__":
    main()
