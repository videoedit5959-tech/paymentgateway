import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { MerchantDashboard } from './components/MerchantDashboard';
import { AdminPanel } from './components/AdminPanel';
import { CheckoutView } from './components/CheckoutView';
import { AndroidCodeViewer } from './components/AndroidCodeViewer';
import { AndroidAppReleaseCenter } from './components/AndroidAppReleaseCenter';
import { ApiDocs } from './components/ApiDocs';
import { SmsSimulatorModal } from './components/SmsSimulatorModal';
import { AuthModal } from './components/AuthModal';
import { IUser, IMerchant } from './types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string>('PAY-1002-PENDING');

  // Auth state
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [currentMerchant, setCurrentMerchant] = useState<IMerchant | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Simulator Modal state
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check URL params or localStorage on initial load
  useEffect(() => {
    // Check path for direct checkout navigation
    const path = window.location.pathname;
    if (path.startsWith('/checkout/')) {
      const pId = path.replace('/checkout/', '');
      setCheckoutPaymentId(pId);
      setCurrentView('checkout-demo');
    }

    // Check stored user session
    const storedUser = localStorage.getItem('paysync_user');
    const storedMerchant = localStorage.getItem('paysync_merchant');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default to demo merchant for instantaneous zero-hurdle evaluation
      const defaultUser: IUser = {
        id: 'usr_demo_merchant',
        merchantId: 'merch_demo_101',
        email: 'merchant@paysync.local',
        name: 'Tanvir Ahmed',
        role: 'MERCHANT_OWNER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const defaultMerchant: IMerchant = {
        id: 'merch_demo_101',
        businessName: 'Dhaka Digital Commerce Ltd',
        ownerName: 'Tanvir Ahmed',
        email: 'merchant@paysync.local',
        phone: '01711000111',
        status: 'ACTIVE',
        businessType: 'E-commerce & SaaS',
        webhookUrl: 'https://yourstore.com/api/webhook/paysync',
        webhookSecret: 'whsec_demo_secret_key_8829',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(defaultUser);
      setCurrentMerchant(defaultMerchant);
    }

    if (storedMerchant) {
      try {
        setCurrentMerchant(JSON.parse(storedMerchant));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('paysync_token');
    localStorage.removeItem('paysync_user');
    localStorage.removeItem('paysync_merchant');
    setCurrentUser(null);
    setCurrentMerchant(null);
    setCurrentView('landing');
    showToast('Logged out successfully');
  };

  const handleAuthSuccess = (user: IUser, merchant: IMerchant | null, token: string) => {
    setCurrentUser(user);
    setCurrentMerchant(merchant);
    showToast(`Welcome, ${user.name}!`);
    if (user.role === 'SUPER_ADMIN') {
      setCurrentView('admin');
    } else {
      setCurrentView('merchant');
    }
  };

  const handleOpenCheckout = (paymentId?: string) => {
    if (paymentId) {
      setCheckoutPaymentId(paymentId);
    }
    setCurrentView('checkout-demo');
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        currentMerchant={currentMerchant}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenSimulator={() => setSimulatorOpen(true)}
      />

      {/* Main Content Area */}
      <main>
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(view) => setCurrentView(view)}
            onOpenSimulator={() => setSimulatorOpen(true)}
          />
        )}

        {currentView === 'merchant' && (
          <MerchantDashboard
            merchant={currentMerchant}
            onOpenSimulator={() => setSimulatorOpen(true)}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {currentView === 'admin' && <AdminPanel currentUser={currentUser} />}

        {currentView === 'checkout-demo' && (
          <CheckoutView
            paymentId={checkoutPaymentId}
            onOpenSimulator={() => setSimulatorOpen(true)}
            onBackToHome={() => setCurrentView('merchant')}
          />
        )}

        {(currentView === 'android-code' || currentView === 'android-app') && (
          <AndroidAppReleaseCenter
            currentUser={currentUser}
            currentMerchant={currentMerchant}
            onOpenSimulator={() => setSimulatorOpen(true)}
          />
        )}

        {currentView === 'docs' && <ApiDocs />}
      </main>

      {/* SMS Simulator Modal */}
      <SmsSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSmsIngested={() => {
          showToast('SMS Ingested & Verification Engine processed incoming payment!');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-3">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded p-0.5 text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
