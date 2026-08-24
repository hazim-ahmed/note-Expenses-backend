import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { LoginSchema, RefreshTokenSchema } from '../shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = LoginSchema.parse(req.body);
      const result = await AuthService.login(validated.username, validated.password);
      return sendSuccess(res, result, 'تم تسجيل الدخول بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = RefreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshToken(validated.refreshToken);
      return sendSuccess(res, tokens, 'تم تجديد رمز الوصول بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, req.user, 'تم جلب بيانات المستخدم الحالية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, null, 'تم تسجيل الخروج بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
