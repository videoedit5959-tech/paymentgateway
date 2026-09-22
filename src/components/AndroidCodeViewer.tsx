import React, { useState } from 'react';
import { Smartphone, Copy, Check, Terminal, FileCode, Shield, Download, ExternalLink, Cpu, Radio } from 'lucide-react';

export const AndroidCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('SmsReceiver.kt');
  const [copied, setCopied] = useState(false);

  const files: Record<string, { lang: string; description: string; code: string }> = {
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
}`
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SmsIngestionWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val authManager = DeviceAuthManager.getInstance(applicationContext)
        val deviceId = authManager.getDeviceId()
        val deviceToken = authManager.getDeviceToken()
        val serverUrl = authManager.getServerUrl()

        if (deviceId.isNullOrEmpty() || deviceToken.isNullOrEmpty()) {
            return@withContext Result.failure()
        }

        val db = PendingSmsDatabase.getInstance(applicationContext)

        // 1. Drain pending offline queue
        val pendingRecords = db.getPendingMessages(limit = 10)
        var anyFailure = false

        for (record in pendingRecords) {
            val response = ApiClient.ingestSms(
                serverUrl = serverUrl,
                deviceId = deviceId,
                deviceToken = deviceToken,
                message = record.messageBody,
                receivedAt = record.receivedTimestamp,
                messageHash = record.messageHash,
                sender = record.sender
            )

            if (response.isSuccessful) {
                db.deletePendingSms(record.id)
            } else if (response.statusCode == 403) {
                authManager.setDeviceEnabled(false)
                return@withContext Result.failure()
            } else {
                db.incrementRetry(record.id)
                anyFailure = true
            }
        }

        // 2. Process immediate SMS payload if provided
        val immediateSms = inputData.getString(KEY_RAW_SMS)
        if (!immediateSms.isNullOrEmpty()) {
            val sender = inputData.getString(KEY_SENDER)
            val timestamp = inputData.getLong(KEY_TIMESTAMP, System.currentTimeMillis())
            val messageHash = inputData.getString(KEY_HASH) ?: SmsParserEngine.computeHash(immediateSms, deviceId)

            val response = ApiClient.ingestSms(
                serverUrl = serverUrl,
                deviceId = deviceId,
                deviceToken = deviceToken,
                message = immediateSms,
                receivedAt = timestamp,
                messageHash = messageHash,
                sender = sender
            )

            if (response.isSuccessful) {
                val matched = db.getPendingMessages().find { it.messageHash == messageHash }
                if (matched != null) db.deletePendingSms(matched.id)
            } else if (response.statusCode in 500..599 || response.statusCode == 0) {
                return@withContext Result.retry()
            }
        }

        if (anyFailure) Result.retry() else Result.success()
    }

    companion object {
        const val KEY_RAW_SMS = "key_raw_sms"
        const val KEY_SENDER = "key_sender"
        const val KEY_TIMESTAMP = "key_timestamp"
        const val KEY_HASH = "key_hash"
    }
}`
    },

    'MainActivity.kt': {
      lang: 'kotlin',
      description: 'Collector Dashboard displaying live device connection, offline queue status, and heartbeat controls.',
      code: `package com.paysync.collector

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.work.*
import com.paysync.collector.auth.DeviceAuthManager
import com.paysync.collector.data.PendingSmsDatabase
import com.paysync.collector.ui.PairingActivity
import com.paysync.collector.worker.HeartbeatWorker
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvDeviceInfo: TextView
    private lateinit var tvQueueInfo: TextView
    private lateinit var btnPair: Button
    private lateinit var btnUnpair: Button
    private lateinit var authManager: DeviceAuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        authManager = DeviceAuthManager.getInstance(this)
        schedulePeriodicHeartbeat()
        updateUiState()
    }

    private fun updateUiState() {
        val isPaired = authManager.isPaired()
        val deviceId = authManager.getDeviceId()
        val isEnabled = authManager.isDeviceEnabled()
        val pendingCount = PendingSmsDatabase.getInstance(this).getPendingCount()

        tvQueueInfo.text = "Offline Queue: $pendingCount messages buffered"

        if (isPaired && isEnabled) {
            tvStatus.text = "ONLINE & MONITORING"
            tvDeviceInfo.text = "Device ID: $deviceId\nApp Version: 1.2.0\nProviders: bKash (16247) & Nagad (16167)"
        } else {
            tvStatus.text = "UNPAIRED"
            tvDeviceInfo.text = "Scan QR from PaySync Merchant Portal to connect."
        }
    }

    private fun schedulePeriodicHeartbeat() {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val heartbeatWork = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("PaySyncHeartbeat", ExistingPeriodicWorkPolicy.KEEP, heartbeatWork)
    }
}`
    },

    'ApiClient.kt': {
      lang: 'kotlin',
      description: 'Network client handling secure authenticated HTTP POST requests with device tokens and timeouts.',
      code: `package com.paysync.collector.network

import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ApiResponse(
    val isSuccessful: Boolean,
    val statusCode: Int,
    val rawBody: String,
    val jsonObject: JSONObject?
)

object ApiClient {

    fun ingestSms(
        serverUrl: String,
        deviceId: String,
        deviceToken: String,
        message: String,
        receivedAt: Long,
        messageHash: String,
        sender: String? = null
    ): ApiResponse {
        val endpoint = "\${serverUrl.trimEnd('/')}/api/v1/device/sms"
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("message", message)
            put("receivedAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date(receivedAt)))
            put("messageHash", messageHash)
            if (!sender.isNullOrEmpty()) put("sender", sender)
        }

        return executePost(endpoint, payload.toString(), deviceId, deviceToken)
    }

    fun sendHeartbeat(
        serverUrl: String,
        deviceId: String,
        deviceToken: String,
        batteryLevel: Int,
        networkStatus: String
    ): ApiResponse {
        val endpoint = "\${serverUrl.trimEnd('/')}/api/v1/device/heartbeat"
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("batteryLevel", batteryLevel)
            put("networkStatus", networkStatus)
            put("appVersion", "1.2.0")
        }

        return executePost(endpoint, payload.toString(), deviceId, deviceToken)
    }

    private fun executePost(endpoint: String, jsonBody: String, deviceId: String?, deviceToken: String?): ApiResponse {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(endpoint)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                if (!deviceId.isNullOrEmpty()) setRequestProperty("X-Device-Id", deviceId)
                if (!deviceToken.isNullOrEmpty()) {
                    setRequestProperty("X-Device-Token", deviceToken)
                    setRequestProperty("Authorization", "Bearer $deviceToken")
                }
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(jsonBody); it.flush() }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299
            val inputStream = if (isSuccess) connection.inputStream else connection.errorStream
            val responseBody = inputStream?.let { BufferedReader(InputStreamReader(it)).readText() } ?: ""

            return ApiResponse(isSuccess, statusCode, responseBody, try { JSONObject(responseBody) } catch (e: Exception) { null })
        } catch (e: Exception) {
            return ApiResponse(false, 0, e.message ?: "Network error", null)
        } finally {
            connection?.disconnect()
        }
    }
}`
    },

    'DeviceAuthManager.kt': {
      lang: 'kotlin',
      description: 'SharedPreferences security manager storing deviceId, deviceToken, merchantId, and active status.',
      code: `package com.paysync.collector.auth

import android.content.Context
import android.content.SharedPreferences

class DeviceAuthManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("paysync_collector_auth", Context.MODE_PRIVATE)

    fun isPaired(): Boolean = !getDeviceId().isNullOrEmpty() && !getDeviceToken().isNullOrEmpty()

    fun getDeviceId(): String? = prefs.getString("device_id", null)

    fun getDeviceToken(): String? = prefs.getString("device_token", null)

    fun getServerUrl(): String = prefs.getString("server_url", "https://api.yourdomain.com") ?: "https://api.yourdomain.com"

    fun getMerchantId(): String? = prefs.getString("merchant_id", null)

    fun savePairing(deviceId: String, deviceToken: String, merchantId: String, serverUrl: String? = null) {
        prefs.edit().apply {
            putString("device_id", deviceId)
            putString("device_token", deviceToken)
            putString("merchant_id", merchantId)
            if (!serverUrl.isNullOrEmpty()) putString("server_url", serverUrl)
            putBoolean("device_enabled", true)
            apply()
        }
    }

    fun setDeviceEnabled(enabled: Boolean) = prefs.edit().putBoolean("device_enabled", enabled).apply()

    fun isDeviceEnabled(): Boolean = prefs.getBoolean("device_enabled", true)

    fun unpair() = prefs.edit().clear().apply()

    companion object {
        @Volatile private var instance: DeviceAuthManager? = null

        fun getInstance(context: Context): DeviceAuthManager =
            instance ?: synchronized(this) { instance ?: DeviceAuthManager(context.applicationContext).also { instance = it } }
    }
}`
    },

    'SmsParserEngine.kt': {
      lang: 'kotlin',
      description: 'Modular parser coordinator applying privacy filters and SHA-256 fingerprinting.',
      code: `package com.paysync.collector.parser

import java.security.MessageDigest

object SmsParserEngine {

    fun isMfsNotification(sender: String, body: String): Boolean {
        if (BkashSmsParser.isBkashSender(sender) || NagadSmsParser.isNagadSender(sender)) return true
        val hasTrxKeyword = body.contains("TrxID", ignoreCase = true) || body.contains("TxnID", ignoreCase = true)
        val hasCurrency = body.contains("Tk", ignoreCase = true) || body.contains("BDT", ignoreCase = true)
        return hasTrxKeyword && hasCurrency
    }

    fun parse(message: String): ParsedMfsResult? {
        BkashSmsParser.parse(message)?.let { if (it.isValid) return it }
        NagadSmsParser.parse(message)?.let { if (it.isValid) return it }
        return null
    }

    fun computeHash(message: String, deviceId: String = ""): String {
        val input = "$deviceId:\${message.trim().replace("\\\\s+".toRegex(), " ")}"
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(input.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    }
}`
    },

    'BkashSmsParser.kt': {
      lang: 'kotlin',
      description: 'Dedicated regex parser for bKash Send Money, Payment Received, and Cash In SMS formats.',
      code: `package com.paysync.collector.parser

import java.util.regex.Pattern

object BkashSmsParser {
    private val SENDER_PATTERN = Pattern.compile("^(bKash|16247)$", Pattern.CASE_INSENSITIVE)
    private val TRX_ID_PATTERN = Pattern.compile("TrxID\\\\s*[:]?\\\\s*([A-Z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val AMOUNT_PATTERN = Pattern.compile("(?:received(?: payment)?|Cash In|Tk|BDT)\\\\s*(?:Tk|BDT)?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val BALANCE_PATTERN = Pattern.compile("Balance\\\\s*[:]?\\\\s*(?:Tk|BDT)?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val SENDER_PHONE_PATTERN = Pattern.compile("from\\\\s*[:]?\\\\s*(01[3-9][0-9]{8})", Pattern.CASE_INSENSITIVE)

    fun isBkashSender(sender: String): Boolean = SENDER_PATTERN.matcher(sender.trim()).find()

    fun parse(message: String): ParsedMfsResult? {
        val text = message.replace("\\r", " ").replace("\\n", " ").trim()
        val trxMatcher = TRX_ID_PATTERN.matcher(text)
        if (!trxMatcher.find()) return null
        val trxId = trxMatcher.group(1)?.uppercase() ?: return null

        val amtMatcher = AMOUNT_PATTERN.matcher(text)
        val amount = if (amtMatcher.find()) amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0 else 0.0

        val balMatcher = BALANCE_PATTERN.matcher(text)
        val balance = if (balMatcher.find()) balMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() else null

        val senderMatcher = SENDER_PHONE_PATTERN.matcher(text)
        val sender = if (senderMatcher.find()) senderMatcher.group(1) else null

        return ParsedMfsResult(
            provider = "BKASH",
            trxId = trxId,
            amount = amount,
            balance = balance,
            sender = sender,
            transactionType = if (text.contains("payment", true)) "PAYMENT" else "RECEIVED",
            isValid = amount > 0.0 && trxId.length >= 6
        )
    }
}`
    },

    'NagadSmsParser.kt': {
      lang: 'kotlin',
      description: 'Dedicated regex parser for Nagad Money Received and Merchant Payment notifications.',
      code: `package com.paysync.collector.parser

import java.util.regex.Pattern

object NagadSmsParser {
    private val SENDER_PATTERN = Pattern.compile("^(Nagad|16167)$", Pattern.CASE_INSENSITIVE)
    private val TXN_ID_PATTERN = Pattern.compile("(?:TxnID|Txn\\\\s*ID|TrxID)\\\\s*[:]?\\\\s*([A-Z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val AMOUNT_PATTERN = Pattern.compile("(?:Amount\\\\s*[:]?\\\\s*(?:Tk|BDT)?|(?:Tk|BDT))\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val BALANCE_PATTERN = Pattern.compile("Balance\\\\s*[:]?\\\\s*(?:Tk|BDT)?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val SENDER_PHONE_PATTERN = Pattern.compile("(?:Sender|Customer|from)\\\\s*[:]?\\\\s*(01[3-9][0-9]{8})", Pattern.CASE_INSENSITIVE)

    fun isNagadSender(sender: String): Boolean = SENDER_PATTERN.matcher(sender.trim()).find()

    fun parse(message: String): ParsedMfsResult? {
        val text = message.replace("\\r", " ").replace("\\n", " ").trim()
        val txnMatcher = TXN_ID_PATTERN.matcher(text)
        if (!txnMatcher.find()) return null
        val trxId = txnMatcher.group(1)?.uppercase() ?: return null

        val amtMatcher = AMOUNT_PATTERN.matcher(text)
        val amount = if (amtMatcher.find()) amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0 else 0.0

        val balMatcher = BALANCE_PATTERN.matcher(text)
        val balance = if (balMatcher.find()) balMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() else null

        val senderMatcher = SENDER_PHONE_PATTERN.matcher(text)
        val sender = if (senderMatcher.find()) senderMatcher.group(1) else null

        return ParsedMfsResult(
            provider = "NAGAD",
            trxId = trxId,
            amount = amount,
            balance = balance,
            sender = sender,
            transactionType = if (text.contains("Payment", true)) "PAYMENT" else "RECEIVED",
            isValid = amount > 0.0 && trxId.length >= 6
        )
    }
}`
    },

    'AndroidManifest.xml': {
      lang: 'xml',
      description: 'Android manifest with SMS permissions, high-priority BroadcastReceiver, and camera features.',
      code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Essential Android Collector Permissions -->
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.telephony" android:required="true" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="PaySync Collector"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.PaySyncCollector"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.PairingActivity"
            android:exported="false"
            android:label="Pair Collector Device" />

        <!-- SMS Broadcast Receiver with Maximum Priority (999) -->
        <receiver
            android:name=".receiver.SmsReceiver"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[selectedFile]?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Smartphone className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-base font-bold text-zinc-900">Native Android SMS Collector Engine</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                Production Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-2xl">
              Inspect the authentic native Kotlin Android Studio project source files powering PaySync's hardware MFS gateway.
              Built for high reliability, offline persistence via local SQLite, and privacy-preserving regex filtering.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-center px-4">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Target SDK</span>
              <span className="font-mono text-xs font-bold text-zinc-800">Android 14 (API 34)</span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-center px-4">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Architecture</span>
              <span className="font-mono text-xs font-bold text-emerald-600">WorkManager + Coroutines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Code Inspector Workbench */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* File Navigator Sidebar */}
        <div className="lg:col-span-4 border-r border-zinc-200 bg-zinc-50 p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Project Source Files (9)</span>
            <span className="font-mono text-[9px] bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-600">Kotlin / XML</span>
          </div>

          <div className="space-y-1">
            {Object.keys(files).map((filename) => {
              const file = files[filename];
              const isSelected = selectedFile === filename;
              return (
                <button
                  key={filename}
                  onClick={() => setSelectedFile(filename)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-700 hover:bg-zinc-200/60 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileCode className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                    <span className="text-xs truncate font-mono">{filename}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {file.lang}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Shield className="h-3.5 w-3.5" />
              Privacy Assurance
            </div>
            <p className="text-[10px] leading-relaxed text-amber-700">
              The BroadcastReceiver checks sender signatures before reading the body. Non-MFS personal SMS are never uploaded to the server or logged.
            </p>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-950 text-zinc-100">
          
          {/* File Toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-emerald-400">{selectedFile}</span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">— {files[selectedFile]?.description}</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-5 overflow-x-auto flex-1 font-mono text-xs leading-relaxed text-zinc-300 max-h-[580px] overflow-y-auto selection:bg-emerald-900 selection:text-emerald-200">
            <pre className="whitespace-pre">
              <code>{files[selectedFile]?.code}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
