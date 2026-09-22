import { PaySyncClient } from './index.js';

async function main() {
  const paysync = new PaySyncClient({
    apiKey: process.env.PAYSYNC_API_KEY || 'ps_live_demo',
    apiSecret: process.env.PAYSYNC_API_SECRET || 'ps_live_sec_demo123',
    baseUrl: process.env.PAYSYNC_BASE_URL || 'http://localhost:3000',
  });

  console.log('1. Creating payment session...');
  const payment = await paysync.createPayment(
    {
      amount: 1250,
      currency: 'BDT',
      orderId: `ORD-${Date.now()}`,
      description: 'Annual Subscription - Premium Tier',
      customer: {
        name: 'Rahim Uddin',
        email: 'rahim@example.com',
        phone: '01712345678',
      },
      successUrl: 'https://merchant.example/orders/success',
      cancelUrl: 'https://merchant.example/orders/cancel',
      webhookUrl: 'https://merchant.example/webhooks/paysync',
      metadata: { plan: 'pro_annual', customerId: 'cust_987' },
    },
    `idem_${Date.now()}`
  );

  console.log('Payment created successfully:');
  console.log('Payment ID:', payment.paymentId);
  console.log('Checkout URL:', payment.checkoutUrl);
  console.log('Status:', payment.status);

  console.log('\n2. Polling payment status...');
  const status = await paysync.getPaymentStatus(payment.paymentId);
  console.log('Current status:', status.status);

  console.log('\n3. Fetching merchant wallets...');
  const wallets = await paysync.getMerchantWallets();
  console.log('Configured wallets:', wallets.length);
}

main().catch(console.error);
