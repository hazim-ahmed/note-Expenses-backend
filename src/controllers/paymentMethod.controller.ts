import { Response, NextFunction } from 'express';
import { PaymentMethodService } from '../services/paymentMethod.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class PaymentMethodController {
  static async getAll(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await PaymentMethodService.getAll();
      return sendSuccess(res, items, 'تم جلب طرق الدفع بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
