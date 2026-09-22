"""
PaySync Python SDK
Official Python client for PaySync MFS Payment Gateway (bKash, Nagad, Rocket, Upay)
"""

import hmac
import hashlib
import time
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, Optional, Union

class PaySyncError(Exception):
    def __init__(self, message: str, code: str = "API_ERROR", status_code: int = 400, request_id: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.request_id = request_id

class PaySyncClient:
    def __init__(self, api_key: str, api_secret: Optional[str] = None, base_url: str = "https://api.paysync.io", timeout: int = 15):
        if not api_key:
            raise ValueError("PaySync SDK: api_key is required")
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _request(self, method: str, path: str, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Any:
        url = f"{self.base_url}/api/v1{path}"
        req_headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }
        if self.api_secret:
            req_headers["X-API-Secret"] = self.api_secret
        if headers:
            req_headers.update(headers)

        payload_bytes = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=payload_bytes, headers=req_headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                res_body = response.read().decode("utf-8")
                parsed = json.loads(res_body)
                if isinstance(parsed, dict) and "data" in parsed:
                    return parsed["data"]
                return parsed
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", {}).get("message") or err_json.get("message") or str(e)
                code = err_json.get("error", {}).get("code") or "HTTP_ERROR"
                req_id = err_json.get("requestId")
                raise PaySyncError(msg, code=code, status_code=e.code, request_id=req_id)
            except json.JSONDecodeError:
                raise PaySyncError(f"HTTP Error {e.code}: {e.reason}", status_code=e.code)
        except urllib.error.URLError as e:
            raise PaySyncError(f"Network Connection Error: {e.reason}")

    def create_payment(self, params: Dict[str, Any], idempotency_key: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new payment session"""
        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        return self._request("POST", "/payments/create", data=params, headers=headers)

    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Retrieves payment details"""
        return self._request("GET", f"/payments/{payment_id}")

    def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Retrieves lightweight status for payment"""
        return self._request("GET", f"/payments/{payment_id}/status")

    def verify_payment(self, payment_id: str, trx_id: str) -> Dict[str, Any]:
        """Verifies customer-submitted TrxID"""
        return self._request("POST", f"/payments/{payment_id}/verify", data={"trxId": trx_id})

    def cancel_payment(self, payment_id: str) -> Dict[str, Any]:
        """Cancels a pending payment session"""
        return self._request("POST", f"/payments/{payment_id}/cancel")

    def list_transactions(self, limit: int = 50, provider: Optional[str] = None, status: Optional[str] = None) -> list:
        """Lists merchant transactions"""
        params = {"limit": str(limit)}
        if provider:
            params["provider"] = provider
        if status:
            params["status"] = status
        qs = "?" + urllib.parse.urlencode(params)
        return self._request("GET", f"/transactions{qs}")

    @staticmethod
    def verify_webhook_signature(payload: Union[str, dict], signature_header: str, secret: str, tolerance: int = 300) -> bool:
        """Verifies Webhook HMAC signature"""
        if not signature_header or not secret:
            return False

        parts = signature_header.split(",")
        timestamp = None
        signature = None

        for part in parts:
            if "=" in part:
                k, v = part.split("=", 1)
                k = k.strip()
                v = v.strip()
                if k == "t":
                    timestamp = v
                elif k in ("v1", "sig"):
                    signature = v

        if not signature:
            signature = signature_header.strip()

        payload_str = payload if isinstance(payload, str) else json.dumps(payload, separators=(',', ':'))
        data_to_sign = f"{timestamp}.{payload_str}" if timestamp else payload_str

        expected = hmac.new(secret.encode("utf-8"), data_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        if timestamp:
            try:
                ts = int(timestamp)
                now = int(time.time())
                if abs(now - ts) > tolerance:
                    return False
            except ValueError:
                return False

        return hmac.compare_digest(expected, signature)
