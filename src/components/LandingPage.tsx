import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  Zap, 
  Lock, 
  RefreshCw, 
  QrCode, 
  Server, 
  Layers, 
  FileText,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onOpenSimulator: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenSimulator }) => {
  const [activeLang, setActiveLang] = useState<'curl' | 'node' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    curl: `curl -X POST "https://api.yourdomain.com/api/v1/payments/create" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ps_live_8f3d..." \\
  -H "X-API-Secret: ps_sec_live_9923..." \\
  -d '{
    "amount": 850,
    "currency": "BDT",
    "invoiceId": "INV-2026-991",
    "customer": {
      "name": "Tanvir Ahmed",
      "phone": "01711000111"
    },
    "webhookUrl": "https://yourstore.com/api/webhook"
  }'`,
    node: `import axios from 'axios';

const response = await axios.post('https://api.yourdomain.com/api/v1/payments/create', {
  amount: 850,
  currency: 'BDT',
  invoiceId: 'INV-2026-991',
  customer: {
    name: 'Tanvir Ahmed',
    phone: '01711000111'
  },
  webhookUrl: 'https://yourstore.com/api/webhook'
}, {
  headers: {
    'X-API-Key': process.env.PAYSYNC_KEY,
    'X-API-Secret': process.env.PAYSYNC_SECRET
  }
});

console.log('Payment URL:', response.data.data.paymentUrl);`,
    python: `import requests

payload = {
    "amount": 850,
    "currency": "BDT",
    "invoiceId": "INV-2026-991",
    "customer": {
        "name": "Tanvir Ahmed",
        "phone": "01711000111"
    },
    "webhookUrl": "https://yourstore.com/api/webhook"
}

headers = {
    "X-API-Key": "ps_live_8f3d...",
    "X-API-Secret": "ps_sec_live_9923..."
}

res = requests.post("https://api.yourdomain.com/api/v1/payments/create", json=payload, headers=headers)
print("Payment Session:", res.json())`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-50 text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs font-medium text-amber-900">
        <span className="inline-flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Architectural Transparency:</strong> PaySync is an automated SMS-based MFS transaction verification gateway. It does not use or claim official bKash or Nagad APIs.
          </span>
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Pitch & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Next-Gen Non-API MFS Verification
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.12]">
                Automate bKash & Nagad Payments <span className="text-emerald-600">Without Bureaucracy</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl leading-relaxed">
                Connect your merchant or personal bKash/Nagad SIMs via our lightweight Android Collector. Transactions are captured, parsed, matched with order invoices, and verified in sub-second latency with signed webhooks.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <button
                  onClick={() => onNavigate('merchant')}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 transition"
                >
                  Explore Merchant Portal
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => onNavigate('checkout-demo')}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100 transition"
                >
                  Live Checkout Demo
                </button>

                <button
                  onClick={onOpenSimulator}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition"
                >
                  <Zap className="h-4 w-4 text-emerald-600" />
                  SMS Simulator
                </button>
              </div>

              {/* Highlights */}
              <div className="mt-10 grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200 w-full">
                <div>
                  <div className="text-2xl font-bold text-zinc-900">100%</div>
                  <div className="text-xs text-zinc-500 font-medium mt-0.5">Non-API Architecture</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-900">&lt; 1.2s</div>
                  <div className="text-xs text-zinc-500 font-medium mt-0.5">Verification Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-900">HMAC</div>
                  <div className="text-xs text-zinc-500 font-medium mt-0.5">Signed Webhook Delivery</div>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Flow Diagram */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-zinc-800">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    How It Works (Real Flow)
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Live System
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Customer Sends Money</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Transfers via bKash or Nagad app to merchant wallet number displayed on checkout.
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Android Collector Reads SMS</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Native Kotlin app intercepts incoming transaction SMS, computes hash, and securely uploads to backend.
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600 text-xs font-bold text-white">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Backend Regex Parsing & Normalization</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Extracts TrxID, exact amount, balance, sender, and stores in MongoDB with compound unique indexes.
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">
                      4
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">Multi-Layer Verification Engine</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Validates TrxID, amount match, unused status, provider, and merchant ownership atomically.
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                      5
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-950">Webhook Dispatched & Order Paid</div>
                      <div className="text-[11px] text-emerald-800 mt-0.5">
                        HMAC-signed webhook sent to merchant URL. E-commerce order automatically updates to COMPLETED.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Android Kotlin + Next.js + MongoDB</span>
                  <button
                    onClick={() => onNavigate('android-code')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    View Android Code
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Supported Providers */}
      <section className="border-y border-zinc-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Supported MFS Networks & Wallet Types</h2>
            <p className="mt-2 text-xl font-bold text-zinc-900">Works with Personal, Agent, and Merchant SIMs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* bKash Card */}
            <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
                bK
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900">bKash (ব্র্যাক ব্যাংক)</h3>
                  <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-bold text-pink-700">Supported</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Parses Send Money, Payment Received, and Cash In notifications from sender <code className="bg-pink-100 text-pink-900 px-1 py-0.5 rounded">bKash</code> / <code className="bg-pink-100 text-pink-900 px-1 py-0.5 rounded">16247</code>.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-zinc-700">
                  <span className="rounded bg-white px-2 py-0.5 border border-pink-200">Personal (Send Money)</span>
                  <span className="rounded bg-white px-2 py-0.5 border border-pink-200">Merchant (Make Payment)</span>
                  <span className="rounded bg-white px-2 py-0.5 border border-pink-200">Agent (Cash In)</span>
                </div>
              </div>
            </div>

            {/* Nagad Card */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
                না
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900">Nagad (ডাক বিভাগ)</h3>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">Supported</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Parses Money Received and Merchant Payment notifications from sender <code className="bg-orange-100 text-orange-900 px-1 py-0.5 rounded">Nagad</code> / <code className="bg-orange-100 text-orange-900 px-1 py-0.5 rounded">16167</code>.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-zinc-700">
                  <span className="rounded bg-white px-2 py-0.5 border border-orange-200">Personal Wallet</span>
                  <span className="rounded bg-white px-2 py-0.5 border border-orange-200">Merchant Wallet</span>
                  <span className="rounded bg-white px-2 py-0.5 border border-orange-200">Uddokta SIM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer API Quickstart */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
                <Terminal className="h-3.5 w-3.5" />
                RESTful Payment API
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Integrate in minutes with any backend
              </h2>
              <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
                Create payment sessions, receive automated callbacks, verify TrxIDs, and sync inventory effortlessly with our developer-first API.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Idempotency key support on all mutating endpoints</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>HMAC-SHA256 request and webhook signatures</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Sandbox / Live mode credential isolation</span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => onNavigate('docs')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition"
                >
                  Read Full API Documentation
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                {/* Code Tabs */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveLang('curl')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${
                        activeLang === 'curl' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setActiveLang('node')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${
                        activeLang === 'node' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Node.js
                    </button>
                    <button
                      onClick={() => setActiveLang('python')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${
                        activeLang === 'python' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Python
                    </button>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-4 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed max-h-96">
                  <pre>{codeSnippets[activeLang]}</pre>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing / Tiers */}
      <section className="py-20 bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Transparent Pricing</h2>
            <h3 className="mt-2 text-3xl font-extrabold text-zinc-900 sm:text-4xl">No per-transaction percentage cuts</h3>
            <p className="mt-3 text-zinc-600 text-sm">
              Keep 100% of your earnings. Flat subscription models designed for growing Bangladeshi merchants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-zinc-900">Starter</h4>
                <p className="text-xs text-zinc-500 mt-1">For single-store bootstrap merchants</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-zinc-900">৳ 990</span>
                  <span className="text-xs text-zinc-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-zinc-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>1 Android Collector Device</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Up to 2 MFS Wallets (bKash/Nagad)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Instant TrxID Verification Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Signed Webhook Delivery</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('merchant')}
                className="mt-8 w-full rounded-xl border border-zinc-300 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition"
              >
                Choose Starter
              </button>
            </div>

            {/* Growth (Featured) */}
            <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50/20 p-8 shadow-md flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Most Popular
              </span>

              <div>
                <h4 className="text-lg font-bold text-zinc-900">Growth Pro</h4>
                <p className="text-xs text-zinc-500 mt-1">For high-volume e-commerce & SaaS</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-zinc-900">৳ 2,490</span>
                  <span className="text-xs text-zinc-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-zinc-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Up to 5 Android Collector Devices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Unlimited bKash & Nagad Wallets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Automatic SMS-to-Invoice Matcher</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Balance Verification Layer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Fraud & Risk Detection Engine</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('merchant')}
                className="mt-8 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition"
              >
                Choose Growth Pro
              </button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-zinc-900">Enterprise Dedicated</h4>
                <p className="text-xs text-zinc-500 mt-1">For platforms with dedicated on-premise setups</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-zinc-900">৳ 6,990</span>
                  <span className="text-xs text-zinc-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-zinc-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Unlimited Devices & SIM Collectors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Custom Docker / Kubernetes On-Premise</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Dedicated SLA & Priority 24/7 Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Custom Webhook Retry Policies</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('merchant')}
                className="mt-8 w-full rounded-xl border border-zinc-300 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-12 border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span>PaySync MFS Gateway</span>
            </div>
            <div className="text-xs text-zinc-500 text-center md:text-right">
              Built with Next.js, Node.js, MongoDB & Native Kotlin Android.<br />
              Zero official API dependencies. High-security HMAC signed pipeline.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
