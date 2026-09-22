<?php

namespace PaySync;

class PaySyncClient {
    private string $apiKey;
    private ?string $apiSecret;
    private string $baseUrl;
    private int $timeout;

    public function __construct(string $apiKey, ?string $apiSecret = null, string $baseUrl = 'https://api.paysync.io', int $timeout = 15) {
        if (empty($apiKey)) {
            throw new \InvalidArgumentException('PaySync SDK: apiKey is required');
        }
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
    }

    private function request(string $method, string $path, ?array $body = null, array $headers = []): array {
        $url = $this->baseUrl . '/api/v1' . $path;
        $ch = curl_init();

        $defaultHeaders = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey,
        ];

        if ($this->apiSecret) {
            $defaultHeaders[] = 'X-API-Secret: ' . $this->apiSecret;
        }

        foreach ($headers as $k => $v) {
            $defaultHeaders[] = "$k: $v";
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            }
        } elseif ($method === 'PATCH') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException("PaySync cURL Error: $error");
        }

        $json = json_decode($response, true);
        if ($httpCode >= 400 || (isset($json['success']) && $json['success'] === false)) {
            $errMsg = $json['error']['message'] ?? $json['message'] ?? "HTTP $httpCode";
            $errCode = $json['error']['code'] ?? 'API_ERROR';
            throw new \RuntimeException("PaySync API Error [$errCode]: $errMsg", $httpCode);
        }

        return $json['data'] ?? $json;
    }

    /**
     * Create payment session
     */
    public function createPayment(array $params, ?string $idempotencyKey = null): array {
        $headers = [];
        if ($idempotencyKey) {
            $headers['Idempotency-Key'] = $idempotencyKey;
        }
        return $this->request('POST', '/payments/create', $params, $headers);
    }

    /**
     * Get payment details
     */
    public function getPayment(string $paymentId): array {
        return $this->request('GET', "/payments/{$paymentId}");
    }

    /**
     * Get lightweight payment status
     */
    public function getPaymentStatus(string $paymentId): array {
        return $this->request('GET', "/payments/{$paymentId}/status");
    }

    /**
     * Verify customer TrxID
     */
    public function verifyPayment(string $paymentId, string $trxId): array {
        return $this->request('POST', "/payments/{$paymentId}/verify", ['trxId' => $trxId]);
    }

    /**
     * Cancel payment
     */
    public function cancelPayment(string $paymentId): array {
        return $this->request('POST', "/payments/{$paymentId}/cancel");
    }

    /**
     * List transactions
     */
    public function listTransactions(array $query = []): array {
        $qs = !empty($query) ? '?' . http_build_query($query) : '';
        return $this->request('GET', "/transactions{$qs}");
    }

    /**
     * Verify webhook signature
     */
    public static function verifyWebhookSignature(string $payload, string $signatureHeader, string $secret, int $tolerance = 300): bool {
        if (empty($signatureHeader) || empty($secret)) {
            return false;
        }

        $parts = explode(',', $signatureHeader);
        $timestamp = null;
        $signature = null;

        foreach ($parts as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) === 2) {
                if ($kv[0] === 't') $timestamp = $kv[1];
                if ($kv[0] === 'v1' || $kv[0] === 'sig') $signature = $kv[1];
            }
        }

        if (!$signature) {
            $signature = trim($signatureHeader);
        }

        $dataToSign = $timestamp ? "{$timestamp}.{$payload}" : $payload;
        $expected = hash_hmac('sha256', $dataToSign, $secret);

        if ($timestamp) {
            if (abs(time() - (int)$timestamp) > $tolerance) {
                return false;
            }
        }

        return hash_equals($expected, $signature);
    }
}
