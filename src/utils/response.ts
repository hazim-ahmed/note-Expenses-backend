import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'تم تنفيذ العملية بنجاح',
  statusCode = 200,
  meta?: any
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  message = 'تعذر تنفيذ العملية',
  errorCode = 'INTERNAL_SERVER_ERROR',
  statusCode = 500,
  errors?: any
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(errors ? { errors } : {}),
  });
}
