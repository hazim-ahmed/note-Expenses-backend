import { Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { BulkAssignProjectSchema, TodayTransactionCreateSchema, TodayTransactionUpdateSchema } from '../shared';

export class TransactionController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const validated = TodayTransactionCreateSchema.parse(req.body);
      const result = await TransactionService.createTodayTransaction(validated, userId, userRole);
      return sendSuccess(res, result, 'تم إضافة المصروف بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const validated = TodayTransactionUpdateSchema.parse(req.body);
      const result = await TransactionService.updateTodayTransaction(id, validated, userId, userRole);
      return sendSuccess(res, result, 'تم تعديل المصروف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const result = await TransactionService.deleteTodayTransaction(id, userId, userRole);
      return sendSuccess(res, result, 'تم حذف المصروف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async bulkAssignProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { transactionIds, projectId, reason } = BulkAssignProjectSchema.parse(req.body);
      const userId = req.user!.id;
      const result = await TransactionService.bulkAssignProject(
        transactionIds,
        projectId,
        reason,
        userId
      );
      return sendSuccess(res, result, `تم ربط ${result.assigned} سند بمشروع (${result.projectName}) بنجاح`);
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const { comments } = req.body || {};
      const result = await TransactionService.approveTransaction(id, userId, userRole, comments);
      return sendSuccess(res, result, 'تم اعتماد سند الصرف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const { reason } = req.body || {};
      const result = await TransactionService.rejectTransaction(id, userId, userRole, reason);
      return sendSuccess(res, result, 'تم رفض سند الصرف');
    } catch (error) {
      next(error);
    }
  }
}
