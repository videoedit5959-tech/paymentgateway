import crypto from 'crypto';
import { MfsProvider } from '../../src/types/index.js';

export interface ParsedSms {
  provider: MfsProvider;
  transactionType: 'RECEIVED' | 'CASH_IN' | 'PAYMENT' | 'UNKNOWN';
  trxId: string;
  amount: number;
  balance?: number;
  fee?: number;
  reference?: string;
  sender?: string;
  receiver?: string;
  timestamp: string;
  messageHash: string;
  isValid: boolean;
  parseError?: string;
}

/**
 * Converts Bengali numeric characters (০-৯) to standard Latin digits (0-9)
 */
export function normalizeBengaliDigits(input: string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input.replace(/[০-৯]/g, (char) => {
    const index = bengaliDigits.indexOf(char);
    return index !== -1 ? String(index) : char;
  });
}

/**
 * Cleans zero-width characters, non-breaking spaces, and normalize text
 */
export function cleanSmsText(raw: string): string {
  if (!raw) return '';
  const converted = normalizeBengaliDigits(raw);
  return converted
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses all variants of bKash SMS notifications
 */
export class BkashSmsParser {
  public static canHandle(message: string): boolean {
    if (/nagad/i.test(message)) return false;
    return /bkash|TrxID|বিকাশ/i.test(message);
  }

  public static parse(message: string): Partial<ParsedSms> | null {
    // Normalizations
    const text = cleanSmsText(message);

    // Match TrxID: e.g. "TrxID 9K492ABC" or "TrxID: 9K492ABC" or "TrxID : 9K492ABC"
    const trxMatch = text.match(/TrxID\s*[:]?\s*([A-Z0-9]{6,16})/i);
    if (!trxMatch) {
      return null;
    }
    const trxId = trxMatch[1].trim().toUpperCase();

    // Match Amount:
    // "You have received Tk 1,500.00"
    // "You have received payment Tk 850.00"
    // "Cash In Tk 500.00"
    // "Tk 1,200.00 received"
    // "টাকা ১,৫০০.০০"
    const amountMatch =
      text.match(/(?:received(?: payment)?|Cash In|Tk|BDT|টাকা)\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Tk|BDT|টাকা)/i);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Match Balance: "Balance Tk 42,500.00" or "Balance : Tk 42,500.00" or "ব্যালেন্স টাকা 42,500.00"
    const balanceMatch = text.match(/(?:Balance|ব্যালেন্স)\s*[:]?\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : undefined;

    // Match Fee: "Fee Tk 0.00" or "Fee: Tk 5.00"
    const feeMatch = text.match(/(?:Fee|ফি)\s*[:]?\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const fee = feeMatch ? parseFloat(feeMatch[1].replace(/,/g, '')) : undefined;

    // Match Ref / Reference: "Ref: 1234" or "Ref 1234"
    const refMatch = text.match(/Ref\s*[:]?\s*([A-Za-z0-9_-]+)/i);
    const reference = refMatch ? refMatch[1].trim() : undefined;

    // Match Sender: "from 01987654321" or "from: 01712345678"
    const senderMatch = text.match(/(?:from|হতে)\s*[:]?\s*(01[3-9][0-9]{8})/i);
    const sender = senderMatch ? senderMatch[1] : undefined;

    // Match Receiver/Ref
    let transactionType: ParsedSms['transactionType'] = 'RECEIVED';
    if (/payment/i.test(text)) {
      transactionType = 'PAYMENT';
    } else if (/Cash In/i.test(text)) {
      transactionType = 'CASH_IN';
    }

    return {
      provider: 'BKASH',
      transactionType,
      trxId,
      amount,
      balance,
      fee,
      reference,
      sender,
      timestamp: new Date().toISOString(),
      isValid: amount > 0 && trxId.length >= 6,
    };
  }
}

/**
 * Parses all variants of Nagad SMS notifications
 */
export class NagadSmsParser {
  public static canHandle(message: string): boolean {
    return /Nagad|TxnID|নগদ/i.test(message);
  }

  public static parse(message: string): Partial<ParsedSms> | null {
    // Normalizations
    const text = cleanSmsText(message);

    // Match TxnID: e.g. "TxnID: 72N8K102" or "TxnID 72N8K102" or "Txn ID : 72N8K102"
    const trxMatch =
      text.match(/TxnID\s*[:]?\s*([A-Z0-9]{6,16})/i) ||
      text.match(/Txn\s*ID\s*[:]?\s*([A-Z0-9]{6,16})/i) ||
      text.match(/TrxID\s*[:]?\s*([A-Z0-9]{6,16})/i);

    if (!trxMatch) {
      return null;
    }
    const trxId = trxMatch[1].trim().toUpperCase();

    // Match Amount: "Amount: Tk 750.00" or "Money Received. Amount: Tk 2,000.00" or "Tk 750.00"
    const amountMatch =
      text.match(/Amount\s*[:]?\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      text.match(/(?:Money Received|Payment Received|টাকা গ্রহণ)[^0-9]*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      text.match(/(?:Tk|BDT|টাকা)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Match Balance: "Balance: Tk 19,450.00"
    const balanceMatch = text.match(/(?:Balance|ব্যালেন্স)\s*[:]?\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : undefined;

    // Match Fee: "Fee: Tk 0.00" or "Fee Tk 0.00"
    const feeMatch = text.match(/(?:Fee|ফি)\s*[:]?\s*(?:Tk|BDT|টাকা)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const fee = feeMatch ? parseFloat(feeMatch[1].replace(/,/g, '')) : undefined;

    // Match Ref: "Ref: 1234"
    const refMatch = text.match(/Ref\s*[:]?\s*([A-Za-z0-9_-]+)/i);
    const reference = refMatch ? refMatch[1].trim() : undefined;

    // Match Sender: "Sender: 01822334455" or "Customer: 01911223344"
    const senderMatch = text.match(/(?:Sender|Customer|from|প্রেরক)\s*[:]?\s*(01[3-9][0-9]{8})/i);
    const sender = senderMatch ? senderMatch[1] : undefined;

    let transactionType: ParsedSms['transactionType'] = 'RECEIVED';
    if (/payment/i.test(text)) {
      transactionType = 'PAYMENT';
    }

    return {
      provider: 'NAGAD',
      transactionType,
      trxId,
      amount,
      balance,
      fee,
      reference,
      sender,
      timestamp: new Date().toISOString(),
      isValid: amount > 0 && trxId.length >= 6,
    };
  }
}

/**
 * Unified SMS Parser Engine with modular routing, normalization, and hashing
 */
export class SmsParserEngine {
  /**
   * Generates a cryptographically secure hash of normalized SMS components
   * Prevents replay attacks and duplicate ingestion
   */
  public static computeMessageHash(
    message: string,
    deviceId: string = '',
    provider: string = '',
    sender: string = '',
    timestamp: string = ''
  ): string {
    const normalized = message.trim().replace(/\s+/g, ' ');
    const signatureBase = `${provider}:${deviceId}:${sender}:${normalized}:${timestamp}`;
    return crypto.createHash('sha256').update(signatureBase).digest('hex');
  }

  /**
   * Universal parser orchestrator
   */
  public static parse(message: string, deviceId: string = ''): ParsedSms {
    // 1. Try bKash parser
    if (BkashSmsParser.canHandle(message)) {
      const bkashData = BkashSmsParser.parse(message);
      if (bkashData && bkashData.isValid) {
        const hash = this.computeMessageHash(message, deviceId, 'BKASH', bkashData.sender || '');
        return {
          provider: 'BKASH',
          transactionType: bkashData.transactionType || 'RECEIVED',
          trxId: bkashData.trxId!,
          amount: bkashData.amount!,
          balance: bkashData.balance,
          fee: bkashData.fee,
          reference: bkashData.reference,
          sender: bkashData.sender,
          timestamp: bkashData.timestamp || new Date().toISOString(),
          messageHash: hash,
          isValid: true,
        };
      }
    }

    // 2. Try Nagad parser
    if (NagadSmsParser.canHandle(message)) {
      const nagadData = NagadSmsParser.parse(message);
      if (nagadData && nagadData.isValid) {
        const hash = this.computeMessageHash(message, deviceId, 'NAGAD', nagadData.sender || '');
        return {
          provider: 'NAGAD',
          transactionType: nagadData.transactionType || 'RECEIVED',
          trxId: nagadData.trxId!,
          amount: nagadData.amount!,
          balance: nagadData.balance,
          fee: nagadData.fee,
          reference: nagadData.reference,
          sender: nagadData.sender,
          timestamp: nagadData.timestamp || new Date().toISOString(),
          messageHash: hash,
          isValid: true,
        };
      }
    }

    // 3. Fallback generic extractor
    const cleaned = cleanSmsText(message);
    const genericTrx = cleaned.match(/(?:TrxID|TxnID)[:\s]+([A-Z0-9]{6,16})/i);
    const genericAmount = cleaned.match(/(?:Tk|BDT|টাকা)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (genericTrx && genericAmount) {
      const prov: MfsProvider = /Nagad|নগদ/i.test(message) ? 'NAGAD' : 'BKASH';
      const hash = this.computeMessageHash(message, deviceId, prov);
      return {
        provider: prov,
        transactionType: 'RECEIVED',
        trxId: genericTrx[1].toUpperCase(),
        amount: parseFloat(genericAmount[1].replace(/,/g, '')),
        timestamp: new Date().toISOString(),
        messageHash: hash,
        isValid: true,
      };
    }

    const fallbackHash = this.computeMessageHash(message, deviceId, 'UNKNOWN');
    return {
      provider: 'BKASH',
      transactionType: 'UNKNOWN',
      trxId: '',
      amount: 0,
      timestamp: new Date().toISOString(),
      messageHash: fallbackHash,
      isValid: false,
      parseError: 'Message did not match supported bKash or Nagad SMS notification formats.',
    };
  }
}

// Backward compatibility export
export const SmsParser = SmsParserEngine;
