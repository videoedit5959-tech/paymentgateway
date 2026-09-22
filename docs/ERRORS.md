# PaySync Error Catalog & Status Codes

All API errors return standard HTTP status codes along with a structured JSON error body:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Field 'amount' must be a positive number."
  },
  "requestId": "req_1727001999_xyz"
}
```

---

## 1. HTTP Status Code Mapping

| Status Code | Reason | Meaning |
|---|---|---|
| `200 OK` | Success | Request succeeded |
| `201 Created` | Created | Resource successfully created |
| `400 Bad Request` | Invalid Input | Malformed body, invalid format, or business logic rule violation |
| `401 Unauthorized` | Auth Failure | Missing, expired, or invalid API key or secret |
| `403 Forbidden` | Permission Denied | API key revoked, insufficient role, or cross-merchant access attempt |
| `404 Not Found` | Resource Missing | Payment, transaction, or wallet ID not found |
| `409 Conflict` | State Conflict | Duplicate orderId for completed payment or concurrency lock |
| `429 Too Many Requests` | Rate Limited | Exceeded per-minute request rate limit |
| `500 Server Error` | Internal Error | Unexpected gateway error (logged with correlation ID) |

---

## 2. Standard Error Code Index

| Error Code | HTTP Status | Description & Resolution |
|---|---|---|
| `INVALID_REQUEST` | 400 | Request body validation failed. Check parameter types and requirements. |
| `UNAUTHORIZED` | 401 | Invalid or missing `X-API-Key` or `X-API-Secret`. Check your credentials. |
| `FORBIDDEN` | 403 | API key is revoked or does not have access to the specified resource. |
| `PAYMENT_NOT_FOUND` | 404 | The specified `paymentId` does not exist. |
| `PAYMENT_ALREADY_COMPLETED` | 409 | Attempted to re-verify or duplicate an already completed payment session. |
| `PAYMENT_EXPIRED` | 400 | Payment session expired before receiving a valid transaction. |
| `TRX_ALREADY_USED` | 400 | The Transaction ID has already been credited to another order (double-spend prevention). |
| `INVALID_TRX_ID_SYNTAX` | 400 | TrxID does not match provider format (must be 8-20 alphanumeric characters). |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit threshold reached. Implement exponential backoff. |
| `INTERNAL_ERROR` | 500 | Gateway error. Contact support with the returned `requestId`. |
