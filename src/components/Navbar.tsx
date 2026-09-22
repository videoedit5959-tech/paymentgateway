import React from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Terminal, 
  LayoutDashboard, 
  ShieldAlert, 
  CreditCard,
  MessageSquareCode,
  Sparkles,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { IUser, IMerchant } from '../types';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentUser: IUser | null;
  currentMerchant: IMerchant | null;
  onLogout: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenSimulator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  currentUser,
  currentMerchant,
  onLogout,
  onOpenAuth,
  onOpenSimulator,
}) => {
  const isMerchant = currentUser?.role === 'MERCHANT_OWNER' || currentUser?.role === 'MERCHANT_STAFF';
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setCurrentView('landing')}
          className="flex cursor-pointer items-center gap-2.5 font-bold text-zinc-900 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-zinc-900 leading-tight">PaySync</span>
            <span className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">Non-API MFS Gateway</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-600">
          <button
            onClick={() => setCurrentView('landing')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentView === 'landing' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentView('merchant')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'merchant' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-emerald-600" />
            Merchant Portal
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'admin' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
            Admin Panel
          </button>
          <button
            onClick={() => setCurrentView('android-code')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'android-code' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Smartphone className="h-4 w-4 text-rose-500" />
            Android App
          </button>
          <button
            onClick={() => setCurrentView('docs')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'docs' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Terminal className="h-4 w-4 text-zinc-600" />
            API Docs
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live SMS Ingestion Simulator button */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:border-emerald-300"
            title="Simulate incoming bKash/Nagad SMS on merchant phone"
          >
            <MessageSquareCode className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Simulate SMS</span>
          </button>

          {/* Checkout Demo Shortcut */}
          <button
            onClick={() => setCurrentView('checkout-demo')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            title="Open customer payment checkout screen"
          >
            <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Checkout Demo</span>
          </button>

          {/* User Auth state */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-900">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : currentMerchant?.businessName || 'Merchant'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
