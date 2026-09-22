package com.paysync.collector.receiver

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

/**
 * High-priority Android BroadcastReceiver for capturing incoming SMS.
 * Discards non-MFS messages immediately to ensure zero private message exposure.
 * Enqueues verified transaction notifications for reliable backend delivery.
 */
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
            Log.d(TAG, "SMS discarded by privacy filter: Not an authorized bKash or Nagad notification.")
            return
        }

        Log.i(TAG, "Authorized MFS SMS detected from $senderAddress. Storing and initiating sync.")

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
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                java.util.concurrent.TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueue(uploadWorkRequest)
    }

    companion object {
        private const val TAG = "PaySyncSmsReceiver"
    }
}
