import { Response, NextFunction } from 'express';
import { JournalService } from '../services/journal.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class JournalController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const journals = await JournalService.getAllJournals();
      return sendSuccess(res, journals, 'تم جلب قائمة اليوميات بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const journal = await JournalService.getJournalById(id);
      return sendSuccess(res, journal, 'تم جلب بيانات اليومية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async close(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const journal = await JournalService.closeJournal(id, userId);
      return sendSuccess(res, journal, 'تم إغلاق اليومية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async reopen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const journal = await JournalService.reopenJournal(id, userId);
      return sendSuccess(res, journal, 'تم إعادة فتح اليومية بنجاح من قبل مسؤول النظام');
    } catch (error) {
      next(error);
    }
  }
}
