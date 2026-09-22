import React, { useState, useEffect } from 'react';
import { X, QrCode, Smartphone, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { IWallet } from '../types';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: IWallet[];
  merchantId: string;
  onDevicePaired: () => void;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  onClose,
  wallets,
  merchantId,
  onDevicePaired,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [deviceName, setDeviceName] = useState('My Collector Phone');
  const [pairingData, setPairingData] = useState<{
    pairingToken: string;
    deviceId: string;
    expiresAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (wallets.length > 0) {
        setSelectedWalletId(wallets[0].id);
      }
      generatePairingToken();
    } else {
      setPairingData(null);
      setPairingSuccess(false);
    }
  }, [isOpen, wallets]);

  if (!isOpen) return null;

  const generatePairingToken = async () => {
    setLoading(true);
    try {
      const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
      const res = await fetch('/api/devices/pairing-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
        body: JSON.stringify({
          merchantId,
          walletId: selectedWallet?.id,
          provider: selectedWallet?.provider || 'BKASH',
          deviceName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPairingData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScanAndPair = async () => {
    if (!pairingData) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          pairingToken: pairingData.pairingToken,
          deviceId: pairingData.deviceId,
          androidVersion: '14',
          appVersion: '1.2.0',
          modelName: 'Samsung Galaxy A54 (SIM 1)',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPairingSuccess(true);
        onDevicePaired();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-zinc-900 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold">Pair Android Collector Device</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          {pairingSuccess ? (
            <div className="py-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Device Connected & Active!</h4>
              <p className="text-xs text-zinc-600 mt-1">
                Your Android Collector is now registered. All incoming SMS messages on this SIM will be ingested automatically.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600">
                Open the <strong>PaySync Collector</strong> app on your merchant phone, tap <strong>Scan QR</strong>, and scan the pairing code below:
              </p>

              {/* QR Code Mock Box */}
              <div className="mx-auto flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
                {loading ? (
                  <RefreshCw className="h-10 w-10 animate-spin text-emerald-600" />
                ) : (
                  <>
                    <div className="h-44 w-44 rounded-lg bg-white p-2 border border-zinc-200 shadow-inner flex items-center justify-center relative">
                      {/* Stylized QR representation */}
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-zinc-900 rounded">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-sm ${
                              (i % 2 === 0 || i % 5 === 0 || i === 0 || i === 5 || i === 30 || i === 35)
                                ? 'bg-white'
                                : 'bg-zinc-900'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 font-mono text-xs font-bold text-zinc-800 bg-zinc-200 px-3 py-1 rounded">
                      {pairingData?.pairingToken || 'Generating token...'}
                    </div>
                  </>
                )}
              </div>

              <div className="text-[11px] text-zinc-500">
                Token expires in 10 minutes. Single-use only. Never share pairing tokens.
              </div>

              {/* Browser Simulation Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateScanAndPair}
                  disabled={simulating || loading}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Simulating Android Pairing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4" />
                      Simulate App Scanning & Connecting
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
