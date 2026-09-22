package com.paysync.collector.network

import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class ApiResponse(
    val isSuccessful: Boolean,
    val statusCode: Int,
    val rawBody: String,
    val jsonObject: JSONObject?
)

data class BatchSmsItem(
    val message: String,
    val receivedAt: Long,
    val messageHash: String,
    val sender: String? = null
)

object ApiClient {

    private const val TAG = "PaySyncApiClient"
    private const val CONNECT_TIMEOUT_MS = 15000
    private const val READ_TIMEOUT_MS = 15000

    /**
     * Computes HMAC-SHA256 signature for request tamper & replay resistance
     */
    fun computeHmacSha256(data: String, secretKey: String): String {
        return try {
            val sha256Hmac = Mac.getInstance("HmacSHA256")
            val secretKeySpec = SecretKeySpec(secretKey.toByteArray(Charsets.UTF_8), "HmacSHA256")
            sha256Hmac.init(secretKeySpec)
            val bytes = sha256Hmac.doFinal(data.toByteArray(Charsets.UTF_8))
            bytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error generating HMAC signature", e)
            ""
        }
    }

    /**
     * Submits incoming SMS notification to the backend gateway.
     * Authenticates with X-Device-Id, X-Device-Token, X-Timestamp, X-Nonce, X-Signature.
     */
    fun ingestSms(
        serverUrl: String,
        deviceId: String,
        deviceToken: String,
        message: String,
        receivedAt: Long,
        messageHash: String,
        sender: String? = null
    ): ApiResponse {
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/device/sms"
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("message", message)
            put(
                "receivedAt",
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date(receivedAt))
            )
            put("messageHash", messageHash)
            if (!sender.isNullOrEmpty()) {
                put("sender", sender)
            }
        }

        return executePost(
            endpoint = endpoint,
            jsonBody = payload.toString(),
            deviceId = deviceId,
            deviceToken = deviceToken
        )
    }

    /**
     * Batch drains offline queued messages upon network reconnection
     */
    fun syncBatchSms(
        serverUrl: String,
        deviceId: String,
        deviceToken: String,
        items: List<BatchSmsItem>
    ): ApiResponse {
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/device/sms/batch"
        val array = JSONArray()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

        items.forEach { item ->
            val obj = JSONObject().apply {
                put("message", item.message)
                put("receivedAt", dateFormat.format(Date(item.receivedAt)))
                put("messageHash", item.messageHash)
                if (!item.sender.isNullOrEmpty()) {
                    put("sender", item.sender)
                }
            }
            array.put(obj)
        }

        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("messages", array)
        }

        return executePost(
            endpoint = endpoint,
            jsonBody = payload.toString(),
            deviceId = deviceId,
            deviceToken = deviceToken
        )
    }

    /**
     * Completes QR Pairing handshake with merchant gateway
     */
    fun pairDevice(
        serverUrl: String,
        pairingToken: String,
        merchantId: String? = null
    ): ApiResponse {
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/device/pair"
        val payload = JSONObject().apply {
            put("pairingToken", pairingToken)
            put("androidVersion", Build.VERSION.RELEASE)
            put("appVersion", "2.0.0")
            put("modelName", "${Build.MANUFACTURER} ${Build.MODEL}")
            if (!merchantId.isNullOrEmpty()) {
                put("merchantId", merchantId)
            }
        }

        return executePost(
            endpoint = endpoint,
            jsonBody = payload.toString()
        )
    }

    /**
     * Heartbeat status update (battery, network, version)
     */
    fun sendHeartbeat(
        serverUrl: String,
        deviceId: String,
        deviceToken: String,
        batteryLevel: Int,
        networkStatus: String,
        appVersion: String = "2.0.0"
    ): ApiResponse {
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/device/heartbeat"
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("batteryLevel", batteryLevel)
            put("networkStatus", networkStatus)
            put("appVersion", appVersion)
        }

        return executePost(
            endpoint = endpoint,
            jsonBody = payload.toString(),
            deviceId = deviceId,
            deviceToken = deviceToken
        )
    }

    /**
     * Fetches gateway configuration and merchant wallet list
     */
    fun fetchConfig(
        serverUrl: String,
        deviceId: String,
        deviceToken: String
    ): ApiResponse {
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/device/config"
        var connection: HttpURLConnection? = null
        try {
            val url = URL(endpoint)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-Device-Id", deviceId)
                setRequestProperty("X-Device-Token", deviceToken)
                setRequestProperty("Authorization", "Bearer $deviceToken")
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299
            val stream = if (isSuccess) connection.inputStream else connection.errorStream
            val responseBody = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""

            return ApiResponse(
                isSuccessful = isSuccess,
                statusCode = statusCode,
                rawBody = responseBody,
                jsonObject = try { if (responseBody.isNotEmpty()) JSONObject(responseBody) else null } catch (e: Exception) { null }
            )
        } catch (e: Exception) {
            return ApiResponse(false, 0, e.message ?: "Network error", null)
        } finally {
            connection?.disconnect()
        }
    }

    private fun executePost(
        endpoint: String,
        jsonBody: String,
        deviceId: String? = null,
        deviceToken: String? = null
    ): ApiResponse {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(endpoint)
            val timestamp = System.currentTimeMillis().toString()
            val nonce = UUID.randomUUID().toString()

            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-Timestamp", timestamp)
                setRequestProperty("X-Nonce", nonce)

                if (!deviceId.isNullOrEmpty()) {
                    setRequestProperty("X-Device-Id", deviceId)
                }
                if (!deviceToken.isNullOrEmpty()) {
                    setRequestProperty("X-Device-Token", deviceToken)
                    setRequestProperty("Authorization", "Bearer $deviceToken")

                    val sigBase = "$timestamp.$nonce.$jsonBody"
                    val signature = computeHmacSha256(sigBase, deviceToken)
                    if (signature.isNotEmpty()) {
                        setRequestProperty("X-Signature", signature)
                    }
                }
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299
            val inputStream = if (isSuccess) connection.inputStream else connection.errorStream

            val responseBody = if (inputStream != null) {
                BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8)).use { it.readText() }
            } else ""

            val json = try {
                if (responseBody.isNotEmpty()) JSONObject(responseBody) else null
            } catch (e: Exception) {
                null
            }

            return ApiResponse(
                isSuccessful = isSuccess,
                statusCode = statusCode,
                rawBody = responseBody,
                jsonObject = json
            )
        } catch (e: Exception) {
            Log.e(TAG, "Network transport error calling $endpoint", e)
            return ApiResponse(
                isSuccessful = false,
                statusCode = 0,
                rawBody = e.message ?: "Network error",
                jsonObject = null
            )
        } finally {
            connection?.disconnect()
        }
    }
}
