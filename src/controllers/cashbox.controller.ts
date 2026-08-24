import { Response, NextFunction } from 'express';
import { CashboxService } from '../services/cashbox.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CashboxController {
  static async getAll(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await CashboxService.getAll();
      return sendSuccess(res, items, 'تم جلب قائمة الصناديق بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const item = await CashboxService.create(req.body);
      return sendSuccess(res, item, 'تم إضافة الصندوق بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await CashboxService.update(id, req.body);
      return sendSuccess(res, item, 'تم تحديث بيانات الصندوق بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
