import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Cpu,
  Layers,
  Copy,
  Info
} from 'lucide-react';

interface SmsSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSmsIngested?: () => void;
}

export const SmsSimulatorModal: React.FC<SmsSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSmsIngested,
}) => {
  const [provider, setProvider] = useState<'BKASH' | 'NAGAD'>('BKASH');
  const [deviceId, setDeviceId] = useState('GALAXY-A54-BKASH');
  const [customSms, setCustomSms] = useState(
    'You have received Tk 1,500.00 from 01987654321. Ref: INV-2026-002. Fee Tk 0.00. Balance Tk 42,500.00. TrxID 9K492ABC at 22/09/2026 14:32'
  );
  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  if (!isOpen) return null;

  const testScenarios = [
    {
      id: 'bkash_match_850',
      title: 'bKash Tk 850 (Matches INV-2026-001)',
      desc: 'Exact match for pending order #INV-2026-001',
      provider: 'BKASH' as const,
      deviceId: 'GALAXY-A54-BKASH',
      badge: 'Auto-Match Success',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      sms: 'You have received payment Tk 850.00 from 01712345678. Ref: INV-2026-001. Fee Tk 0.00. Balance Tk 43,350.00. TrxID BKL94827X1 at 22/09/2026 15:40',
    },
    {
      id: 'bkash_match_1500',
      title: 'bKash Tk 1,500 (Matches INV-2026-002)',
      desc: 'Send Money received with TrxID 9K492ABC',
      provider: 'BKASH' as const,
      deviceId: 'GALAXY-A54-BKASH',
      badge: 'Pending Order',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      sms: 'You have received Tk 1,500.00 from 01987654321. Ref: INV-2026-002. Fee Tk 0.00. Balance Tk 42,500.00. TrxID 9K492ABC at 22/09/2026 14:32',
    },
    {
      id: 'nagad_match_750',
      title: 'Nagad Tk 750 (Matches INV-2026-003)',
      desc: 'Nagad Money Received with TxnID 72N8K102',
      provider: 'NAGAD' as const,
      deviceId: 'PIXEL-7-NAGAD',
      badge: 'Nagad SIM 2',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      sms: 'Money Received. Amount: Tk 750.00. Sender: 01822334455. TxnID: 72N8K102. Balance: Tk 19,450.00 at 22/09/2026 16:05.',
    },
    {
      id: 'amount_mismatch',
      title: 'Amount Mismatch (Tk 300 Partial)',
      desc: 'Customer sent Tk 300 instead of Tk 850 required',
      provider: 'BKASH' as const,
      deviceId: 'GALAXY-A54-BKASH',
      badge: 'Trigger Manual Review',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      sms: 'You have received payment Tk 300.00 from 01712345678. Ref: INV-2026-001. Fee Tk 0.00. Balance Tk 42,800.00. TrxID BKL300MMX9 at 22/09/2026 15:45',
    },
    {
      id: 'non_mfs_spam',
      title: 'Non-MFS / Personal Spam SMS',
      desc: 'Privacy filter test: should be safely rejected',
      provider: 'BKASH' as const,
      deviceId: 'GALAXY-A54-BKASH',
      badge: 'Privacy Filter Test',
      badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      sms: 'Hey brother, are you joining dinner tonight? Call me at 8pm.',
    },
  ];

  const handleSelectScenario = (sc: typeof testScenarios[0]) => {
    setCustomSms(sc.sms);
    setProvider(sc.provider);
    setDeviceId(sc.deviceId);
  };

  const handleSimulateSms = async () => {
    setLoading(true);
    setResponseLog(null);
    try {
      const res = await fetch('/api/v1/device/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          'X-Device-Token': 'dtok_demo_simulation',
        },
        body: JSON.stringify({
          deviceId,
          message: customSms,
          receivedAt: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      setResponseLog(json);
      if (json.success && onSmsIngested) {
        onSmsIngested();
      }
    } catch (err: any) {
      setResponseLog({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-zinc-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Android Collector SMS Ingestion Simulator</h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  v1.2.0 API Client
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Emulate real background HTTP push from physical Android collector device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          
          {/* Quick Scenarios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-800">Verification Test Scenarios</label>
              <span className="text-[11px] text-zinc-500">Click any preset to load</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testScenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc)}
                  className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                    customSms === sc.sms
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-900 leading-snug">{sc.title}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{sc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Device & Provider Configuration */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Source Android Device ID</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="GALAXY-A54-BKASH">Samsung Galaxy A54 (SIM 1 - bKash)</option>
                <option value="PIXEL-7-NAGAD">Google Pixel 7 (SIM 2 - Nagad)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">MFS Provider Filter</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="BKASH">bKash (Send Money / Payment)</option>
                <option value="NAGAD">Nagad (Money Received)</option>
              </select>
            </div>
          </div>

          {/* Raw SMS Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-800">Raw Incoming SMS Notification Message</label>
              <span className="text-[10px] font-mono text-zinc-500">{customSms.length} chars</span>
            </div>
            <textarea
              rows={3}
              value={customSms}
              onChange={(e) => setCustomSms(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 p-3 font-mono text-xs text-zinc-800 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-inner"
              placeholder="Paste actual bKash or Nagad SMS notification message..."
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
              <span>Authentication: Device Token + X-Device-Id + SHA-256 Replay Guard</span>
              <span className="font-mono text-zinc-400">POST /api/v1/device/sms</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleSimulateSms}
            disabled={loading || !customSms.trim()}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Dispatching to Production Verification Engine...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Transmit SMS via Device API (POST /api/v1/device/sms)
              </>
            )}
          </button>

          {/* Response Inspector */}
          {responseLog && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-white shadow-md">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  Ingestion Engine Response Inspector
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  responseLog.success && responseLog.accepted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : responseLog.duplicate
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {responseLog.duplicate
                    ? 'DUPLICATE (SAFE IGNORE)'
                    : responseLog.accepted
                    ? 'ACCEPTED & VERIFIED'
                    : responseLog.reason || 'REJECTED'}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 p-1">
                {JSON.stringify(responseLog, null, 2)}
              </pre>
              {responseLog.autoMatched && (
                <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-[11px] text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span><strong>Automatic Order Fulfillment Triggered!</strong> Pending checkout session was automatically matched and marked COMPLETED. Webhook dispatched.</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
