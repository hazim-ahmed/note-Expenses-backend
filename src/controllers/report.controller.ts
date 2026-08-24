import { Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ReportController {
  static async getDailyExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const data = await ReportService.getDailyExpensesReport(date);
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات اليومية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getExpensesByProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      const data = await ReportService.getExpensesByProject(projectId);
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getExpensesByBeneficiary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getExpensesByBeneficiary();
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب المستفيد بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getExpensesByCategory(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getExpensesByCategory();
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب التصنيف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getUnassignedProjectTransactions(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getUnassignedProjectTransactions();
      return sendSuccess(res, data, 'تم جلب السندات غير المرتبطة بمشاريع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getPendingInvoices(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getPendingInvoicesReport();
      return sendSuccess(res, data, 'تم جلب تقرير الفواتير المعلقة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getManualVouchers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getManualVouchersReport();
      return sendSuccess(res, data, 'تم جلب تقرير السندات اليدوية بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
