import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Key,
  Webhook,
  Code2,
  BookOpen,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Play,
  Download,
  FileCode,
  Layers,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'api' | 'sdks' | 'checkout' | 'webhooks' | 'collector' | 'errors' | 'openapi'>('quickstart');
  const [activeSdk, setActiveSdk] = useState<'node' | 'php' | 'python'>('node');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Interactive Test States
  const [testEndpoint, setTestEndpoint] = useState<'create' | 'status' | 'verify'>('create');
  const [testAmount, setTestAmount] = useState('850');
  const [testOrderId, setTestOrderId] = useState(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [testPaymentId, setTestPaymentId] = useState('');
  const [testTrxId, setTestTrxId] = useState('BAH927XKL1');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [errorSearch, setErrorSearch] = useState('');

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExecuteApiTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    try {
      if (testEndpoint === 'create') {
        const res = await fetch('/api/v1/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'ps_live_demo',
            'X-API-Secret': 'ps_live_sec_demo123',
            'Idempotency-Key': `idem_${Date.now()}`,
          },
          body: JSON.stringify({
            amount: parseFloat(testAmount) || 850,
            currency: 'BDT',
            orderId: testOrderId,
            description: 'Interactive API Sandbox Order',
            customer: {
              name: 'Sandbox User',
              email: 'sandbox@paysync.io',
              phone: '01712345678',
            },
          }),
        });
        const json = await res.json();
        setTestResponse(json);
        if (json?.data?.paymentId) {
          setTestPaymentId(json.data.paymentId);
        }
      } else if (testEndpoint === 'status') {
        const pId = testPaymentId || 'pay_demo_test';
        const res = await fetch(`/api/v1/payments/${pId}/status`, {
          headers: {
            'X-API-Key': 'ps_live_demo',
            'X-API-Secret': 'ps_live_sec_demo123',
          },
        });
        const json = await res.json();
        setTestResponse(json);
      } else if (testEndpoint === 'verify') {
        const pId = testPaymentId || 'pay_demo_test';
        const res = await fetch(`/api/v1/payments/${pId}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'ps_live_demo',
            'X-API-Secret': 'ps_live_sec_demo123',
          },
          body: JSON.stringify({
            trxId: testTrxId,
          }),
        });
        const json = await res.json();
        setTestResponse(json);
      }
    } catch (err: any) {
      setTestResponse({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const errorCatalog = [
    { code: 'INVALID_REQUEST', status: 400, description: 'Request payload validation failed (e.g. missing amount or malformed email).' },
    { code: 'UNAUTHORIZED', status: 401, description: 'Missing or invalid X-API-Key or X-API-Secret credentials.' },
    { code: 'FORBIDDEN', status: 403, description: 'API Key revoked, user suspended, or cross-merchant access forbidden.' },
    { code: 'PAYMENT_NOT_FOUND', status: 404, description: 'The requested payment session ID does not exist in the database.' },
    { code: 'PAYMENT_ALREADY_COMPLETED', status: 409, description: 'Attempted to alter or re-verify an invoice that has already been credited.' },
    { code: 'PAYMENT_EXPIRED', status: 400, description: 'The 15-minute TTL window has elapsed without receiving matching payment.' },
    { code: 'TRX_ALREADY_USED', status: 400, description: 'Double-spending protection: TrxID was already credited to another payment.' },
    { code: 'INVALID_TRX_ID_SYNTAX', status: 400, description: 'TrxID does not match expected alphanumeric syntax (8-20 characters).' },
    { code: 'DEVICE_NOT_REGISTERED', status: 403, description: 'Android collector hardware ID is not registered in PaySync portal.' },
    { code: 'RATE_LIMIT_EXCEEDED', status: 429, description: 'Per-minute API limit exceeded. Back off and retry.' },
    { code: 'INTERNAL_ERROR', status: 500, description: 'Internal gateway error. Correlation ID attached in response.' },
  ];

  const filteredErrors = errorCatalog.filter(
    (e) =>
      e.code.toLowerCase().includes(errorSearch.toLowerCase()) ||
      e.description.toLowerCase().includes(errorSearch.toLowerCase()) ||
      e.status.toString().includes(errorSearch)
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  Developer Portal
                </span>
                <span className="text-xs font-semibold text-zinc-500">v1.0.0 Production API</span>
              </div>
              <h1 className="text-2xl font-black text-zinc-900 mt-1">PaySync Developer Platform & SDKs</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Complete REST API documentation, client libraries (Node, PHP, Python), Webhook signatures, and Android collector setup.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                OpenAPI Spec (JSON)
              </a>
              <button
                onClick={() => setActiveTab('api')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Play className="h-3.5 w-3.5" />
                Interactive Sandbox
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex flex-wrap gap-1 border-b border-zinc-100 pb-2 text-xs font-medium">
            {[
              { id: 'quickstart', label: 'Quickstart & Auth', icon: BookOpen },
              { id: 'api', label: 'API Reference & Sandbox', icon: Terminal },
              { id: 'sdks', label: 'Official SDKs', icon: Code2 },
              { id: 'checkout', label: 'Hosted Checkout Flow', icon: Layers },
              { id: 'webhooks', label: 'Webhooks & HMAC', icon: Webhook },
              { id: 'collector', label: 'Android Collector', icon: Smartphone },
              { id: 'errors', label: 'Error Catalog', icon: AlertTriangle },
              { id: 'openapi', label: 'OpenAPI Explorer', icon: FileCode },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 1. QUICKSTART & AUTH TAB */}
        {activeTab === 'quickstart' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">1</span>
                  Create API Keys
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Generate your <code>ps_live_...</code> or <code>ps_test_...</code> keys in the Merchant Portal under the <strong>API Keys</strong> tab.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">2</span>
                  Initiate Checkout Session
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Call <code>POST /api/v1/payments/create</code> with your order details and redirect the customer to <code>checkoutUrl</code>.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">3</span>
                  Receive Webhook
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Listen for cryptographically signed <code>payment.completed</code> events and fulfill customer orders instantly.
                </p>
              </div>
            </div>

            {/* Authentication Headers Box */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <Key className="h-4 w-4 text-emerald-600" />
                  Standard Server-to-Server Authentication
                </div>
                <button
                  onClick={() =>
                    copySnippet(
                      'auth-headers',
                      'X-API-Key: ps_live_a1b2c3d4\nX-API-Secret: ps_live_sec_99a8b7c6d5e4\nIdempotency-Key: 7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e'
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                >
                  {copiedSection === 'auth-headers' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Headers
                </button>
              </div>

              <div className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 space-y-1">
                <div><span className="text-zinc-500">X-API-Key:</span> ps_live_a1b2c3d4</div>
                <div><span className="text-zinc-500">X-API-Secret:</span> ps_live_sec_99a8b7c6d5e4...</div>
                <div><span className="text-zinc-500">Idempotency-Key:</span> 7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e</div>
                <div><span className="text-zinc-500">Content-Type:</span> application/json</div>
              </div>

              <div className="text-xs text-zinc-600 space-y-2">
                <p>
                  <strong>Test Mode:</strong> Use test keys (prefix <code>ps_test_</code>) to simulate checkouts without transferring real BDT funds. In test mode, you can verify transactions using any test TrxID like <code>TEST_PAY_001</code>.
                </p>
                <p>
                  <strong>Idempotency:</strong> Send an <code>Idempotency-Key</code> header with any unique UUID to safely retry network timeouts without risking duplicate payments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. API REFERENCE & SANDBOX TAB */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Interactive Sandbox Controller */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Interactive API Sandbox</h3>
                  <p className="text-xs text-zinc-500">Test live requests against the gateway directly in your browser.</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['create', 'status', 'verify'] as const).map((ep) => (
                    <button
                      key={ep}
                      onClick={() => setTestEndpoint(ep)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase ${
                        testEndpoint === ep ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {ep === 'create' ? '1. Create Payment' : ep === 'status' ? '2. Check Status' : '3. Verify TrxID'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input fields depending on endpoint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {testEndpoint === 'create' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Amount (BDT)</label>
                      <input
                        type="number"
                        value={testAmount}
                        onChange={(e) => setTestAmount(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Order ID</label>
                      <input
                        type="text"
                        value={testOrderId}
                        onChange={(e) => setTestOrderId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-900"
                      />
                    </div>
                  </>
                )}

                {(testEndpoint === 'status' || testEndpoint === 'verify') && (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Payment ID</label>
                    <input
                      type="text"
                      placeholder="e.g. pay_98a72b81"
                      value={testPaymentId}
                      onChange={(e) => setTestPaymentId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-900"
                    />
                  </div>
                )}

                {testEndpoint === 'verify' && (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Transaction ID (TrxID)</label>
                    <input
                      type="text"
                      value={testTrxId}
                      onChange={(e) => setTestTrxId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-900"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExecuteApiTest}
                  disabled={testLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                >
                  {testLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                  {testLoading ? 'Executing Request...' : 'Send API Request'}
                </button>
              </div>

              {/* Response Console */}
              {testResponse && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700">API Response Body</span>
                    <button
                      onClick={() => copySnippet('sandbox-resp', JSON.stringify(testResponse, null, 2))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900"
                    >
                      {copiedSection === 'sandbox-resp' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Copy JSON
                    </button>
                  </div>
                  <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-80">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. OFFICIAL SDKS TAB */}
        {activeTab === 'sdks' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              {(['node', 'php', 'python'] as const).map((sdk) => (
                <button
                  key={sdk}
                  onClick={() => setActiveSdk(sdk)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition-colors ${
                    activeSdk === sdk ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {sdk === 'node' ? 'Node.js / TypeScript' : sdk === 'php' ? 'PHP (Composer)' : 'Python (PyPI)'}
                </button>
              ))}
            </div>

            {/* SDK Code Viewer */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              {activeSdk === 'node' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Node.js / TypeScript SDK Integration</h4>
                      <p className="text-xs text-zinc-500">Install via npm and initialize client.</p>
                    </div>
                    <button
                      onClick={() =>
                        copySnippet(
                          'node-sdk',
                          `import { PaySyncClient } from '@paysync/node-sdk';\n\nconst paysync = new PaySyncClient({\n  apiKey: process.env.PAYSYNC_API_KEY!,\n  apiSecret: process.env.PAYSYNC_API_SECRET!,\n});\n\nconst payment = await paysync.createPayment({\n  amount: 850,\n  currency: 'BDT',\n  orderId: 'ORD-1001',\n  customer: { name: 'Sabbir Ahmed', phone: '01712345678' },\n  successUrl: 'https://myshop.com/success',\n});\n\nconsole.log(payment.checkoutUrl);`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                    >
                      {copiedSection === 'node-sdk' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Code
                    </button>
                  </div>
                  <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
{`npm install @paysync/node-sdk

import { PaySyncClient } from '@paysync/node-sdk';

const paysync = new PaySyncClient({
  apiKey: process.env.PAYSYNC_API_KEY!,
  apiSecret: process.env.PAYSYNC_API_SECRET!,
});

// 1. Create Checkout Session
const payment = await paysync.createPayment({
  amount: 850,
  currency: 'BDT',
  orderId: 'ORD-1001',
  customer: {
    name: 'Sabbir Ahmed',
    email: 'sabbir@example.com',
    phone: '01712345678',
  },
  successUrl: 'https://myshop.com/orders/success',
  cancelUrl: 'https://myshop.com/orders/cancel',
  webhookUrl: 'https://myshop.com/api/webhooks/paysync',
});

// 2. Redirect customer to PaySync hosted checkout
res.redirect(payment.checkoutUrl);`}
                  </pre>
                </>
              )}

              {activeSdk === 'php' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">PHP SDK Integration (Composer)</h4>
                      <p className="text-xs text-zinc-500">Install via composer and initiate payments.</p>
                    </div>
                    <button
                      onClick={() =>
                        copySnippet(
                          'php-sdk',
                          `composer require paysync/paysync-php\n\n<?php\nuse PaySync\\PaySyncClient;\n\n$client = new PaySyncClient(getenv('PAYSYNC_API_KEY'), getenv('PAYSYNC_API_SECRET'));\n$payment = $client->createPayment([\n    'amount' => 1200,\n    'orderId' => 'ORD-9821',\n    'customer' => ['name' => 'Fatima', 'phone' => '01812345678'],\n]);\nheader('Location: ' . $payment['checkoutUrl']);\nexit;`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                    >
                      {copiedSection === 'php-sdk' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Code
                    </button>
                  </div>
                  <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
{`composer require paysync/paysync-php

<?php
require_once __DIR__ . '/vendor/autoload.php';

use PaySync\\PaySyncClient;

$client = new PaySyncClient(
    getenv('PAYSYNC_API_KEY'),
    getenv('PAYSYNC_API_SECRET')
);

$payment = $client->createPayment([
    'amount' => 1200,
    'currency' => 'BDT',
    'orderId' => 'ORD-' . time(),
    'customer' => [
        'name' => 'Fatima Begum',
        'phone' => '01812345678'
    ],
    'successUrl' => 'https://myshop.com/success',
    'cancelUrl' => 'https://myshop.com/cancel'
]);

header('Location: ' . $payment['checkoutUrl']);
exit;`}
                  </pre>
                </>
              )}

              {activeSdk === 'python' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Python SDK Integration (PyPI)</h4>
                      <p className="text-xs text-zinc-500">Install via pip and initiate payments.</p>
                    </div>
                    <button
                      onClick={() =>
                        copySnippet(
                          'py-sdk',
                          `pip install paysync-python\n\nimport os\nfrom paysync import PaySyncClient\n\nclient = PaySyncClient(api_key=os.environ["PAYSYNC_API_KEY"], api_secret=os.environ["PAYSYNC_API_SECRET"])\npayment = client.create_payment({\n    "amount": 2400,\n    "orderId": "INV-5001",\n    "customer": {"name": "Tanvir", "phone": "01912345678"}\n})\nprint(payment["checkoutUrl"])`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                    >
                      {copiedSection === 'py-sdk' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Code
                    </button>
                  </div>
                  <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
{`pip install paysync-python

import os
from paysync import PaySyncClient

client = PaySyncClient(
    api_key=os.environ["PAYSYNC_API_KEY"],
    api_secret=os.environ["PAYSYNC_API_SECRET"]
)

payment = client.create_payment({
    "amount": 2400,
    "currency": "BDT",
    "orderId": "INV-5001",
    "description": "Electronics Store Order #5001",
    "customer": {
        "name": "Tanvir Hasan",
        "email": "tanvir@example.com",
        "phone": "01912345678"
    },
    "successUrl": "https://myshop.com/success"
})

print(f"Checkout URL: {payment['checkoutUrl']}")`}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. HOSTED CHECKOUT TAB */}
        {activeTab === 'checkout' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900">Hosted Checkout Architecture & UI</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                PaySync provides a secure, fully hosted checkout experience. Customers never enter card numbers or banking passwords on your server.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4">
                  <div className="font-bold text-xs text-pink-900">bKash MFS</div>
                  <div className="text-[11px] text-pink-700 mt-1">Dynamic QR code + USSD (*247#) + TrxID Verification</div>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <div className="font-bold text-xs text-orange-900">Nagad MFS</div>
                  <div className="text-[11px] text-orange-700 mt-1">App Deep-link + USSD (*167#) + Automated SMS Match</div>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                  <div className="font-bold text-xs text-purple-900">Rocket (DBBL)</div>
                  <div className="text-[11px] text-purple-700 mt-1">12-digit account format + USSD (*322#) + Auto Match</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="font-bold text-xs text-blue-900">Upay (UCB)</div>
                  <div className="text-[11px] text-blue-700 mt-1">Upay App QR + USSD (*268#) + Instant Verification</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. WEBHOOKS TAB */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Webhook className="h-4 w-4 text-emerald-600" />
                Verifying Outbound Webhook Signatures (HMAC-SHA256)
              </div>
              <p className="text-xs text-zinc-600">
                Every webhook sent by PaySync includes an <code>X-PaySync-Signature</code> header. Validate this in your backend before updating orders.
              </p>

              <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
{`import crypto from 'crypto';

app.post('/api/webhooks/paysync', (req, res) => {
  const signature = req.headers['x-paysync-signature'];
  const secret = process.env.PAYSYNC_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).send('Invalid webhook signature');
  }

  const { event, data } = req.body;
  if (event === 'payment.completed' && data.status === 'COMPLETED') {
    console.log(\`Payment completed for Order: \${data.orderId}, TrxID: \${data.transaction.trxId}\`);
    // Fulfill customer purchase
  }

  res.status(200).json({ received: true });
});`}
              </pre>
            </div>
          </div>
        )}

        {/* 6. ANDROID COLLECTOR TAB */}
        {activeTab === 'collector' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900">Android SMS Collector Node Setup</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                The PaySync Collector runs as a foreground service on a dedicated Android phone with your MFS SIM cards. It forwards incoming SMS in real-time to the gateway.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">1</div>
                  <div className="text-xs">
                    <strong className="text-zinc-900">Install APK & Grant Permissions:</strong>
                    <div className="text-zinc-600 mt-0.5">Enable SMS receive, notification listener, and phone state permissions.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">2</div>
                  <div className="text-xs">
                    <strong className="text-zinc-900">Battery Optimization Whitelist (Crucial):</strong>
                    <div className="text-zinc-600 mt-0.5">Set Battery to "Unrestricted" so Android OS does not pause background SMS reception.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">3</div>
                  <div className="text-xs">
                    <strong className="text-zinc-900">Scan QR Pairing Code:</strong>
                    <div className="text-zinc-600 mt-0.5">Navigate to Admin Portal &rarr; Devices &rarr; Register Device and scan the QR code with the phone camera.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. ERROR CATALOG TAB */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Error Code Reference</h3>
                  <p className="text-xs text-zinc-500">Machine-readable codes returned in failed API responses.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search error code or status..."
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-600 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Error Code</th>
                      <th className="px-4 py-2.5">HTTP Status</th>
                      <th className="px-4 py-2.5">Description & Cause</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {filteredErrors.map((err) => (
                      <tr key={err.code} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-bold text-rose-600">{err.code}</td>
                        <td className="px-4 py-3 font-bold text-zinc-700">{err.status}</td>
                        <td className="px-4 py-3 font-sans text-zinc-600">{err.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. OPENAPI EXPLORER TAB */}
        {activeTab === 'openapi' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">OpenAPI 3.0.3 Specification</h3>
                  <p className="text-xs text-zinc-500">Official JSON schema available at <code>/api/v1/openapi.json</code></p>
                </div>
                <a
                  href="/api/v1/openapi.json"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Raw JSON Spec
                </a>
              </div>

              <div className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-300 space-y-2 overflow-x-auto max-h-96">
                <div>{`{ "openapi": "3.0.3", "info": { "title": "PaySync MFS Payment Gateway API", "version": "1.0.0" } }`}</div>
                <div className="text-zinc-500">// Import this JSON spec directly into Postman, Insomnia, or Swagger UI</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
