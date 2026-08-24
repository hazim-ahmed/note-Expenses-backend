import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errorCode: string = 'BAD_REQUEST',
    public errors?: any[]
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Unhandled Error:', err);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.errorCode, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'خطأ في التحقق من البيانات المدخلة', 'VALIDATION_ERROR', 400, formattedErrors);
  }

  const message = config.env === 'production' ? 'حدث خطأ غير متوقع في النظام' : err.message;
  return sendError(res, message, 'INTERNAL_SERVER_ERROR', 500);
}
