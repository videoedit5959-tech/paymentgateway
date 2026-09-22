<?php

require_once __DIR__ . '/PaySyncClient.php';

use PaySync\PaySyncClient;

$client = new PaySyncClient(
    getenv('PAYSYNC_API_KEY') ?: 'ps_live_demo',
    getenv('PAYSYNC_API_SECRET') ?: 'ps_live_sec_demo123',
    getenv('PAYSYNC_BASE_URL') ?: 'http://localhost:3000'
);

try {
    echo "Creating payment session...\n";
    $payment = $client->createPayment([
        'amount' => 1500,
        'currency' => 'BDT',
        'orderId' => 'ORD-' . time(),
        'description' => 'Online Grocery Order',
        'customer' => [
            'name' => 'Fatima Begum',
            'email' => 'fatima@example.com',
            'phone' => '01812345678',
        ],
        'successUrl' => 'https://myshop.com/checkout/success',
        'cancelUrl' => 'https://myshop.com/checkout/cancel',
        'webhookUrl' => 'https://myshop.com/api/webhooks/paysync',
    ]);

    echo "Payment ID: " . $payment['paymentId'] . "\n";
    echo "Checkout URL: " . $payment['checkoutUrl'] . "\n";
    echo "Status: " . $payment['status'] . "\n";

    echo "Checking payment status...\n";
    $status = $client->getPaymentStatus($payment['paymentId']);
    echo "Status from API: " . $status['status'] . "\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
