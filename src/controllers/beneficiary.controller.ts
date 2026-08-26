import { Response, NextFunction } from 'express';
import { BeneficiaryService } from '../services/beneficiary.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { BeneficiaryCreateSchema, BeneficiaryUpdateSchema } from '@expense-system/shared';

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
      const validated = BeneficiaryCreateSchema.parse(req.body);
      const userId = req.user?.id;
      const item = await BeneficiaryService.create(validated, userId);
      return sendSuccess(res, item, 'تم إضافة المستفيد بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = BeneficiaryUpdateSchema.parse(req.body);
      const userId = req.user?.id;
      const item = await BeneficiaryService.update(id, validated, userId);
      return sendSuccess(res, item, 'تم تحديث بيانات المستفيد بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
