import { Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ExpenseCategoryCreateSchema, ExpenseCategoryUpdateSchema } from '../shared';

export class CategoryController {
  static async getAll(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await CategoryService.getAll();
      return sendSuccess(res, items, 'تم جلب تصنيفات المصروفات بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = ExpenseCategoryCreateSchema.parse(req.body);
      const userId = req.user?.id;
      const item = await CategoryService.create(validated, userId);
      return sendSuccess(res, item, 'تم إضافة تصنيف المصروف بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = ExpenseCategoryUpdateSchema.parse(req.body);
      const userId = req.user?.id;
      const item = await CategoryService.update(id, validated, userId);
      return sendSuccess(res, item, 'تم تحديث البيانات بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
