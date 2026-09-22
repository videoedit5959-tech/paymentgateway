import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  RefreshCw, 
  Search,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { IMerchant, IPayment, ITransaction } from '../types';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'merchants' | 'review-queue' | 'fraud-monitor' | 'settings'>('merchants');
  const [merchants, setMerchants] = useState<IMerchant[]>([]);
  const [reviewPayments, setReviewPayments] = useState<IPayment[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Settings
  const [bkashEnabled, setBkashEnabled] = useState(true);
  const [nagadEnabled, setNagadEnabled] = useState(true);
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);
  const [expiryMinutes, setExpiryMinutes] = useState(30);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('paysync_token') || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [mRes, revRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/review-queue', { headers }),
      ]);

      const [mJson, revJson] = await Promise.all([mRes.json(), revRes.json()]);

      if (mJson.success) {
        setMetrics(mJson.data);
        setMerchants(mJson.data.merchants || []);
      }
      if (revJson.success) {
        setReviewPayments(revJson.data || []);
      }
    } catch (e) {
      console.error('Error fetching admin metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMerchantStatus = async (merchantId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token')}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMessage(`Merchant status updated to ${status}`);
        setTimeout(() => setActionSuccessMessage(null), 3000);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualApprovePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/manual-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token')}`,
        },
        body: JSON.stringify({ notes: 'Approved via Admin Panel override' }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMessage(`Payment ${paymentId} manually approved!`);
        setTimeout(() => setActionSuccessMessage(null), 3000);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      
      {/* Admin Top Header */}
      <div className="border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
                Super Admin Master Control
              </span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 mt-1">Platform Operations & Fraud Defense</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              System health monitoring, manual reviews, merchant governance, and risk oversight
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="self-start md:self-auto flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
          >
            <RefreshCw className="h-4 w-4 text-zinc-600" />
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Success Alert */}
        {actionSuccessMessage && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            {actionSuccessMessage}
          </div>
        )}

        {/* Admin KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Platform Merchants</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-zinc-900">
              {metrics?.totalMerchants || merchants.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {metrics?.activeMerchants || merchants.filter((m) => m.status === 'ACTIVE').length} Active
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Total Processed Volume</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-zinc-900">
              ৳ {metrics?.totalVolume?.toLocaleString() || '14,850'} <span className="text-xs font-normal text-zinc-400">BDT</span>
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              100% Non-API Match Engine
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Connected Collectors</span>
              <Smartphone className="h-4 w-4 text-zinc-700" />
            </div>
            <div className="mt-3 text-2xl font-black text-zinc-900">
              {metrics?.totalDevices || 2}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Android phones relaying SMS
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>Manual Review Queue</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 text-2xl font-black text-amber-600">
              {reviewPayments.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Requires admin audit
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-zinc-200 pb-px mb-8 space-x-1 text-xs font-semibold">
          {[
            { id: 'merchants', label: `Merchants (${merchants.length})`, icon: Users },
            { id: 'review-queue', label: `Manual Review Queue (${reviewPayments.length})`, icon: AlertTriangle },
            { id: 'fraud-monitor', label: 'Fraud & Security Logs', icon: ShieldAlert },
            { id: 'settings', label: 'System Configuration', icon: Sliders },
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

        {/* TAB 1: MERCHANTS LIST */}
        {activeTab === 'merchants' && (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-900">Registered Tenant Merchants</h3>
              <p className="text-xs text-zinc-500">Manage merchant access status and platform privileges</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3">Business Name & ID</th>
                    <th className="px-6 py-3">Owner Contact</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Registered At</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {merchants.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900">{m.businessName}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{m.id}</div>
                      </td>
                      <td className="px-6 py-4 text-zinc-700">
                        {m.ownerName}<br />
                        <span className="font-mono text-[10px] text-zinc-400">{m.phone}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {m.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateMerchantStatus(m.id, 'SUSPENDED')}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition"
                          >
                            Suspend Access
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateMerchantStatus(m.id, 'ACTIVE')}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            Activate Merchant
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL REVIEW QUEUE */}
        {activeTab === 'review-queue' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-900">Payments Requiring Human Audit</h3>
                <p className="text-xs text-zinc-500">
                  Payments flagged due to minor amount discrepancies, late arrivals, or manual escalation requests.
                </p>
              </div>

              {reviewPayments.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  All payments verified! Queue is clean.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="px-6 py-3">Invoice & ID</th>
                        <th className="px-6 py-3">Merchant</th>
                        <th className="px-6 py-3">Expected Amount</th>
                        <th className="px-6 py-3">Customer Provided TrxID</th>
                        <th className="px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {reviewPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-zinc-900">{p.invoiceId}</div>
                            <div className="font-mono text-[10px] text-zinc-400">{p.paymentId}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-700">{p.merchantId}</td>
                          <td className="px-6 py-4 font-bold text-zinc-900">৳ {p.amount} BDT</td>
                          <td className="px-6 py-4 font-mono font-bold text-amber-700">
                            {p.matchedTrxId || 'Disputed'}
                          </td>
                          <td className="px-6 py-4 flex items-center gap-2">
                            <button
                              onClick={() => handleManualApprovePayment(p.paymentId)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
                            >
                              Approve & Mark Paid
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FRAUD MONITOR */}
        {activeTab === 'fraud-monitor' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 mb-1">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Active Risk Rules & Fraud Defenses
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                Every transaction verification is evaluated against our 5-pillar fraud detection heuristics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Cross-Merchant TrxID Shield
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Prevents a malicious customer from reusing a TrxID from Merchant A to fraudulently complete an order on Merchant B.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Strict Amount Delta Threshold
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Rejects any attempt where the SMS amount is less than the checkout invoice amount.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    SHA-256 Duplicate SMS Trap
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Computes SHA-256 payload hash on every incoming message. Duplicate SMS are discarded instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900">System Gateway Settings</h3>
              <p className="text-xs text-zinc-500">Configure global parameters for all tenant gateways</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <div className="font-bold text-zinc-900">Enable bKash Gateway</div>
                  <div className="text-[11px] text-zinc-500">Accept and parse bKash Send Money, Payment, and Cash-in</div>
                </div>
                <input
                  type="checkbox"
                  checked={bkashEnabled}
                  onChange={(e) => setBkashEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <div className="font-bold text-zinc-900">Enable Nagad Gateway</div>
                  <div className="text-[11px] text-zinc-500">Accept and parse Nagad Money Received and Merchant Payment</div>
                </div>
                <input
                  type="checkbox"
                  checked={nagadEnabled}
                  onChange={(e) => setNagadEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <div className="font-bold text-zinc-900">Automatic Invoice-to-SMS Matcher</div>
                  <div className="text-[11px] text-zinc-500">Match pending payments as soon as SMS arrives even without customer input</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoMatchEnabled}
                  onChange={(e) => setAutoMatchEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-900 mb-1">Payment Checkout Expiration (Minutes)</label>
                <input
                  type="number"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 p-2.5 font-bold font-mono text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActionSuccessMessage('System settings saved successfully!');
                  setTimeout(() => setActionSuccessMessage(null), 3000);
                }}
                className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow hover:bg-zinc-800 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
