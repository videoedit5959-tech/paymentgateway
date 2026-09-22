import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Smartphone, 
  CreditCard, 
  FileText, 
  Key, 
  Webhook, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  QrCode, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  Copy,
  Check
} from 'lucide-react';
import { IMerchant, IWallet, IDevice, IPayment, ITransaction, IApiKey, IWebhookLog } from '../types';
import { DevicePairingModal } from './DevicePairingModal';

interface MerchantDashboardProps {
  merchant: IMerchant | null;
  onOpenSimulator: () => void;
  onOpenCheckout: (paymentId?: string) => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  merchant,
  onOpenSimulator,
  onOpenCheckout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'wallets' | 'devices' | 'payments' | 'transactions' | 'api-keys' | 'webhooks'
  >('overview');

  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [apiKeys, setApiKeys] = useState<IApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<IWebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showPairModal, setShowPairModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);

  // New Wallet Form state
  const [newWalletProvider, setNewWalletProvider] = useState<'BKASH' | 'NAGAD'>('BKASH');
  const [newWalletNumber, setNewWalletNumber] = useState('');
  const [newWalletType, setNewWalletType] = useState<'PERSONAL' | 'MERCHANT' | 'AGENT'>('MERCHANT');
  const [newWalletName, setNewWalletName] = useState('');

  // New Payment Form state
  const [newPaymentAmount, setNewPaymentAmount] = useState('1250');
  const [newPaymentInvoice, setNewPaymentInvoice] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [newPaymentCustomer, setNewPaymentCustomer] = useState('Rahim Karim');
  const [newPaymentPhone, setNewPaymentPhone] = useState('01712345678');

  // Generated API Key state
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: IApiKey; secretKey: string } | null>(null);

  const merchantId = merchant?.id || 'merch_demo_101';

  useEffect(() => {
    loadDashboardData();
  }, [merchantId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('paysync_token') || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [wRes, dRes, pRes, tRes, kRes] = await Promise.all([
        fetch(`/api/wallets?merchantId=${merchantId}`, { headers }),
        fetch(`/api/devices?merchantId=${merchantId}`, { headers }),
        fetch(`/api/payments?merchantId=${merchantId}`, { headers }),
        fetch(`/api/transactions?merchantId=${merchantId}`, { headers }),
        fetch(`/api/api-keys?merchantId=${merchantId}`, { headers }),
      ]);

      const [wJson, dJson, pJson, tJson, kJson] = await Promise.all([
        wRes.json(),
        dRes.json(),
        pRes.json(),
        tRes.json(),
        kRes.json(),
      ]);

      if (wJson.success) setWallets(wJson.data);
      if (dJson.success) setDevices(dJson.data);
      if (pJson.success) setPayments(pJson.data);
      if (tJson.success) setTransactions(tJson.data);
      if (kJson.success) setApiKeys(kJson.data);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token')}`,
        },
        body: JSON.stringify({
          merchantId,
          provider: newWalletProvider,
          walletNumber: newWalletNumber,
          walletType: newWalletType,
          displayName: newWalletName || `${newWalletProvider} Wallet`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddWalletModal(false);
        setNewWalletNumber('');
        setNewWalletName('');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePaymentSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          amount: Number(newPaymentAmount),
          invoiceId: newPaymentInvoice,
          customer: { name: newPaymentCustomer, phone: newPaymentPhone },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreatePaymentModal(false);
        loadDashboardData();
        onOpenCheckout(json.data.paymentId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token')}`,
        },
        body: JSON.stringify({
          merchantId,
          name: `API Key (${new Date().toLocaleDateString()})`,
          mode: 'live',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedKey(json.data);
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      
      {/* Merchant Header Bar */}
      <div className="border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                Merchant Portal
              </span>
              <span className="text-xs text-zinc-500">ID: {merchantId}</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 mt-1">
              {merchant?.businessName || 'Dhaka Digital Commerce Ltd'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Owner: {merchant?.ownerName || 'Tanvir Ahmed'} &bull; Phone: {merchant?.phone || '01711000111'}
            </p>
          </div>

          {/* Quick Action Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreatePaymentModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
            >
              <Plus className="h-4 w-4" />
              New Payment Link
            </button>

            <button
              onClick={() => setShowPairModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
            >
              <QrCode className="h-4 w-4 text-zinc-600" />
              Pair Phone (QR)
            </button>

            <button
              onClick={onOpenSimulator}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
            >
              <Zap className="h-4 w-4 text-emerald-600" />
              Test SMS Arrival
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-zinc-200 pb-px mb-8 space-x-1 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'wallets', label: `Wallets (${wallets.length})`, icon: Wallet },
            { id: 'devices', label: `Collector Devices (${devices.length})`, icon: Smartphone },
            { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
            { id: 'transactions', label: `SMS Feed (${transactions.length})`, icon: FileText },
            { id: 'api-keys', label: 'API Keys', icon: Key },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                  <span>Total Verified Volume</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Live
                  </span>
                </div>
                <div className="mt-3 text-2xl font-black text-zinc-900">
                  ৳ {totalRevenue.toLocaleString()} <span className="text-xs font-semibold text-zinc-400">BDT</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  From {completedPayments.length} completed customer orders
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                  <span>Pending Checkouts</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-3 text-2xl font-black text-amber-600">
                  {pendingCount}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Awaiting TrxID or SMS arrival
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                  <span>Active Collector Phones</span>
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-3 text-2xl font-black text-zinc-900">
                  {onlineDevicesCount} / {devices.length}
                </div>
                <div className="mt-1 text-xs text-emerald-600 font-medium">
                  SIM SMS Listeners Operational
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                  <span>Active MFS Wallets</span>
                  <Wallet className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="mt-3 text-2xl font-black text-zinc-900">
                  {wallets.length}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  bKash & Nagad numbers receiving money
                </div>
              </div>

            </div>

            {/* Quick Status Bar */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">SMS Verification Engine is Active</div>
                  <div className="text-[11px] text-zinc-600">
                    Incoming transaction SMS forwarded by your Android devices are automatically matched with pending invoices.
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenSimulator}
                className="whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
              >
                Simulate SMS Arrival &rarr;
              </button>
            </div>

            {/* Recent Payments Table */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Recent Payment Sessions</h3>
                  <p className="text-xs text-zinc-500">Real-time status of invoices and customer verifications</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-3">Invoice & ID</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Matched TrxID</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900">{p.invoiceId}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{p.paymentId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900">{p.customer?.name || 'Walk-in'}</div>
                          <div className="text-[10px] text-zinc-400">{p.customer?.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-zinc-900">
                          ৳ {p.amount.toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">BDT</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              p.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {p.status === 'COMPLETED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-zinc-700">
                          {p.matchedTrxId || <span className="text-zinc-400 font-normal">Pending</span>}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => onOpenCheckout(p.paymentId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                          >
                            Open Checkout
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WALLETS */}
        {activeTab === 'wallets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">MFS Wallets</h3>
                <p className="text-xs text-zinc-500">Manage bKash and Nagad numbers configured to receive payments</p>
              </div>
              <button
                onClick={() => setShowAddWalletModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-zinc-800 transition"
              >
                <Plus className="h-4 w-4" />
                Add New Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wallets.map((w) => (
                <div key={w.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`h-7 px-2.5 rounded-md flex items-center justify-center font-bold text-xs text-white ${
                          w.provider === 'BKASH' ? 'bg-pink-600' : 'bg-orange-600'
                        }`}
                      >
                        {w.provider}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 uppercase">
                        {w.walletType}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-zinc-400 font-medium">Wallet Number</div>
                      <div className="text-xl font-black text-zinc-900 font-mono tracking-wider">{w.walletNumber}</div>
                      <div className="text-xs font-semibold text-zinc-700 mt-1">{w.displayName}</div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Reported Balance</span>
                      <span className="font-bold text-zinc-900 font-mono">
                        ৳ {w.currentBalance?.toLocaleString() || '0'} BDT
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active & Receiving
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Device: {w.deviceId || 'Any Active SIM'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DEVICES */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Android SMS Collector Devices</h3>
                <p className="text-xs text-zinc-500">Android phones running the PaySync native APK to read incoming MFS SMS</p>
              </div>
              <button
                onClick={() => setShowPairModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-zinc-800 transition"
              >
                <QrCode className="h-4 w-4" />
                Pair Device via QR
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices.map((d) => (
                <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white shadow">
                        <Smartphone className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{d.deviceName}</h4>
                        <div className="font-mono text-xs text-zinc-400">{d.deviceId}</div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        d.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-zinc-50 p-3 text-xs border border-zinc-100">
                    <div>
                      <div className="text-zinc-400 text-[10px]">Battery</div>
                      <div className="font-bold text-zinc-900 flex items-center gap-1 mt-0.5">
                        <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                        {d.batteryLevel}%
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-[10px]">Network</div>
                      <div className="font-bold text-zinc-900 flex items-center gap-1 mt-0.5">
                        <Wifi className="h-3.5 w-3.5 text-indigo-600" />
                        {d.networkStatus}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-[10px]">App Version</div>
                      <div className="font-bold text-zinc-900 mt-0.5">v{d.appVersion}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-100">
                    <span>Last Heartbeat: {new Date(d.lastSeenAt).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/devices/${d.id}/status`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${localStorage.getItem('paysync_token')}`,
                              },
                              body: JSON.stringify({ status: d.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' }),
                            });
                            if (res.ok) loadDashboardData();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="font-semibold text-zinc-600 hover:text-zinc-900"
                        title="Toggle status"
                      >
                        {d.status === 'ONLINE' ? 'Pause' : 'Activate'}
                      </button>
                      <span>&bull;</span>
                      <button
                        onClick={onOpenSimulator}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        Send Test SMS
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">All Payments</h3>
                <p className="text-xs text-zinc-500">Complete ledger of customer checkouts and verification records</p>
              </div>
              <button
                onClick={() => setShowCreatePaymentModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
              >
                <Plus className="h-4 w-4" />
                Create Payment Session
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-3">Invoice & Payment ID</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Matched TrxID</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-zinc-900">{p.invoiceId}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{p.paymentId}</div>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-700">
                          {p.customer?.name || 'Customer'}<br />
                          <span className="text-[10px] text-zinc-400">{p.customer?.phone}</span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-zinc-900">
                          ৳ {p.amount} BDT
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-zinc-800">
                          {p.matchedTrxId || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-500 text-[11px]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          <button
                            onClick={() => onOpenCheckout(p.paymentId)}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Checkout View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TRANSACTIONS (RAW SMS FEED) */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">SMS Ingestion Stream</h3>
                <p className="text-xs text-zinc-500">Live feed of raw bKash & Nagad SMS forwarded from Android devices</p>
              </div>
              <button
                onClick={onOpenSimulator}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
              >
                <Zap className="h-4 w-4" />
                Simulate Ingestion
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-3">TrxID & Provider</th>
                      <th className="px-6 py-3">Parsed Amount</th>
                      <th className="px-6 py-3">Sender Phone</th>
                      <th className="px-6 py-3">Raw SMS Text</th>
                      <th className="px-6 py-3">Used For Order</th>
                      <th className="px-6 py-3">Received At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3.5">
                          <div className="font-mono font-bold text-zinc-900">{t.trxId}</div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${
                              t.provider === 'BKASH' ? 'bg-pink-600' : 'bg-orange-600'
                            }`}
                          >
                            {t.provider}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-zinc-900">
                          ৳ {t.amount} BDT
                        </td>
                        <td className="px-6 py-3.5 font-mono text-zinc-600">
                          {t.sender || 'Anonymous'}
                        </td>
                        <td className="px-6 py-3.5 max-w-xs truncate text-[11px] text-zinc-500 font-mono" title={t.rawSms}>
                          {t.rawSms}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.used ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {t.used ? `Used (${t.usedForPaymentId})` : 'Unused'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[11px] text-zinc-400">
                          {new Date(t.smsTimestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: API KEYS */}
        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">API Credentials</h3>
                <p className="text-xs text-zinc-500">Authenticate server-to-server requests to initiate checkout sessions</p>
              </div>
              <button
                onClick={handleGenerateApiKey}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-zinc-800 transition"
              >
                <Plus className="h-4 w-4" />
                Generate New API Key
              </button>
            </div>

            {/* Generated Secret Alert */}
            {generatedKey && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  API Key Created! Copy the secret now:
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-200 font-mono text-xs text-zinc-900 break-all select-all">
                  {generatedKey.secretKey}
                </div>
                <div className="text-[11px] text-emerald-800 mt-2">
                  This secret key will never be shown again. Store it securely in your server's .env file.
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3">Key Name</th>
                    <th className="px-6 py-3">Key Prefix</th>
                    <th className="px-6 py-3">Mode</th>
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-bold text-zinc-900">{k.name}</td>
                      <td className="px-6 py-4 font-mono font-bold text-zinc-700">{k.keyPrefix}••••••••</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                          {k.mode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-[11px]">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: WEBHOOKS */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 mb-1">Webhook Configuration</h3>
              <p className="text-xs text-zinc-500 mb-4">
                PaySync dispatches an HMAC-SHA256 signed JSON POST event immediately upon verified payment completion.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Endpoint URL</label>
                  <input
                    type="text"
                    readOnly
                    value={merchant?.webhookUrl || 'https://yourstore.com/api/webhook/paysync'}
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 font-mono text-xs text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Signing Secret (HMAC-SHA256)</label>
                  <input
                    type="text"
                    readOnly
                    value={merchant?.webhookSecret || 'whsec_demo_secret_key_8829'}
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 font-mono text-xs text-zinc-800"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
              <h4 className="text-sm font-bold text-zinc-900 mb-3">Sample Webhook JSON Payload</h4>
              <pre className="rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
{`{
  "event": "payment.completed",
  "paymentId": "PAY-1001-INV",
  "invoiceId": "INV-2026-001",
  "amount": 850,
  "currency": "BDT",
  "provider": "BKASH",
  "trxId": "BKL94827X1",
  "status": "COMPLETED",
  "timestamp": "2026-09-22T06:30:15.123Z"
}`}
              </pre>
            </div>
          </div>
        )}

      </div>

      {/* Modal 1: QR Pair Device */}
      <DevicePairingModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        wallets={wallets}
        merchantId={merchantId}
        onDevicePaired={loadDashboardData}
      />

      {/* Modal 2: Add Wallet */}
      {showAddWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Add MFS Wallet Number</h3>
            <form onSubmit={handleCreateWallet} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Provider</label>
                <select
                  value={newWalletProvider}
                  onChange={(e) => setNewWalletProvider(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 font-semibold text-zinc-800"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Wallet Type</label>
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 font-semibold text-zinc-800"
                >
                  <option value="MERCHANT">Merchant Wallet (Make Payment)</option>
                  <option value="PERSONAL">Personal Wallet (Send Money)</option>
                  <option value="AGENT">Agent Wallet (Cash In)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX"
                  value={newWalletNumber}
                  onChange={(e) => setNewWalletNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Primary bKash Merchant"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWalletModal(false)}
                  className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  Save Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Payment Session */}
      {showCreatePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Initialize Customer Payment Session</h3>
            <form onSubmit={handleCreatePaymentSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  required
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 text-base font-bold font-mono text-zinc-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Invoice ID / Reference</label>
                <input
                  type="text"
                  required
                  value={newPaymentInvoice}
                  onChange={(e) => setNewPaymentInvoice(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={newPaymentCustomer}
                  onChange={(e) => setNewPaymentCustomer(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePaymentModal(false)}
                  className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Create & Launch Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
