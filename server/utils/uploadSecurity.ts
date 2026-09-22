/**
 * File Upload Security & Sanitation Utility
 * Protects against executable uploads, MIME spoofing, directory traversal, and oversized payloads.
 */

import crypto from 'crypto';

export interface FileValidationOptions {
  maxSizeBytes?: number; // default 5MB
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const DEFAULT_ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// Magic number signatures for strict binary header checking
const MAGIC_NUMBERS: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

export interface FileValidationResult {
  valid: boolean;
  sanitizedFilename?: string;
  detectedMime?: string;
  sizeBytes?: number;
  error?: string;
}

export function validateUploadedBuffer(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType: string,
  options: FileValidationOptions = {}
): FileValidationResult {
  const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE;
  const allowedMimes = options.allowedMimeTypes || DEFAULT_ALLOWED_MIMES;
  const allowedExts = options.allowedExtensions || DEFAULT_ALLOWED_EXTS;

  // 1. Size Check
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'FILE_EMPTY: No file payload provided.' };
  }
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `FILE_TOO_LARGE: Upload size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds limit of ${(maxSize / 1024 / 1024).toFixed(2)} MB.`,
    };
  }

  // 2. Extension Check
  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) {
    return { valid: false, error: 'INVALID_EXTENSION: Missing or hidden file extension.' };
  }
  const extension = `.${extMatch[1].toLowerCase()}`;
  if (!allowedExts.includes(extension)) {
    return { valid: false, error: `UNSUPPORTED_EXTENSION: Files of type '${extension}' are strictly forbidden.` };
  }

  // 3. MIME Whitelist Check
  const normalizedMime = declaredMimeType.toLowerCase().trim();
  if (!allowedMimes.includes(normalizedMime)) {
    return { valid: false, error: `UNSUPPORTED_MIME: Declared MIME type '${declaredMimeType}' is not allowed.` };
  }

  // 4. Magic Number Header Inspection
  const signatures = MAGIC_NUMBERS[normalizedMime];
  if (signatures) {
    let headerMatches = false;
    for (const signature of signatures) {
      if (buffer.length >= signature.length) {
        const matches = signature.every((byte, idx) => buffer[idx] === byte);
        if (matches) {
          headerMatches = true;
          break;
        }
      }
    }

    if (!headerMatches) {
      return {
        valid: false,
        error: `MIME_SPOOFING_DETECTED: File header signatures do not match declared content type '${normalizedMime}'.`,
      };
    }
  }

  // 5. Generate Safe, Nonce-based Collision-Free Filename (prevent traversal and overwrite)
  const randomHex = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const sanitizedFilename = `proof_${timestamp}_${randomHex}${extension}`;

  return {
    valid: true,
    sanitizedFilename,
    detectedMime: normalizedMime,
    sizeBytes: buffer.length,
  };
}
