import React, { useState } from 'react';
import { X, Lock, Mail, Phone, Building, User, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { IUser, IMerchant } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: IUser, merchant: IMerchant | null, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('E-commerce');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { businessName, ownerName, email, phone, password, businessType };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        localStorage.setItem('paysync_token', json.data.tokens.accessToken);
        localStorage.setItem('paysync_user', JSON.stringify(json.data.user));
        if (json.data.merchant) {
          localStorage.setItem('paysync_merchant', JSON.stringify(json.data.merchant));
        }
        onSuccess(json.data.user, json.data.merchant || null, json.data.tokens.accessToken);
        onClose();
      } else {
        setError(json.error?.message || 'Authentication failed. Please check details.');
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  const quickFillMerchant = () => {
    setEmail('merchant@paysync.local');
    setPassword('Merchant@12345');
  };

  const quickFillAdmin = () => {
    setEmail('admin@paysync.local');
    setPassword('Admin@12345');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-zinc-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold">
              {mode === 'login' ? 'Sign in to PaySync' : 'Register Merchant Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-zinc-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                mode === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                mode === 'register' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              New Merchant
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Acme Fashion Ltd"
                      className="w-full rounded-xl border border-zinc-300 pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Owner / Manager Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full rounded-xl border border-zinc-300 pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Merchant Phone (bKash/Nagad)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full rounded-xl border border-zinc-300 pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-zinc-300 pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-300 pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Merchant Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Quick Fill Buttons for Fast Review */}
          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <span className="text-[11px] font-semibold text-zinc-500 block mb-2">1-Click Demo Logins:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={quickFillMerchant}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left hover:bg-zinc-100 text-xs transition"
                >
                  <div className="font-bold text-zinc-900 text-[11px]">Merchant Portal</div>
                  <div className="text-[10px] text-zinc-500">merchant@paysync.local</div>
                </button>
                <button
                  type="button"
                  onClick={quickFillAdmin}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left hover:bg-zinc-100 text-xs transition"
                >
                  <div className="font-bold text-zinc-900 text-[11px]">Super Admin</div>
                  <div className="text-[10px] text-zinc-500">admin@paysync.local</div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
