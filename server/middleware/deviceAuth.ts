import { Request, Response, NextFunction } from 'express';
import { Repository } from '../db/repository.js';
import { sendError } from '../utils/response.js';
import { IDevice } from '../../src/types/index.js';

export interface DeviceAuthRequest extends Request {
  device?: IDevice;
}

/**
 * Middleware to authenticate requests originating from the Android SMS Collector.
 * Validates device identity and security token from headers.
 * Rejects requests if the device is unknown, invalid, or marked as DISABLED.
 */
export async function authenticateDevice(req: DeviceAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const deviceIdHeader = (req.headers['x-device-id'] || req.body?.deviceId) as string;
    const deviceTokenHeader = (req.headers['x-device-token'] || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '')) as string;

    if (!deviceIdHeader) {
      return sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID must be specified in X-Device-Id header or body.', 401);
    }

    const device = await Repository.getDeviceById(deviceIdHeader);
    if (!device) {
      return sendError(res, 'DEVICE_NOT_FOUND', 'Device identifier is not registered in the system.', 403);
    }

    if (device.status === 'DISABLED') {
      return sendError(res, 'DEVICE_DISABLED', 'This collector device has been disabled by the administrator.', 403);
    }

    if (device.status === 'UNPAIRED' || device.status === 'PENDING_PAIRING') {
      return sendError(res, 'DEVICE_NOT_PAIRED', `Device is in ${device.status} state. Complete pairing first.`, 403);
    }

    // Validate security token: allow simulation token only in non-production environments
    const isSimulationAllowed = process.env.NODE_ENV !== 'production';
    const isSimulationToken =
      isSimulationAllowed &&
      (deviceTokenHeader === 'dtok_demo_simulation' || deviceTokenHeader === 'simulator_token_test');
    const isTokenMatch = device.deviceToken && device.deviceToken === deviceTokenHeader;

    if (!isTokenMatch && !isSimulationToken) {
      return sendError(res, 'INVALID_DEVICE_TOKEN', 'Unauthorized device token. Please re-pair the device via QR code.', 401);
    }

    req.device = device;
    next();
  } catch (err: any) {
    return sendError(res, 'AUTH_INTERNAL_ERROR', err.message || 'Error authenticating device.', 500);
  }
}
