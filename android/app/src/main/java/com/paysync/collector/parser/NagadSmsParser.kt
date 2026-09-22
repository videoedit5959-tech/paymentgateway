package com.paysync.collector.parser

import java.util.regex.Pattern

/**
 * Android-side modular parser for Nagad SMS notifications.
 * Filters sender names (Nagad, 16167) and extracts transaction details with regex.
 */
object NagadSmsParser {

    private val SENDER_PATTERN = Pattern.compile("^(Nagad|16167)$", Pattern.CASE_INSENSITIVE)
    private val TXN_ID_PATTERN = Pattern.compile("(?:TxnID|Txn\\s*ID|TrxID)\\s*[:]?\\s*([A-Z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val AMOUNT_PATTERN = Pattern.compile("(?:Amount\\s*[:]?\\s*(?:Tk|BDT)?|(?:Tk|BDT))\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val BALANCE_PATTERN = Pattern.compile("Balance\\s*[:]?\\s*(?:Tk|BDT)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val SENDER_PHONE_PATTERN = Pattern.compile("(?:Sender|Customer|from)\\s*[:]?\\s*(01[3-9][0-9]{8})", Pattern.CASE_INSENSITIVE)

    fun isNagadSender(sender: String): Boolean {
        return SENDER_PATTERN.matcher(sender.trim()).find()
    }

    fun parse(message: String): ParsedMfsResult? {
        val cleanMsg = message.replace("\r", " ").replace("\n", " ").trim()
        val txnMatcher = TXN_ID_PATTERN.matcher(cleanMsg)
        if (!txnMatcher.find()) return null

        val trxId = txnMatcher.group(1)?.uppercase() ?: return null

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

        val txType = if (cleanMsg.contains("Payment", ignoreCase = true)) "PAYMENT" else "RECEIVED"

        return ParsedMfsResult(
            provider = "NAGAD",
            trxId = trxId,
            amount = amount,
            balance = balance,
            sender = sender,
            transactionType = txType,
            isValid = amount > 0.0 && trxId.length >= 6
        )
    }
}
