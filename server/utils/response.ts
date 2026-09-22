import { Response } from 'express';

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
) {
  const requestId = (res.locals as any)?.requestId || (res.req as any)?.id;
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(requestId ? { requestId } : {}),
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details: any = null
) {
  const requestId = (res.locals as any)?.requestId || (res.req as any)?.id;
  // Sanitize message to prevent leaking internal database credentials or stack traces in production
  let sanitizedMessage = message;
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    sanitizedMessage = 'An internal system error occurred. Please reference the correlation ID with support.';
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: sanitizedMessage,
      ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
    },
    ...(requestId ? { requestId } : {}),
  });
}
