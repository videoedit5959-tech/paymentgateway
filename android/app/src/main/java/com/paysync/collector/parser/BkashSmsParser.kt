package com.paysync.collector.parser

import java.util.regex.Pattern

data class ParsedMfsResult(
    val provider: String,
    val trxId: String,
    val amount: Double,
    val balance: Double?,
    val sender: String?,
    val transactionType: String,
    val isValid: Boolean
)

/**
 * Android-side modular parser for bKash SMS notifications.
 * Filters sender names (bKash, 16247) and extracts transaction details with regex.
 */
object BkashSmsParser {

    private val SENDER_PATTERN = Pattern.compile("^(bKash|16247)$", Pattern.CASE_INSENSITIVE)
    private val TRX_ID_PATTERN = Pattern.compile("TrxID\\s*[:]?\\s*([A-Z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val AMOUNT_PATTERN = Pattern.compile("(?:received(?: payment)?|Cash In|Tk|BDT)\\s*(?:Tk|BDT)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val BALANCE_PATTERN = Pattern.compile("Balance\\s*[:]?\\s*(?:Tk|BDT)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val SENDER_PHONE_PATTERN = Pattern.compile("from\\s*[:]?\\s*(01[3-9][0-9]{8})", Pattern.CASE_INSENSITIVE)

    fun isBkashSender(sender: String): Boolean {
        return SENDER_PATTERN.matcher(sender.trim()).find()
    }

    fun parse(message: String): ParsedMfsResult? {
        val cleanMsg = message.replace("\r", " ").replace("\n", " ").trim()
        val trxMatcher = TRX_ID_PATTERN.matcher(cleanMsg)
        if (!trxMatcher.find()) return null

        val trxId = trxMatcher.group(1)?.uppercase() ?: return null

        val amtMatcher = AMOUNT_PATTERN.matcher(cleanMsg)
        val amount = if (amtMatcher.find()) {
            amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
        } else 0.0

        val balMatcher = BALANCE_PATTERN.matcher(cleanMsg)
        val balance = if (balMatcher.find()) {
            balMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
        } else null

        val senderMatcher = SENDER_PHONE_PATTERN.matcher(cleanMsg)
        val sender = if (senderMatcher.find()) senderMatcher.group(1) else null

        val txType = when {
            cleanMsg.contains("payment", ignoreCase = true) -> "PAYMENT"
            cleanMsg.contains("Cash In", ignoreCase = true) -> "CASH_IN"
            else -> "RECEIVED"
        }

        return ParsedMfsResult(
            provider = "BKASH",
            trxId = trxId,
            amount = amount,
            balance = balance,
            sender = sender,
            transactionType = txType,
            isValid = amount > 0.0 && trxId.length >= 6
        )
    }
}
