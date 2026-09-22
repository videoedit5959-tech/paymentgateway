package com.paysync.collector.parser

import java.security.MessageDigest
import java.util.regex.Pattern

data class ParsedTransaction(
    val provider: String,
    val trxId: String,
    val amount: Double,
    val balance: Double?,
    val senderPhone: String?,
    val isValid: Boolean
)

object SmsParser {

    private val BKASH_SENDER_PATTERN = Pattern.compile("^(bKash|16247)$", Pattern.CASE_INSENSITIVE)
    private val NAGAD_SENDER_PATTERN = Pattern.compile("^(Nagad|16167)$", Pattern.CASE_INSENSITIVE)

    private val TRX_ID_REGEX = Pattern.compile("(?:TrxID|TxnID)[:\\s]+([A-Z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val AMOUNT_REGEX = Pattern.compile("(?:Tk|BDT)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)

    /**
     * Verifies if message qualifies as MFS transaction
     */
    fun isMfsMessage(sender: String, body: String): Boolean {
        if (BKASH_SENDER_PATTERN.matcher(sender).find() || NAGAD_SENDER_PATTERN.matcher(sender).find()) {
            return true
        }
        return TRX_ID_REGEX.matcher(body).find() && AMOUNT_REGEX.matcher(body).find()
    }

    /**
     * Compute SHA-256 for local duplicate protection
     */
    fun computeHash(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(text.trim().toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
