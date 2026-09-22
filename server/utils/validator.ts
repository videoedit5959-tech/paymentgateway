/**
 * Validation utilities for MFS operations, transactions, and inputs.
 */

export function isValidBdPhone(phone?: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-()]/g, '');
  // Bangladesh format: 013-019 (11 digits) or +88013-+88019 (14 digits) or 88013-88019 (13 digits)
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(clean);
}

export const isValidPhone = isValidBdPhone;

export function normalizeBdPhone(phone: string): string {
  const clean = phone.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+880')) return '0' + clean.slice(4);
  if (clean.startsWith('880')) return '0' + clean.slice(3);
  return clean;
}

export function isValidTrxId(trxId?: string): boolean {
  if (!trxId || typeof trxId !== 'string') return false;
  const clean = trxId.trim();
  // bKash & Nagad Transaction IDs are alphanumeric, 8 to 20 chars
  return /^[A-Za-z0-9]{8,20}$/.test(clean);
}

export function isValidAmount(amount: any, min: number = 1, max: number = 500000): boolean {
  const num = Number(amount);
  return !isNaN(num) && isFinite(num) && num >= min && num <= max;
}

export function isValidEmail(email?: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitizes an object to prevent NoSQL operator injection in MongoDB queries
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput) as unknown as T;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(input)) {
    // Strip leading dollar signs which indicate Mongo operators
    const safeKey = key.replace(/^\$+/, '');
    sanitized[safeKey] = sanitizeInput(value);
  }
  return sanitized;
}
