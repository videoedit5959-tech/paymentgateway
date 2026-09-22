package com.paysync.collector.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paysync.collector.auth.DeviceAuthManager
import com.paysync.collector.data.PendingSmsDatabase
import com.paysync.collector.network.ApiClient
import com.paysync.collector.network.BatchSmsItem
import com.paysync.collector.parser.SmsParserEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SmsIngestionWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val authManager = DeviceAuthManager.getInstance(applicationContext)
        val deviceId = authManager.getDeviceId()
        val deviceToken = authManager.getDeviceToken()
        val serverUrl = authManager.getServerUrl()

        if (deviceId.isNullOrEmpty() || deviceToken.isNullOrEmpty()) {
            Log.w(TAG, "Device not paired. Skipping SMS upload until QR pairing completes.")
            return@withContext Result.failure()
        }

        val db = PendingSmsDatabase.getInstance(applicationContext)

        // 1. Drain pending queue if any (offline resilience recovery)
        val pendingRecords = db.getPendingMessages(limit = 25)
        var anyFailure = false

        if (pendingRecords.size > 1) {
            // Batch drain
            val batchItems = pendingRecords.map {
                BatchSmsItem(
                    message = it.messageBody,
                    receivedAt = it.receivedTimestamp,
                    messageHash = it.messageHash,
                    sender = it.sender
                )
            }

            val batchResponse = ApiClient.syncBatchSms(
                serverUrl = serverUrl,
                deviceId = deviceId,
                deviceToken = deviceToken,
                items = batchItems
            )

            if (batchResponse.isSuccessful) {
                // Delete all flushed records from local db
                pendingRecords.forEach { db.deletePendingSms(it.id) }
                Log.i(TAG, "Batch drained ${pendingRecords.size} offline SMS messages successfully.")
            } else if (batchResponse.statusCode == 403) {
                Log.e(TAG, "Device disabled by server administrator. Disabling local collector.")
                authManager.setDeviceEnabled(false)
                return@withContext Result.failure()
            } else {
                pendingRecords.forEach { db.incrementRetry(it.id) }
                anyFailure = true
            }
        } else if (pendingRecords.size == 1) {
            val record = pendingRecords[0]
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
                Log.i(TAG, "Queued offline SMS forwarded successfully (Hash: ${record.messageHash.take(8)}...)")
            } else if (response.statusCode == 403) {
                Log.e(TAG, "Device disabled by server administrator. Disabling local collector.")
                authManager.setDeviceEnabled(false)
                return@withContext Result.failure()
            } else {
                db.incrementRetry(record.id)
                anyFailure = true
            }
        }

        // 2. Process immediate SMS payload from inputData if provided
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
                Log.i(TAG, "Live incoming SMS ingested successfully by PaySync server.")
                // Clean up from pending db if present
                val matched = db.getPendingMessages().find { it.messageHash == messageHash }
                if (matched != null) {
                    db.deletePendingSms(matched.id)
                }
            } else if (response.statusCode in 500..599 || response.statusCode == 0) {
                Log.w(TAG, "PaySync gateway temporarily unreachable (${response.statusCode}). Will retry.")
                return@withContext Result.retry()
            } else if (response.statusCode == 403) {
                Log.e(TAG, "Device has been deactivated by server. Halting sync.")
                authManager.setDeviceEnabled(false)
                return@withContext Result.failure()
            }
        }

        if (anyFailure) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    companion object {
        const val KEY_RAW_SMS = "key_raw_sms"
        const val KEY_SENDER = "key_sender"
        const val KEY_TIMESTAMP = "key_timestamp"
        const val KEY_HASH = "key_hash"
        private const val TAG = "SmsIngestionWorker"
    }
}
