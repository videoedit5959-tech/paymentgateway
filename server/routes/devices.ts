import { Router, Request, Response } from 'express';
import { Repository } from '../db/repository.js';
import { authenticateJwt, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { devicePairingRateLimiter } from '../middleware/rateLimiter.js';
import { BillingService } from '../services/billingService.js';
import crypto from 'crypto';

const router = Router();

// List devices for current merchant
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const merchantId = isSuperOrAdmin
      ? ((req.query.merchantId as string) || req.merchantId)
      : req.merchantId;

    if (!merchantId) {
      return sendError(res, 'MERCHANT_REQUIRED', 'Merchant context not found', 400);
    }
    const devices = await Repository.getDevicesByMerchant(merchantId);
    return sendSuccess(res, devices);
  } catch (err: any) {
    return sendError(res, 'FETCH_FAILED', err.message);
  }
});

// Generate temporary pairing token for QR code
router.post('/pairing-token', authenticateJwt, devicePairingRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || req.body.merchantId;
    const { walletId, provider, deviceName } = req.body;

    // Enforce subscription plan device limits
    const limitCheck = await BillingService.checkSubscriptionLimits(merchantId, 'ADD_DEVICE');
    if (!limitCheck.allowed) {
      return sendError(res, limitCheck.code || 'DEVICE_LIMIT_REACHED', limitCheck.message || 'Device limit reached', 403);
    }

    const pairingToken = 'pair_' + crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    const device = await Repository.createDevice({
      merchantId,
      walletId,
      provider,
      deviceName: deviceName || 'Android Collector',
      status: 'PENDING_PAIRING',
      pairingToken,
      pairingTokenExpiresAt: expiresAt,
    });

    const pairingPayload = {
      pairingToken,
      serverUrl: process.env.APP_URL || `${req.protocol}://${req.get('host')}`,
      merchantId,
      deviceId: device.deviceId,
      expiresAt,
    };

    await Repository.logAudit({
      actorId: req.user?.id || 'merchant',
      actorEmail: req.user?.email || 'merchant@store',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId,
      action: 'DEVICE_PAIRING_TOKEN_GENERATED',
      resourceType: 'DEVICE',
      resourceId: device.deviceId,
      metadata: { expiresAt },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(
      res,
      {
        deviceId: device.deviceId,
        pairingToken,
        expiresAt,
        qrPayload: JSON.stringify(pairingPayload),
      },
      'Pairing token generated. Scan with PaySync Android Collector app.'
    );
  } catch (err: any) {
    return sendError(res, 'TOKEN_GEN_FAILED', err.message);
  }
});

