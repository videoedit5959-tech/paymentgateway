package com.paysync.collector.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class PendingSmsRecord(
    val id: Long = 0,
    val sender: String,
    val messageBody: String,
    val messageHash: String,
    val receivedTimestamp: Long,
    val retryCount: Int = 0
)

/**
 * Local offline storage for intercepted MFS messages.
 * Guarantees zero message loss during cellular or WiFi network outages.
 */
class PendingSmsDatabase private constructor(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE_PENDING (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_SENDER TEXT NOT NULL,
                $COL_BODY TEXT NOT NULL,
                $COL_HASH TEXT NOT NULL UNIQUE,
                $COL_TIMESTAMP INTEGER NOT NULL,
                $COL_RETRY_COUNT INTEGER DEFAULT 0,
                $COL_CREATED_AT INTEGER DEFAULT (strftime('%s', 'now'))
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_PENDING")
        onCreate(db)
    }

    fun enqueuePendingSms(sender: String, messageBody: String, messageHash: String, timestamp: Long): Boolean {
        return try {
            val values = ContentValues().apply {
                put(COL_SENDER, sender)
                put(COL_BODY, messageBody)
                put(COL_HASH, messageHash)
                put(COL_TIMESTAMP, timestamp)
                put(COL_RETRY_COUNT, 0)
            }
            val rowId = writableDatabase.insertWithOnConflict(
                TABLE_PENDING,
                null,
                values,
                SQLiteDatabase.CONFLICT_IGNORE
            )
            rowId != -1L
        } catch (e: Exception) {
            false
        }
    }

    fun getPendingMessages(limit: Int = 20): List<PendingSmsRecord> {
        val list = mutableListOf<PendingSmsRecord>()
        val cursor = readableDatabase.query(
            TABLE_PENDING,
            null,
            null,
            null,
            null,
            null,
            "$COL_TIMESTAMP ASC",
            limit.toString()
        )
        cursor.use {
            val idIndex = it.getColumnIndexOrThrow(COL_ID)
            val senderIndex = it.getColumnIndexOrThrow(COL_SENDER)
            val bodyIndex = it.getColumnIndexOrThrow(COL_BODY)
            val hashIndex = it.getColumnIndexOrThrow(COL_HASH)
            val timeIndex = it.getColumnIndexOrThrow(COL_TIMESTAMP)
            val retryIndex = it.getColumnIndexOrThrow(COL_RETRY_COUNT)

            while (it.moveToNext()) {
                list.add(
                    PendingSmsRecord(
                        id = it.getLong(idIndex),
                        sender = it.getString(senderIndex),
                        messageBody = it.getString(bodyIndex),
                        messageHash = it.getString(hashIndex),
                        receivedTimestamp = it.getLong(timeIndex),
                        retryCount = it.getInt(retryIndex)
                    )
                )
            }
        }
        return list
    }

    fun deletePendingSms(id: Long): Boolean {
        return writableDatabase.delete(TABLE_PENDING, "$COL_ID = ?", arrayOf(id.toString())) > 0
    }

    fun incrementRetry(id: Long) {
        writableDatabase.execSQL("UPDATE $TABLE_PENDING SET $COL_RETRY_COUNT = $COL_RETRY_COUNT + 1 WHERE $COL_ID = ?", arrayOf(id.toString()))
    }

    fun getPendingCount(): Int {
        val cursor = readableDatabase.rawQuery("SELECT COUNT(*) FROM $TABLE_PENDING", null)
        return cursor.use {
            if (it.moveToFirst()) it.getInt(0) else 0
        }
    }

    companion object {
        private const val DATABASE_NAME = "paysync_pending_sms.db"
        private const val DATABASE_VERSION = 1

        const val TABLE_PENDING = "pending_sms"
        const val COL_ID = "id"
        const val COL_SENDER = "sender"
        const val COL_BODY = "message_body"
        const val COL_HASH = "message_hash"
        const val COL_TIMESTAMP = "received_timestamp"
        const val COL_RETRY_COUNT = "retry_count"
        const val COL_CREATED_AT = "created_at"

        @Volatile
        private var instance: PendingSmsDatabase? = null

        fun getInstance(context: Context): PendingSmsDatabase {
            return instance ?: synchronized(this) {
                instance ?: PendingSmsDatabase(context.applicationContext).also { instance = it }
            }
        }
    }
}
