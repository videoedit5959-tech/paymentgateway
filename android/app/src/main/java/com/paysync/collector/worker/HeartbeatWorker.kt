package com.paysync.collector.worker

import android.content.Context
import android.content.Context.BATTERY_SERVICE
import android.content.Context.CONNECTIVITY_SERVICE
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paysync.collector.auth.DeviceAuthManager
import com.paysync.collector.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class HeartbeatWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val authManager = DeviceAuthManager.getInstance(applicationContext)
        val deviceId = authManager.getDeviceId()
        val deviceToken = authManager.getDeviceToken()
        val serverUrl = authManager.getServerUrl()

        if (deviceId.isNullOrEmpty() || deviceToken.isNullOrEmpty()) {
            return@withContext Result.success()
        }

        // 1. Read battery level
        val bm = applicationContext.getSystemService(BATTERY_SERVICE) as BatteryManager
        val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

        // 2. Read network type
        val cm = applicationContext.getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = cm.activeNetwork
        val caps = cm.getNetworkCapabilities(activeNetwork)
        val networkStatus = when {
            caps == null -> "NONE"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
            else -> "UNKNOWN"
        }

        // 3. Transmit heartbeat
        val response = ApiClient.sendHeartbeat(
            serverUrl = serverUrl,
            deviceId = deviceId,
            deviceToken = deviceToken,
            batteryLevel = batteryLevel,
            networkStatus = networkStatus,
            appVersion = "1.2.0"
        )

        if (response.isSuccessful) {
            Log.d(TAG, "Heartbeat ping synced. Battery: $batteryLevel%, Net: $networkStatus")
            Result.success()
        } else if (response.statusCode == 403) {
            Log.w(TAG, "Device disabled by admin. Marking locally disabled.")
            authManager.setDeviceEnabled(false)
            Result.failure()
        } else {
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "PaySyncHeartbeat"
    }
}
