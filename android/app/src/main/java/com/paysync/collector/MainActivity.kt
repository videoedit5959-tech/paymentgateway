package com.paysync.collector

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
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
    private lateinit var btnTestHeartbeat: Button
    private lateinit var btnUnpair: Button

    private lateinit var authManager: DeviceAuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        authManager = DeviceAuthManager.getInstance(this)

        checkAndRequestPermissions()
        initializeViews()
        schedulePeriodicHeartbeat()
        updateUiState()
    }

    override fun onResume() {
        super.onResume()
        updateUiState()
    }

    private fun initializeViews() {
        tvStatus = findViewById(R.id.tvStatus)
        tvDeviceInfo = findViewById(R.id.tvDeviceInfo)
        tvQueueInfo = findViewById(R.id.tvQueueInfo)
        btnPair = findViewById(R.id.btnPair)
        btnTestHeartbeat = findViewById(R.id.btnTestHeartbeat)
        btnUnpair = findViewById(R.id.btnUnpair)

        btnPair.setOnClickListener {
            val intent = Intent(this, PairingActivity::class.java)
            startActivity(intent)
        }

        btnTestHeartbeat.setOnClickListener {
            sendImmediateHeartbeat()
        }

        btnUnpair.setOnClickListener {
            authManager.unpair()
            updateUiState()
            Toast.makeText(this, "Device unpaired and credentials removed.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateUiState() {
        val isPaired = authManager.isPaired()
        val deviceId = authManager.getDeviceId()
        val isEnabled = authManager.isDeviceEnabled()
        val pendingCount = PendingSmsDatabase.getInstance(this).getPendingCount()

        tvQueueInfo.text = "Offline Buffered Queue: $pendingCount messages pending sync"

        if (isPaired && isEnabled) {
            tvStatus.text = "Status: ONLINE & MONITORING MFS NOTIFICATIONS"
            tvStatus.setTextColor(getColor(android.R.color.holo_green_dark))
            tvDeviceInfo.text = """
                Device ID: $deviceId
                Merchant: ${authManager.getMerchantId() ?: "Verified Store"}
                Gateway: ${authManager.getServerUrl()}
                Active Providers: bKash (16247) & Nagad (16167)
                App Version: 1.2.0 (Build 42)
            """.trimIndent()
            btnPair.text = "Re-scan QR to Re-pair"
            btnUnpair.isEnabled = true
        } else if (isPaired && !isEnabled) {
            tvStatus.text = "Status: DISABLED BY ADMIN"
            tvStatus.setTextColor(getColor(android.R.color.holo_red_dark))
            tvDeviceInfo.text = "This collector device has been disabled from the PaySync administration console."
            btnPair.text = "Re-pair Device"
            btnUnpair.isEnabled = true
        } else {
            tvStatus.text = "Status: UNPAIRED"
            tvStatus.setTextColor(getColor(android.R.color.holo_orange_dark))
            tvDeviceInfo.text = "Open PaySync Merchant Portal > Devices > Scan Pairing QR Code to activate collector."
            btnPair.text = "Scan QR to Pair"
            btnUnpair.isEnabled = false
        }
    }

    private fun schedulePeriodicHeartbeat() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val heartbeatWork = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "PaySyncHeartbeatWork",
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatWork
        )
    }

    private fun sendImmediateHeartbeat() {
        val oneTimeHeartbeat = OneTimeWorkRequestBuilder<HeartbeatWorker>().build()
        WorkManager.getInstance(this).enqueue(oneTimeHeartbeat)
        val bm = getSystemService(BATTERY_SERVICE) as BatteryManager
        val batLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        Toast.makeText(this, "Heartbeat request dispatched. Battery: $batLevel%", Toast.LENGTH_SHORT).show()
    }

    private fun checkAndRequestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.CAMERA
        )

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), PERMISSION_REQ_CODE)
        }
    }

    companion object {
        private const val PERMISSION_REQ_CODE = 101
    }
}
