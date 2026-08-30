import { Response, NextFunction } from 'express';
import { JournalService } from '../services/journal.service';
import { TransactionService } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getRiyadhDateString } from '../utils/date';
import { TodayTransactionCreateSchema, TodayTransactionUpdateSchema } from '../shared';
import { cacheService } from '../services/cache.service';

export class TodayController {
  static async getTodayOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const systemDate = getRiyadhDateString();
      const cacheKey = `today:overview:${systemDate}:${userId}:${userRole}`;

      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return sendSuccess(res, cached, 'بيانات يومية اليوم (Cached ⚡)');
      }

      const todayJournal = await JournalService.getOrCreateTodayJournal(userId, userRole);

      const payload = {
        systemDate,
        journalId: todayJournal.id,
        journalNumber: todayJournal.journalNumber,
        status: todayJournal.status,
        totalAmount: todayJournal.totalAmount,
        transactionsCount: todayJournal.transactionsCount,
      };

      await cacheService.set(cacheKey, payload, 60); // 1 minute TTL
      return sendSuccess(res, payload, `بيانات يومية اليوم التلقائية بتاريخ ${systemDate}`);
    } catch (error) {
      next(error);
    }
  }

  static async getTodayTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const systemDate = getRiyadhDateString();
      const cacheKey = `today:transactions:${systemDate}:${userId}:${userRole}`;

      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return sendSuccess(res, cached, 'تم جلب مصروفات اليوم بنجاح (Cached ⚡)');
      }

      const todayJournal = await JournalService.getOrCreateTodayJournal(userId, userRole);
      const transactions = todayJournal.transactions || [];

      await cacheService.set(cacheKey, transactions, 60); // 1 minute TTL
      return sendSuccess(res, transactions, 'تم جلب مصروفات اليوم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async createTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const validated = TodayTransactionCreateSchema.parse(req.body);
      const result = await TransactionService.createTodayTransaction(validated, userId, userRole);

      // Invalidate cache
      await cacheService.delPattern('today:*');
      await cacheService.delPattern('journals:*');
      await cacheService.delPattern('reports:*');

      return sendSuccess(res, result, 'تم إضافة المصروف في يومية اليوم بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const validated = TodayTransactionUpdateSchema.parse(req.body);
      const result = await TransactionService.updateTodayTransaction(id, validated, userId, userRole);

      // Invalidate cache
      await cacheService.delPattern('today:*');
      await cacheService.delPattern('journals:*');
      await cacheService.delPattern('reports:*');

      return sendSuccess(res, result, 'تم تعديل بيانات المصروف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles?.[0] || 'EXPENSE_USER';
      const result = await TransactionService.deleteTodayTransaction(id, userId, userRole);

      // Invalidate cache
      await cacheService.delPattern('today:*');
      await cacheService.delPattern('journals:*');
      await cacheService.delPattern('reports:*');

      return sendSuccess(res, result, 'تم حذف المصروف بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