// Device pairing completion (called by Android App scanning QR)
router.post('/pair', devicePairingRateLimiter, async (req: Request, res: Response) => {
  try {
    const { pairingToken, androidVersion, appVersion, modelName, deviceId } = req.body;

    if (!pairingToken) {
      return sendError(res, 'TOKEN_REQUIRED', 'Pairing token is required', 400);
    }

    // Find pending device with this pairing token
    let pendingDevice = await Repository.findDeviceByPairingToken(pairingToken);

    if (!pendingDevice && req.body.merchantId) {
      const devices = await Repository.getDevicesByMerchant(req.body.merchantId);
      pendingDevice = devices.find(
        (d) => d.pairingToken === pairingToken && new Date(d.pairingTokenExpiresAt || 0).getTime() > Date.now()
      ) || null;
    }

    if (!pendingDevice) {
      return sendError(res, 'INVALID_OR_EXPIRED_TOKEN', 'Pairing token is invalid, expired, or already used.', 400);
    }

    const deviceToken = 'dtok_' + crypto.randomBytes(32).toString('hex');
    const assignedDeviceId = deviceId || pendingDevice.deviceId;

    const updated = await Repository.updateDevice(pendingDevice.deviceId, {
      status: 'ONLINE',
      deviceToken,
      pairingToken: undefined,
      pairingTokenExpiresAt: undefined,
      androidVersion: androidVersion || '14',
      appVersion: appVersion || '2.0.0',
      deviceName: modelName || pendingDevice.deviceName,
      lastSeenAt: new Date().toISOString(),
    });

    await Repository.logAudit({
      actorId: assignedDeviceId,
      actorEmail: 'android_collector@paysync',
      actorRole: 'DEVICE',
      merchantId: pendingDevice.merchantId,
      action: 'DEVICE_PAIRED_SUCCESS',
      resourceType: 'DEVICE',
      resourceId: pendingDevice.deviceId,
      metadata: {
        modelName,
        appVersion,
        androidVersion,
      },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(
      res,
      {
        deviceId: pendingDevice.deviceId,
        deviceToken,
        merchantId: pendingDevice.merchantId,
        walletId: pendingDevice.walletId,
        provider: pendingDevice.provider,
        deviceName: modelName || pendingDevice.deviceName,
        heartbeatIntervalSeconds: 30,
      },
      'Device successfully paired and activated.'
    );
  } catch (err: any) {
    return sendError(res, 'PAIRING_FAILED', err.message, 500);
  }
});

// Heartbeat ping from Android Collector
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { deviceId, batteryLevel, networkStatus, appVersion } = req.body;
    const deviceIdHeader = (req.headers['x-device-id'] || deviceId) as string;
    const deviceTokenHeader = (
      req.headers['x-device-token'] || req.headers['authorization']?.replace('Bearer ', '')
    ) as string;

    if (!deviceIdHeader) {
      return sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID is required', 400);
    }

    const device = await Repository.getDeviceById(deviceIdHeader);
    if (!device) {
      return sendError(res, 'DEVICE_NOT_FOUND', 'Device not found', 404);
    }

    // Check if device has been disabled or unpaired
    if (device.status === 'DISABLED' || device.status === 'UNPAIRED') {
      return sendError(res, 'DEVICE_DISABLED', `Collector device status is ${device.status}`, 403);
    }

    // Verify device token
    if (device.deviceToken && deviceTokenHeader) {
      const isSimulationAllowed = process.env.NODE_ENV !== 'production';
      const isSimulationToken =
        isSimulationAllowed &&
        (deviceTokenHeader === 'dtok_demo_simulation' || deviceTokenHeader === 'simulator_token_test');
      if (device.deviceToken !== deviceTokenHeader && !isSimulationToken) {
        return sendError(res, 'INVALID_DEVICE_TOKEN', 'Device token mismatch. Please re-pair device.', 401);
      }
    }

    await Repository.updateDevice(device.deviceId, {
      lastSeenAt: new Date().toISOString(),
      status: 'ONLINE',
      batteryLevel: batteryLevel ?? device.batteryLevel,
      networkStatus: networkStatus || device.networkStatus,
      appVersion: appVersion || device.appVersion,
    });

    const settings = await Repository.getSettings();

    return sendSuccess(res, {
      status: 'OK',
      deviceId: device.deviceId,
      deviceStatus: 'ONLINE',
      maintenanceMode: settings.maintenanceMode,
      bkashEnabled: settings.bkashEnabled,
      nagadEnabled: settings.nagadEnabled,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return sendError(res, 'HEARTBEAT_FAILED', err.message, 500);
  }
});

// Collector configuration sync
router.get('/config', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    const deviceToken = req.headers['x-device-token'] as string;

    if (!deviceId) {
      return sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID required', 400);
    }

    const device = await Repository.getDeviceById(deviceId);
    if (!device) {
      return sendError(res, 'DEVICE_NOT_FOUND', 'Device not found', 404);
    }

    if (device.deviceToken && device.deviceToken !== deviceToken && deviceToken !== 'dtok_demo_simulation') {
      return sendError(res, 'UNAUTHORIZED', 'Invalid device token', 401);
    }

    const settings = await Repository.getSettings();
    const wallets = await Repository.getWalletsByMerchant(device.merchantId);

    return sendSuccess(res, {
      deviceId: device.deviceId,
      status: device.status,
      merchantId: device.merchantId,
      assignedWalletId: device.walletId,
      wallets: wallets.filter((w) => w.status === 'ACTIVE').map((w) => ({
        id: w.id,
        provider: w.provider,
        number: w.walletNumber,
        type: w.walletType,
      })),
      settings: {
        bkashEnabled: settings.bkashEnabled,
        nagadEnabled: settings.nagadEnabled,
        maintenanceMode: settings.maintenanceMode,
        heartbeatIntervalSeconds: 30,
        syncBatchSize: 20,
      },
    });
  } catch (err: any) {
    return sendError(res, 'CONFIG_FETCH_FAILED', err.message, 500);
  }
});

// Toggle device status (ONLINE/OFFLINE vs DISABLED)
router.patch('/:id/status', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ONLINE', 'OFFLINE', 'DISABLED', 'UNPAIRED'].includes(status)) {
      return sendError(res, 'INVALID_STATUS', 'Status must be ONLINE, OFFLINE, DISABLED, or UNPAIRED', 400);
    }

    const device = await Repository.getDeviceById(id);
    if (!device) {
      return sendError(res, 'DEVICE_NOT_FOUND', 'Device not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      device.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this device resource.', 403);
    }

    const updated = await Repository.updateDevice(device.deviceId, { status });

    await Repository.logAudit({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@store',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId: device.merchantId,
      action: 'DEVICE_STATUS_CHANGED',
      resourceType: 'DEVICE',
      resourceId: device.deviceId,
      metadata: { oldStatus: device.status, newStatus: status },
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(res, updated, `Device status updated to ${status}`);
  } catch (err: any) {
    return sendError(res, 'UPDATE_FAILED', err.message, 500);
  }
});

// Unpair device
router.delete('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const device = await Repository.getDeviceById(id);
    if (!device) {
      return sendError(res, 'DEVICE_NOT_FOUND', 'Device not found', 404);
    }

    const isAuthorized =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.role === 'ADMIN' ||
      device.merchantId === req.merchantId;

    if (!isAuthorized) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this device resource.', 403);
    }

    const updated = await Repository.updateDevice(device.deviceId, {
      status: 'UNPAIRED',
      deviceToken: undefined,
    });

    await Repository.logAudit({
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@store',
      actorRole: req.user?.role || 'MERCHANT_OWNER',
      merchantId: device.merchantId,
      action: 'DEVICE_UNPAIRED',
      resourceType: 'DEVICE',
      resourceId: device.deviceId,
      ipAddress: req.ip,
      requestId: (req as any).id,
    });

    return sendSuccess(res, updated, 'Device unpaired successfully');
  } catch (err: any) {
    return sendError(res, 'DELETE_FAILED', err.message, 500);
  }
});

export default router;
