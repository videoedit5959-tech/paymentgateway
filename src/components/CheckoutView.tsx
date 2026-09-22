import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { IPayment, IWallet } from '../types';

interface CheckoutViewProps {
  paymentId?: string;
  onOpenSimulator: () => void;
  onBackToHome: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  paymentId = 'PAY-1002-PENDING',
  onOpenSimulator,
  onBackToHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [paymentData, setPaymentData] = useState<IPayment | null>(null);
  const [merchantName, setMerchantName] = useState('Dhaka Digital Commerce Ltd');
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'BKASH' | 'NAGAD'>('BKASH');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1740); // 29 mins

  // Load payment details from API
  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPaymentData(json.data.payment);
        setMerchantName(json.data.merchant?.businessName || 'Verified Merchant');
        if (json.data.availableWallets) {
          setWallets(json.data.availableWallets);
          if (json.data.availableWallets.length > 0) {
            setSelectedProvider(json.data.availableWallets[0].provider);
          }
        }
        if (json.data.payment?.status === 'COMPLETED') {
          setVerifySuccess(true);
        }
      } else {
        // Fallback default mock payment state for checkout preview
        setPaymentData({
          id: 'pay_demo_preview',
          paymentId: paymentId || 'PAY-1002-PENDING',
          amount: 1500,
          currency: 'BDT',
          invoiceId: 'INV-2026-002',
          customer: { name: 'Customer User', phone: '01987654321' },
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          mode: 'live',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          merchantId: 'merch_demo_101',
        });
        setWallets([
          {
            id: 'wal_b1',
            merchantId: 'merch_demo_101',
            provider: 'BKASH',
            walletNumber: '01711998877',
            walletType: 'MERCHANT',
            displayName: 'Official bKash Merchant Wallet',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'wal_n1',
            merchantId: 'merch_demo_101',
            provider: 'NAGAD',
            walletNumber: '01822887766',
            walletType: 'PERSONAL',
            displayName: 'Nagad Personal Wallet',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.warn('Could not fetch payment online, using offline state', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trxIdInput.trim()) {
      setVerifyError('Please enter the Transaction ID (TrxID) received on your phone.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trxId: trxIdInput.trim().toUpperCase() }),
      });

      const json = await res.json();
      if (json.success) {
        setVerifySuccess(true);
        setPaymentData(json.data.payment);
      } else {
        setVerifyError(json.error?.message || 'Verification failed. Please check TrxID and try again.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Network error verifying TrxID');
    } finally {
      setVerifying(false);
    }
  };

  const activeWallet = wallets.find((w) => w.provider === selectedProvider) || wallets[0] || {
    provider: 'BKASH',
    walletNumber: '01711998877',
    walletType: 'MERCHANT',
    displayName: 'Merchant Wallet',
  };

  const copyWalletNumber = () => {
    if (activeWallet) {
      navigator.clipboard.writeText(activeWallet.walletNumber);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const formatMinutes = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium text-zinc-600">Loading checkout session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-md">
        
        {/* Checkout Card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          
          {/* Header */}
          <div className="bg-zinc-900 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">PaySync Checkout</div>
                <h1 className="text-lg font-bold text-white mt-0.5">{merchantName}</h1>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400">Total Payable</div>
                <div className="text-xl font-black text-emerald-400">
                  ৳ {paymentData?.amount?.toLocaleString()} <span className="text-xs text-white">BDT</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>Invoice: <strong className="text-zinc-200">{paymentData?.invoiceId}</strong></span>
              <span className="flex items-center gap-1 font-mono text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                {formatMinutes(timeLeftSeconds)}
              </span>
            </div>
          </div>

          {/* Success State */}
          {verifySuccess ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900">Payment Completed!</h2>
              <p className="text-xs text-zinc-600 mt-1">
                Your transaction has been verified. Invoice <strong className="text-zinc-800">{paymentData?.invoiceId}</strong> is marked as PAID.
              </p>

              <div className="mt-6 rounded-xl bg-zinc-50 p-4 border border-zinc-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-zinc-900">{paymentData?.matchedTrxId || trxIdInput || 'BKL94827X1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Amount Paid:</span>
                  <span className="font-bold text-zinc-900">৳ {paymentData?.amount} BDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Webhook Status:</span>
                  <span className="text-emerald-700 font-semibold">Dispatched to Merchant</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={onBackToHome}
                  className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white hover:bg-zinc-800 transition"
                >
                  Return to Merchant Store
                </button>
              </div>
            </div>
          ) : (
            /* Active Payment Form */
            <div className="p-6">
              
              {/* Payment Method Selector */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* bKash Tab */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('BKASH')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 border text-xs font-bold transition ${
                      selectedProvider === 'BKASH'
                        ? 'border-pink-600 bg-pink-50 text-pink-700 ring-2 ring-pink-500/20'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <span className="h-5 w-5 rounded bg-pink-600 text-white flex items-center justify-center text-[10px] font-black">
                      bK
                    </span>
                    bKash
                  </button>

                  {/* Nagad Tab */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('NAGAD')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 border text-xs font-bold transition ${
                      selectedProvider === 'NAGAD'
                        ? 'border-orange-600 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <span className="h-5 w-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px] font-black">
                      না
                    </span>
                    Nagad
                  </button>

                </div>
              </div>

              {/* Wallet Instructions Box */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">
                    Send money to this {selectedProvider === 'BKASH' ? 'bKash' : 'Nagad'} Number:
                  </span>
                  <span className="text-[10px] font-semibold uppercase bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded">
                    {activeWallet.walletType}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2.5 border border-zinc-200">
                  <span className="font-mono text-base font-extrabold text-zinc-900 tracking-wider">
                    {activeWallet.walletNumber}
                  </span>
                  <button
                    type="button"
                    onClick={copyWalletNumber}
                    className="flex items-center gap-1 rounded bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition"
                  >
                    {copiedWallet ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWallet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-zinc-600 space-y-1">
                  <div>1. Open your <strong>{selectedProvider === 'BKASH' ? 'bKash' : 'Nagad'} App</strong></div>
                  <div>2. Choose <strong>{activeWallet.walletType === 'MERCHANT' ? 'Make Payment' : 'Send Money'}</strong> to the number above</div>
                  <div>3. Enter exact amount: <strong className="text-zinc-900">৳ {paymentData?.amount} BDT</strong></div>
                  <div>4. Enter reference: <strong className="text-zinc-900">{paymentData?.invoiceId}</strong></div>
                </div>
              </div>

              {/* Error Message */}
              {verifyError && (
                <div className="mb-4 rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{verifyError}</span>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={onOpenSimulator}
                        className="text-emerald-700 font-semibold underline hover:text-emerald-800"
                      >
                        Simulate SMS arrival now &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TrxID Input Form */}
              <form onSubmit={handleVerify}>
                <div className="mb-4">
                  <label htmlFor="trxIdInput" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Enter Transaction ID (TrxID)
                  </label>
                  <input
                    id="trxIdInput"
                    type="text"
                    value={trxIdInput}
                    onChange={(e) => setTrxIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. BKL94827X1 or 9K492ABC"
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Found in the confirmation SMS from {selectedProvider}.
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Verifying Transaction...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Verify Payment
                      </>
                    )}
                  </button>

                  {/* Simulator Shortcut helper for testing */}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setTrxIdInput('BKL94827X1')}
                      className="text-zinc-600 hover:text-zinc-900 underline"
                    >
                      Fill Sample TrxID (BKL94827X1)
                    </button>
                    <button
                      type="button"
                      onClick={onOpenSimulator}
                      className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Smartphone className="h-3 w-3" />
                      Test with SMS Simulator
                    </button>
                  </div>
                </div>
              </form>

            </div>
          )}

          {/* Secure Footer */}
          <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secured with PaySync Multi-Layer Verification Engine</span>
          </div>

        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <button
            onClick={onBackToHome}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition"
          >
            &larr; Back to Portal
          </button>
        </div>

      </div>
    </div>
  );
};
