import { Response, NextFunction } from 'express';
import { JournalService } from '../services/journal.service';
import { ExportService } from '../services/export.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function formatPaymentMethod(pm: any): string {
  if (!pm) return 'كاش';
  const val = typeof pm === 'string' ? pm : (pm.name || pm.code || '');
  if (val.includes('بنك') || val.includes('BANK') || val.includes('تحويل') || val.includes('شيك') || val.includes('بطاقة') || val.includes('CARD') || val.includes('CHECK')) {
    return 'بنك';
  }
  if (val.includes('كاش') || val.includes('نقد') || val.includes('CASH')) {
    return 'كاش';
  }
  return val || 'كاش';
}

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

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const journal = await JournalService.approveJournal(id, userId);
      return sendSuccess(res, journal, 'تم اعتماد اليومية وسنداتها بنجاح');
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

  static async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const journal = await JournalService.getJournalById(id);

      const rows = (journal.transactions || []).map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        voucherNo: tx.manualVoucherNumber || tx.systemReference || '-',
        voucherBookNumber: tx.voucherBookNumber || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : '',
        beneficiary: tx.beneficiary?.name || '-',
        category: tx.category?.name || '-',
        project: tx.project?.projectName || 'غير مربوط',
        paymentMethod: formatPaymentMethod(tx.paymentMethod),
        paymentReference: tx.paymentReference || '-',
        invoiceNumber: tx.invoiceNumber || '-',
        invoiceStatus: tx.invoiceStatus || '-',
        details: tx.description || '-',
        notes: tx.notes || '-',
        amount: Number(tx.amount) || 0,
      }));

      const dateStr = journal.journalDate ? new Date(journal.journalDate).toISOString().slice(0, 10) : '';

      await ExportService.generateExcel(
        {
          title: `يومية المصروفات - ${journal.journalNumber}`,
          journalNumber: journal.journalNumber,
          cashboxName: journal.cashbox?.name,
          reportDate: dateStr,
          rows,
          totalAmount: journal.totalAmount,
        },
        res,
        `Journal_${journal.journalNumber}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportPDF(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const journal = await JournalService.getJournalById(id);

      const rows = (journal.transactions || []).map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        voucherNo: tx.manualVoucherNumber || tx.systemReference || '-',
        voucherBookNumber: tx.voucherBookNumber || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : '',
        beneficiary: tx.beneficiary?.name || '-',
        category: tx.category?.name || '-',
        project: tx.project?.projectName || 'غير مربوط',
        paymentMethod: formatPaymentMethod(tx.paymentMethod),
        paymentReference: tx.paymentReference || '-',
        invoiceNumber: tx.invoiceNumber || '-',
        invoiceStatus: tx.invoiceStatus || '-',
        details: tx.description || '-',
        notes: tx.notes || '-',
        amount: Number(tx.amount) || 0,
      }));

      const dateStr = journal.journalDate ? new Date(journal.journalDate).toLocaleDateString('ar-SA') : '';

      await ExportService.generatePDF(
        {
          title: `يومية المصروفات اليومية (${journal.journalNumber})`,
          journalNumber: journal.journalNumber,
          cashboxName: journal.cashbox?.name,
          reportDate: dateStr,
          rows,
          totalAmount: journal.totalAmount,
        },
        res,
        `Journal_${journal.journalNumber}`
      );
    } catch (error) {
      next(error);
    }
  }
}
