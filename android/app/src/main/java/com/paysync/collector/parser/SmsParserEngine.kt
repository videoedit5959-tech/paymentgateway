package com.paysync.collector.parser

import java.security.MessageDigest

/**
 * Android Collector SMS Parser Engine.
 * Coordinates modular parsers and privacy filters.
 */
object SmsParserEngine {

    /**
     * Strict privacy filter: determines whether SMS comes from an authorized MFS sender
     * or contains a valid transaction receipt structure. Personal messages are strictly ignored.
     */
    fun isMfsNotification(sender: String, body: String): Boolean {
        if (BkashSmsParser.isBkashSender(sender) || NagadSmsParser.isNagadSender(sender)) {
            return true
        }

        val hasTrxKeyword = body.contains("TrxID", ignoreCase = true) || body.contains("TxnID", ignoreCase = true)
        val hasCurrency = body.contains("Tk", ignoreCase = true) || body.contains("BDT", ignoreCase = true)
        return hasTrxKeyword && hasCurrency
    }

    /**
     * Evaluates message content through provider parsers
     */
    fun parse(message: String): ParsedMfsResult? {
        val bkashResult = BkashSmsParser.parse(message)
        if (bkashResult != null && bkashResult.isValid) {
            return bkashResult
        }

        val nagadResult = NagadSmsParser.parse(message)
        if (nagadResult != null && nagadResult.isValid) {
            return nagadResult
        }

        return null
    }

    /**
     * Computes SHA-256 hash for local duplicate detection
     */
    fun computeHash(message: String, deviceId: String = ""): String {
        val input = "$deviceId:${message.trim().replace("\\s+".toRegex(), " ")}"
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
