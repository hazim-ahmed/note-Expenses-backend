import { Response, NextFunction } from 'express';
import { BeneficiaryService } from '../services/beneficiary.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class BeneficiaryController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const items = await BeneficiaryService.getAll(search);
      return sendSuccess(res, items, 'تم جلب قائمة المستفيدين بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await BeneficiaryService.getById(id);
      return sendSuccess(res, item, 'تم جلب بيانات المستفيد بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const item = await BeneficiaryService.create(req.body);
      return sendSuccess(res, item, 'تم إضافة المستفيد بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await BeneficiaryService.update(id, req.body);
      return sendSuccess(res, item, 'تم تحديث بيانات المستفيد بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
