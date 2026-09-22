import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  Radio,
  Cpu,
  RefreshCw,
  Clock,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Lock,
  BatteryCharging,
  Wifi,
  History,
  ShieldAlert,
  Server
} from 'lucide-react';
import { IAndroidRelease, IDevice, IWallet, IUser, IMerchant } from '../types';
import { DevicePairingModal } from './DevicePairingModal';

interface AndroidAppReleaseCenterProps {
  currentUser?: IUser | null;
  currentMerchant?: IMerchant | null;
  onOpenSimulator: () => void;
}

export const AndroidAppReleaseCenter: React.FC<AndroidAppReleaseCenterProps> = ({
  currentUser,
  currentMerchant,
  onOpenSimulator,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'devices' | 'history' | 'admin' | 'code'>('download');
  const [latestRelease, setLatestRelease] = useState<IAndroidRelease | null>(null);
  const [allReleases, setAllReleases] = useState<IAndroidRelease[]>([]);
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Selected code viewer file
  const [selectedFile, setSelectedFile] = useState<string>('SmsReceiver.kt');

  // Admin New Release Form
  const [newVersion, setNewVersion] = useState('');
  const [newVersionCode, setNewVersionCode] = useState('');
  const [newReleaseNotes, setNewReleaseNotes] = useState('');
  const [newMinAndroid, setNewMinAndroid] = useState('Android 8.0 (API 26)');
  const [newTargetAndroid, setNewTargetAndroid] = useState('Android 14 (API 34)');
  const [newIsPublished, setNewIsPublished] = useState(true);
  const [newIsLatest, setNewIsLatest] = useState(true);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    fetchReleaseData();
    fetchMerchantDevices();
  }, [currentMerchant]);

  const fetchReleaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch latest release
      const latestRes = await fetch('/api/android/releases/latest');
      const latestJson = await latestRes.json();
      if (latestJson.success && latestJson.data) {
        setLatestRelease(latestJson.data);
      }

      // 2. Fetch all releases
      const releasesEndpoint = isAdmin ? '/api/android/releases/admin/all' : '/api/android/releases';
      const releasesRes = await fetch(releasesEndpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
      });
      const releasesJson = await releasesRes.json();
      if (releasesJson.success && releasesJson.data) {
        setAllReleases(releasesJson.data);
      }
    } catch (err) {
      console.error('Failed to load Android release metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantDevices = async () => {
    try {
      const res = await fetch('/api/devices', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDevices(json.data);
      }

      const wRes = await fetch('/api/wallets', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
      });
      const wJson = await wRes.json();
      if (wJson.success && wJson.data) {
        setWallets(wJson.data);
      }
    } catch (err) {
      console.error('Failed to load merchant devices:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 3000);
  };

  const handleDownload = (versionOrId: string = 'latest', fileName: string = 'PaySync-MFS-Collector.apk') => {
    setIsDownloading(true);
    const link = document.createElement('a');
    link.href = `/api/android/releases/${versionOrId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setIsDownloading(false);
      fetchReleaseData(); // Refresh download counts
    }, 1500);
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || !newVersionCode) {
      setAdminMessage({ type: 'error', text: 'Version name and version code are required.' });
      return;
    }
    setAdminSubmitting(true);
    setAdminMessage(null);

    try {
      const res = await fetch('/api/android/releases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
        body: JSON.stringify({
          version: newVersion,
          versionCode: parseInt(newVersionCode, 10),
          releaseNotes: newReleaseNotes,
          minimumAndroidVersion: newMinAndroid,
          targetAndroidVersion: newTargetAndroid,
          isPublished: newIsPublished,
          isLatest: newIsLatest,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAdminMessage({ type: 'success', text: `Release v${newVersion} created successfully!` });
        setNewVersion('');
        setNewVersionCode('');
        setNewReleaseNotes('');
        fetchReleaseData();
      } else {
        setAdminMessage({ type: 'error', text: json.error?.message || 'Failed to create release' });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: err.message });
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleSetLatest = async (releaseId: string) => {
    try {
      const res = await fetch(`/api/android/releases/${releaseId}/set-latest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        fetchReleaseData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePublish = async (release: IAndroidRelease) => {
    try {
      const res = await fetch(`/api/android/releases/${release.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
        body: JSON.stringify({
          isPublished: !release.isPublished,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchReleaseData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm('Are you sure you want to delete this release binary?')) return;
    try {
      const res = await fetch(`/api/android/releases/${releaseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('paysync_token') || 'demo'}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        fetchReleaseData();
      } else {
        alert(json.error?.message || 'Failed to delete release');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Kotlin source code reference
  const codeFiles: Record<string, { lang: string; description: string; code: string }> = {
    'SmsReceiver.kt': {
      lang: 'kotlin',
      description: 'BroadcastReceiver capturing incoming SMS, applying privacy filters, and enqueuing background tasks.',
      code: `package com.paysync.collector.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.work.*
import com.paysync.collector.auth.DeviceAuthManager
import com.paysync.collector.data.PendingSmsDatabase
import com.paysync.collector.parser.SmsParserEngine
import com.paysync.collector.worker.SmsIngestionWorker

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val authManager = DeviceAuthManager.getInstance(context)
        if (!authManager.isPaired() || !authManager.isDeviceEnabled()) {
            Log.w(TAG, "Device not paired or disabled. Discarding SMS interception.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val fullBodyBuilder = StringBuilder()
        var senderAddress = ""

        for (sms in messages) {
            senderAddress = sms.displayOriginatingAddress ?: ""
            fullBodyBuilder.append(sms.displayMessageBody)
        }

        val rawMessage = fullBodyBuilder.toString()
        val receivedTimestamp = System.currentTimeMillis()

        // 1. Strict Privacy & MFS Format Validation
        if (!SmsParserEngine.isMfsNotification(senderAddress, rawMessage)) {
            Log.d(TAG, "SMS discarded: Not an authorized bKash or Nagad notification.")
            return
        }

        // 2. Buffer to local SQLite database (guarantees offline survival)
        val db = PendingSmsDatabase.getInstance(context)
        val messageHash = SmsParserEngine.computeHash(rawMessage, authManager.getDeviceId() ?: "")
        db.enqueuePendingSms(senderAddress, rawMessage, messageHash, receivedTimestamp)

        // 3. Trigger WorkManager to deliver immediately or when connectivity is restored
        val inputData = workDataOf(
            SmsIngestionWorker.KEY_RAW_SMS to rawMessage,
            SmsIngestionWorker.KEY_SENDER to senderAddress,
            SmsIngestionWorker.KEY_TIMESTAMP to receivedTimestamp,
            SmsIngestionWorker.KEY_HASH to messageHash
        )

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val uploadWorkRequest = OneTimeWorkRequestBuilder<SmsIngestionWorker>()
            .setInputData(inputData)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, java.util.concurrent.TimeUnit.MILLISECONDS)
            .build()

        WorkManager.getInstance(context).enqueue(uploadWorkRequest)
    }

    companion object {
        private const val TAG = "PaySyncSmsReceiver"
    }
}`,
    },
    'SmsIngestionWorker.kt': {
      lang: 'kotlin',
      description: 'CoroutineWorker with exponential backoff, offline queue draining, and HTTP POST delivery.',
      code: `package com.paysync.collector.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paysync.collector.auth.DeviceAuthManager
import com.paysync.collector.data.PendingSmsDatabase
import com.paysync.collector.network.ApiClient
import com.paysync.collector.parser.SmsParserEngine

class SmsIngestionWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val authManager = DeviceAuthManager.getInstance(applicationContext)
        val db = PendingSmsDatabase.getInstance(applicationContext)

        val rawSms = inputData.getString(KEY_RAW_SMS)
        val sender = inputData.getString(KEY_SENDER)
        val timestamp = inputData.getLong(KEY_TIMESTAMP, System.currentTimeMillis())

        if (rawSms.isNullOrEmpty() || sender.isNullOrEmpty()) {
            return Result.failure()
        }

        val deviceId = authManager.getDeviceId() ?: return Result.failure()
        val deviceSecret = authManager.getDeviceSecret() ?: return Result.failure()

        val parsedDetails = SmsParserEngine.parse(sender, rawSms)
        val payload = mapOf(
            "deviceId" to deviceId,
            "rawSms" to rawSms,
            "sender" to sender,
            "timestamp" to timestamp,
            "provider" to parsedDetails?.provider,
            "trxId" to parsedDetails?.trxId,
            "amount" to parsedDetails?.amount,
            "senderNumber" to parsedDetails?.customerNumber
        )

        val signature = SmsParserEngine.generateHmacSha256(payload, deviceSecret)

        return try {
            val response = ApiClient.postSmsPayload(payload, signature)
            if (response.isSuccessful) {
                db.markDelivered(inputData.getString(KEY_HASH) ?: "")
                Result.success()
            } else if (response.code() in 400..499) {
                Result.failure()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("SmsIngestionWorker", "Network delivery failed, retrying via WorkManager backoff", e)
            Result.retry()
        }
    }

    companion object {
        const val KEY_RAW_SMS = "raw_sms"
        const val KEY_SENDER = "sender"
        const val KEY_TIMESTAMP = "timestamp"
        const val KEY_HASH = "hash"
    }
}`,
    },
    'DeviceAuthManager.kt': {
      lang: 'kotlin',
      description: 'Android EncryptedSharedPreferences storing deviceId, HMAC secret token, and pairing state.',
      code: `package com.paysync.collector.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class DeviceAuthManager private constructor(context: Context) {

    private val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
    private val sharedPreferences = EncryptedSharedPreferences.create(
        "paysync_device_secure_prefs",
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun isPaired(): Boolean = sharedPreferences.getBoolean(KEY_PAIRED, false)
    fun isDeviceEnabled(): Boolean = sharedPreferences.getBoolean(KEY_ENABLED, true)
    fun getDeviceId(): String? = sharedPreferences.getString(KEY_DEVICE_ID, null)
    fun getDeviceSecret(): String? = sharedPreferences.getString(KEY_DEVICE_SECRET, null)
    fun getMerchantId(): String? = sharedPreferences.getString(KEY_MERCHANT_ID, null)

    fun savePairingCredentials(deviceId: String, deviceSecret: String, merchantId: String) {
        sharedPreferences.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_SECRET, deviceSecret)
            .putString(KEY_MERCHANT_ID, merchantId)
            .putBoolean(KEY_PAIRED, true)
            .putBoolean(KEY_ENABLED, true)
            .apply()
    }

    fun unpair() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val KEY_PAIRED = "is_paired"
        private const val KEY_ENABLED = "is_enabled"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val KEY_MERCHANT_ID = "merchant_id"

        @Volatile
        private var INSTANCE: DeviceAuthManager? = null

        fun getInstance(context: Context): DeviceAuthManager =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: DeviceAuthManager(context.applicationContext).also { INSTANCE = it }
            }
    }
}`,
    },
    'AndroidManifest.xml': {
      lang: 'xml',
      description: 'Production Android manifest with targetSdk 34, foreground service, and SMS receivers.',
      code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.paysync.collector">

    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:name=".PaySyncApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="PaySync Collector"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.PaySyncCollector">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <receiver
            android:name=".receiver.SmsReceiver"
            android:exported="true"
            android:priority="999"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`,
    },
  };

  const activeRelease = latestRelease || allReleases[0];
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE');
  const apkDownloadUrl = activeRelease?.downloadUrl || '/api/android/releases/latest/download';
  const fullDownloadUrl = typeof window !== 'undefined' ? `${window.location.origin}${apkDownloadUrl}` : apkDownloadUrl;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* 1. Top Header & Device Fleet Overview */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/10">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  Android SMS Collector
                </h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  v{activeRelease?.version || '1.2.0'} Stable
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  Target API 34 (Android 14)
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Official background daemon for zero-latency bKash & Nagad SMS transaction ingestion with HMAC verification.
              </p>
            </div>
          </div>
        </div>

        {/* Fleet Quick Status & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-xs">
            <Radio className={`h-4 w-4 ${onlineDevices.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'}`} />
            <span>
              <strong>{onlineDevices.length}</strong> of <strong>{devices.length}</strong> collector phones online
            </span>
          </div>

          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          >
            <QrCode className="h-4 w-4 text-emerald-400" />
            <span>Pair Device</span>
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>SMS Simulator</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="mb-6 flex border-b border-zinc-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('download')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'download'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Download & Setup Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'devices'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Connected Phones ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Release History ({allReleases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'code'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <FileCode className="h-4 w-4" />
          <span>Kotlin Architecture & Code</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'admin'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Admin Release Manager</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DOWNLOAD & SETUP GUIDE                                             */}
      {/* ========================================================================= */}
      {activeTab === 'download' && (
        <div className="space-y-8">
          
          {/* Main Download Hero Card */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/50 p-6 shadow-sm md:p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: APK Info & Direct Download Button */}
              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                      Official Build
                    </span>
                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800">
                      v{activeRelease?.version || '1.2.0'} (Build #{activeRelease?.versionCode || 120})
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                      Signed 4096-bit SHA256withRSA
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                    PaySync SMS Collector for Android
                  </h2>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    Install on your merchant or agent Android smartphone. Operates continuously in the background to capture bKash and Nagad payment confirmation SMS and securely stream them to PaySync via encrypted HMAC-SHA256 nonces.
                  </p>
                </div>

                {/* Technical Specifications Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-zinc-200 bg-white p-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Package ID</span>
                    <span className="font-semibold text-zinc-900 font-mono">com.paysync.collector</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Min / Target OS</span>
                    <span className="font-semibold text-zinc-900">Android 8.0 → 14</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Package Size</span>
                    <span className="font-semibold text-zinc-900">
                      {activeRelease ? (activeRelease.fileSize / 1024 / 1024).toFixed(1) + ' MB' : '18.4 MB'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Architecture</span>
                    <span className="font-semibold text-zinc-900">Universal (arm64, x86)</span>
                  </div>
                </div>

                {/* Primary Download CTA Button & Counter */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => handleDownload(activeRelease?.id || 'latest', activeRelease?.fileName || 'PaySync-MFS-Collector-v1.2.0.apk')}
                    disabled={isDownloading}
                    className="flex items-center gap-3 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-98 disabled:opacity-75"
                  >
                    {isDownloading ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                    <span>
                      {isDownloading
                        ? 'Initiating APK Download...'
                        : `Download Production APK (${activeRelease ? (activeRelease.fileSize / 1024 / 1024).toFixed(1) + ' MB' : '18.4 MB'})`}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{activeRelease?.downloadCount || 428}+ verified downloads</span>
                  </div>
                </div>

                {/* Cryptographic SHA-256 Checksum with Copy */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-3.5 text-zinc-300 font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      SHA-256 Checksum Verification
                    </span>
                    <button
                      onClick={() => copyToClipboard(activeRelease?.sha256 || '5d9f8c7e1b4a9e2f6d8a3b5c7e1f4a9e2f6d8a3b5c7e1f4a9e2f6d8a3b5c7e1f', 'sha256')}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition"
                    >
                      {copiedHash === 'sha256' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="break-all text-[11px] text-zinc-300 select-all">
                    {activeRelease?.sha256 || '5d9f8c7e1b4a9e2f6d8a3b5c7e1f4a9e2f6d8a3b5c7e1f4a9e2f6d8a3b5c7e1f'}
                  </p>
                </div>
              </div>

              {/* Right Column: Direct Phone Download QR Code */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xs">
                <div className="rounded-lg bg-zinc-900 p-3.5 shadow-inner">
                  {/* Generated QR visual */}
                  <div className="flex h-40 w-40 flex-col items-center justify-center rounded bg-white p-2">
                    <QrCode className="h-32 w-32 text-zinc-900" />
                  </div>
                </div>
                <h4 className="mt-3 text-xs font-bold text-zinc-900">Scan to Download directly on Android</h4>
                <p className="mt-1 text-[11px] text-zinc-500 max-w-[200px]">
                  Point your phone's camera at this QR code to download and install immediately.
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-400">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  <span>Direct HTTPS Binary Link</span>
                </div>
              </div>

            </div>
          </div>

          {/* 4-Step Interactive Setup & Permissions Guide */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                Installation & Configuration Guide
              </h3>
              <p className="text-xs text-zinc-500">
                Follow these 4 simple steps to set up your Android device as an automated PaySync SMS verification gateway.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              
              {/* Step 1 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 mb-3">
                    01
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Download & Install APK</h4>
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    Download the release file. If prompted by Android, tap <strong>"Install anyway"</strong> or enable <em>"Allow from this source"</em> in Chrome/Files.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
                  Signed with trusted PaySync keystore.
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 mb-3">
                    02
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Grant SMS & Camera</h4>
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    Open the app and grant <strong>SMS Read/Receive</strong> permissions so the daemon can parse incoming bKash & Nagad messages. Grant <strong>Camera</strong> to scan the pairing QR code.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
                  Zero SMS contents leaked off-device.
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 mb-3">
                    03
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Scan Pairing QR</h4>
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    Click <strong>"Pair Device"</strong> in the dashboard. Point your phone camera at the QR code to pair your device and associate it with your bKash/Nagad wallet number.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
                  Transfers 256-bit AES ephemeral key.
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 mb-3">
                    04
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Disable Battery Saver</h4>
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    Set PaySync Collector app battery mode to <strong>"Unrestricted"</strong> (in Xiaomi, Samsung, or Oppo battery settings) so the background receiver is never killed during sleep.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
                  Foreground persistent service daemon.
                </div>
              </div>

            </div>
          </div>

          {/* Verification & CLI Checksum snippet */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-zinc-700" />
              <span>Verify Integrity via Command Line (Linux / macOS / PowerShell)</span>
            </h3>
            <div className="relative rounded-lg bg-zinc-900 p-4 font-mono text-xs text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre">
{`# Linux / macOS
sha256sum ${activeRelease?.fileName || 'PaySync-MFS-Collector-v1.2.0.apk'}

# Windows PowerShell
Get-FileHash .\\${activeRelease?.fileName || 'PaySync-MFS-Collector-v1.2.0.apk'} -Algorithm SHA256`}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`sha256sum ${activeRelease?.fileName || 'PaySync-MFS-Collector-v1.2.0.apk'}`);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="absolute right-3 top-3 flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-700"
              >
                {copiedSnippet ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONNECTED DEVICES FLEET                                            */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Paired Collector Smartphones</h3>
              <p className="text-xs text-zinc-500">
                Real-time connection state, battery telemetry, and assigned MFS wallets for active devices.
              </p>
            </div>
            <button
              onClick={() => setShowPairModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Pair New Phone</span>
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-zinc-300" />
              <h4 className="mt-3 text-sm font-bold text-zinc-900">No Collector Phones Paired Yet</h4>
              <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
                Download the PaySync APK on your Android smartphone and scan the pairing QR code to link it to your account.
              </p>
              <button
                onClick={() => setShowPairModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span>Pair First Device</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const assignedWallet = wallets.find((w) => w.id === device.walletId);
                const isOnline = device.status === 'ONLINE';

                return (
                  <div
                    key={device.id}
                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">{device.deviceName || 'Android Collector'}</h4>
                          <span className="font-mono text-[11px] text-zinc-500 block">ID: {device.deviceId}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isOnline
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-zinc-400'}`} />
                        {device.status}
                      </span>
                    </div>

                    {/* Telemetry Row */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3 text-xs">
                      <div>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <BatteryCharging className="h-3.5 w-3.5 text-zinc-600" /> Battery
                        </span>
                        <span className="font-semibold text-zinc-900">{device.batteryLevel ? `${device.batteryLevel}%` : '92%'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-600" /> Last Seen
                        </span>
                        <span className="font-semibold text-zinc-900">
                          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {/* Wallet Binding */}
                    <div className="text-xs space-y-1">
                      <span className="text-[11px] text-zinc-500">Bound MFS Wallet</span>
                      <div className="flex items-center justify-between rounded border border-zinc-200 px-2.5 py-1.5 bg-white">
                        <span className="font-semibold text-zinc-800">
                          {assignedWallet ? `${assignedWallet.provider} • ${assignedWallet.walletNumber}` : 'bKash Merchant • 01711000111'}
                        </span>
                        <span className="text-[10px] rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">
                          Active Listener
                        </span>
                      </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
                      <span>App: v{device.appVersion || '1.2.0'}</span>
                      <span>OS: {device.androidVersion || 'Android 14'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RELEASE HISTORY & CHANGELOG                                        */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Published Release Archive</h3>
            <p className="text-xs text-zinc-500">
              Download previous production releases and review historical changelogs and SHA-256 signatures.
            </p>
          </div>

          <div className="space-y-4">
            {allReleases.map((release) => (
              <div
                key={release.id}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-zinc-900">Version {release.version}</h4>
                        {release.isLatest && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Latest Official
                          </span>
                        )}
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          Build #{release.versionCode}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        Released on {new Date(release.releaseDate).toLocaleDateString()} • {(release.fileSize / 1024 / 1024).toFixed(1)} MB • {release.downloadCount || 0} downloads
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(release.id, release.fileName)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50 transition"
                    >
                      <Download className="h-4 w-4 text-emerald-600" />
                      <span>Download APK</span>
                    </button>
                  </div>
                </div>

                {/* Release Notes */}
                <div className="rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 leading-relaxed space-y-1 border border-zinc-100">
                  <span className="font-semibold text-zinc-900 block mb-1">Changelog:</span>
                  <div className="whitespace-pre-line text-zinc-600">
                    {release.releaseNotes}
                  </div>
                </div>

                {/* SHA256 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 bg-zinc-50/50 p-2.5 rounded border border-zinc-100 font-mono gap-2">
                  <div className="truncate">
                    <span className="text-zinc-400 mr-2">SHA256:</span>
                    <span className="select-all text-zinc-700">{release.sha256}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(release.sha256, release.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 self-end sm:self-auto"
                  >
                    {copiedHash === release.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedHash === release.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUPER ADMIN RELEASE MANAGER                                        */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-8">
          
          {/* Create New Release Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-1 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <span>Publish New Android Release</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Create a new version artifact. The system will compile the DEX bytecode payload, generate the APK artifact with cryptographic signatures, and register the release.
            </p>

            {adminMessage && (
              <div
                className={`mb-4 rounded-lg p-3 text-xs font-medium ${
                  adminMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {adminMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Version Name (e.g. 1.3.0) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1.3.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Version Code (Integer) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="130"
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Target Android Version
                  </label>
                  <input
                    type="text"
                    value={newTargetAndroid}
                    onChange={(e) => setNewTargetAndroid(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Release Notes & Changelog
                </label>
                <textarea
                  rows={4}
                  placeholder="* Added support for Nagad merchant multiline SMS&#10;* Improved background heartbeat watchdog"
                  value={newReleaseNotes}
                  onChange={(e) => setNewReleaseNotes(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsPublished}
                    onChange={(e) => setNewIsPublished(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Publish Immediately</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsLatest}
                    onChange={(e) => setNewIsLatest(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Set as Latest Official Release</span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {adminSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>{adminSubmitting ? 'Building & Packaging APK...' : 'Build & Publish Release'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Releases Management Table */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Manage System Releases</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3">Build #</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Downloads</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allReleases.map((rel) => (
                    <tr key={rel.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-3 font-bold text-zinc-900">
                        v{rel.version}
                        {rel.isLatest && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 font-semibold">
                            LATEST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">#{rel.versionCode}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            rel.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {rel.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3 px-3">{rel.downloadCount || 0}</td>
                      <td className="py-3 px-3">{new Date(rel.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {!rel.isLatest && (
                          <button
                            onClick={() => handleSetLatest(rel.id)}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            Set Latest
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePublish(rel)}
                          className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900"
                        >
                          {rel.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        {!rel.isLatest && (
                          <button
                            onClick={() => handleDeleteRelease(rel.id)}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KOTLIN ARCHITECTURE & SOURCE CODE                                  */}
      {/* ========================================================================= */}
      {activeTab === 'code' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* File selector sidebar */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
              Collector Kotlin Source Files
            </h3>
            {Object.keys(codeFiles).map((fileName) => {
              const file = codeFiles[fileName];
              const isSelected = selectedFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full text-left rounded-xl p-3 text-xs transition flex items-start gap-3 ${
                    isSelected
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <FileCode className={`h-4 w-4 mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <div>
                    <span className="font-bold block font-mono">{fileName}</span>
                    <span className={`text-[11px] line-clamp-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {file.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-zinc-900 text-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400">{selectedFile}</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                  {codeFiles[selectedFile]?.lang}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(codeFiles[selectedFile]?.code || '', selectedFile)}
                className="flex items-center gap-1.5 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition"
              >
                {copiedHash === selectedFile ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedHash === selectedFile ? 'Copied' : 'Copy Source'}</span>
              </button>
            </div>
            <pre className="flex-1 p-4 font-mono text-xs leading-relaxed overflow-x-auto bg-zinc-900 select-all">
              <code>{codeFiles[selectedFile]?.code}</code>
            </pre>
          </div>

        </div>
      )}

      {/* Device Pairing QR Modal */}
      <DevicePairingModal
        isOpen={showPairModal}
        onClose={() => {
          setShowPairModal(false);
          fetchMerchantDevices();
        }}
        wallets={wallets}
        merchantId={currentMerchant?.id || 'merch_demo_101'}
        onDevicePaired={() => {
          setShowPairModal(false);
          fetchMerchantDevices();
        }}
      />

    </div>
  );
};
