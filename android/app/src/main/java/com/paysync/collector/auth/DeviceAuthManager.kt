package com.paysync.collector.auth

import android.content.Context
import android.content.SharedPreferences

class DeviceAuthManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun isPaired(): Boolean {
        return !getDeviceId().isNullOrEmpty() && !getDeviceToken().isNullOrEmpty()
    }

    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun getDeviceToken(): String? = prefs.getString(KEY_DEVICE_TOKEN, null)

    fun getServerUrl(): String = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL

    fun getMerchantId(): String? = prefs.getString(KEY_MERCHANT_ID, null)

    fun savePairing(
        deviceId: String,
        deviceToken: String,
        merchantId: String,
        serverUrl: String? = null
    ) {
        prefs.edit().apply {
            putString(KEY_DEVICE_ID, deviceId)
            putString(KEY_DEVICE_TOKEN, deviceToken)
            putString(KEY_MERCHANT_ID, merchantId)
            if (!serverUrl.isNullOrEmpty()) {
                putString(KEY_SERVER_URL, serverUrl)
            }
            putBoolean(KEY_DEVICE_ENABLED, true)
            putLong(KEY_PAIRED_AT, System.currentTimeMillis())
            apply()
        }
    }

    fun setDeviceEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DEVICE_ENABLED, enabled).apply()
    }

    fun isDeviceEnabled(): Boolean = prefs.getBoolean(KEY_DEVICE_ENABLED, true)

    fun unpair() {
        prefs.edit().apply {
            remove(KEY_DEVICE_ID)
            remove(KEY_DEVICE_TOKEN)
            remove(KEY_MERCHANT_ID)
            putBoolean(KEY_DEVICE_ENABLED, false)
            apply()
        }
    }

    companion object {
        private const val PREF_NAME = "paysync_collector_auth"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_MERCHANT_ID = "merchant_id"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_ENABLED = "device_enabled"
        private const val KEY_PAIRED_AT = "paired_at"
        const val DEFAULT_SERVER_URL = "https://api.yourdomain.com"

        @Volatile
        private var instance: DeviceAuthManager? = null

        fun getInstance(context: Context): DeviceAuthManager {
            return instance ?: synchronized(this) {
                instance ?: DeviceAuthManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
