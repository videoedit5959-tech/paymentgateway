/**
 * Production Environment Configuration & Secret Validator
 * Enforces fail-fast security constraints on startup.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnvironment(): EnvValidationResult {
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredInProd = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'WEBHOOK_SIGNING_SECRET',
    'DEVICE_AUTH_SECRET',
    'ENCRYPTION_KEY',
  ];

  const insecureDefaults = [
    'paysync_jwt_access_secret_super_secure_key_min_32_chars',
    'paysync_jwt_refresh_secret_super_secure_key_min_32_chars',
    'paysync_webhook_hmac_secret_key',
    'paysync_device_pairing_and_auth_secret',
    'paysync_aes256_encryption_key_32bytes',
  ];

  for (const key of requiredInProd) {
    const val = process.env[key];
    if (!val || val.trim() === '') {
      if (isProd) {
        errors.push(`Missing mandatory environment variable: ${key}`);
      } else {
        warnings.push(`Environment variable ${key} is not set. Using local development fallback.`);
      }
    } else {
      // Check for insecure defaults in production
      if (isProd && insecureDefaults.includes(val)) {
        errors.push(`CRITICAL SECURITY RISK: ${key} is set to a default sample value in production!`);
      }
      // Check minimum secret length
      if (key.includes('SECRET') || key.includes('KEY')) {
        if (val.length < 24) {
          if (isProd) {
            errors.push(`Security constraint violation: ${key} must be at least 24 characters long (currently ${val.length}).`);
          } else {
            warnings.push(`Warning: ${key} is shorter than recommended (recommended >= 24 chars).`);
          }
        }
      }
    }
  }

  // Print sanitized warnings
  if (warnings.length > 0 && !isProd) {
    console.log('ℹ️  Environment Configuration Notice (Development Mode):');
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('❌ CRITICAL ENVIRONMENT CONFIGURATION ERRORS:');
    errors.forEach((e) => console.error(`   - ${e}`));
    if (isProd) {
      throw new Error(`Production startup aborted due to ${errors.length} critical configuration error(s).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
