import { Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
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

export class ReportController {
  // 1. Daily Expenses Report
  static async getDailyExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const data = await ReportService.getDailyExpensesReport(date);
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات اليومية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async exportDailyExpensesExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const data = await ReportService.getDailyExpensesReport(date);

      const rows = (data.transactions || []).map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        voucherNo: tx.manualVoucherNumber || tx.systemReference || '-',
        voucherBookNumber: tx.voucherBookNumber || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : data.date,
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

      await ExportService.generateExcel(
        {
          title: `تقرير المصروفات اليومية - ${data.date}`,
          reportDate: data.date,
          rows,
          totalAmount: data.totalAmount,
        },
        res,
        `Daily_Expenses_${data.date}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportDailyExpensesPDF(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const data = await ReportService.getDailyExpensesReport(date);

      const rows = (data.transactions || []).map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        voucherNo: tx.manualVoucherNumber || tx.systemReference || '-',
        voucherBookNumber: tx.voucherBookNumber || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : data.date,
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

      await ExportService.generatePDF(
        {
          title: `جدول المصروفات اليومية`,
          reportDate: data.date,
          rows,
          totalAmount: data.totalAmount,
        },
        res,
        `Daily_Expenses_${data.date}`
      );
    } catch (error) {
      next(error);
    }
  }

  // 2. Expenses By Project Report
  static async getExpensesByProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      const data = await ReportService.getExpensesByProject(projectId);
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async exportExpensesByProjectExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      const data = await ReportService.getExpensesByProject(projectId);
      const totalAmount = data.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
      const totalCount = data.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

      const rows = data.map((item: any, idx: number) => ({
        index: idx + 1,
        projectName: item.projectName || 'غير مربوط بمشروع',
        count: item.count || 0,
        totalAmount: Number(item.totalAmount) || 0,
      }));

      await ExportService.generateGenericExcel(
        {
          title: 'تقرير المصروفات حسب المشروع',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'اسم المشروع', key: 'projectName', width: 35, align: 'right' },
            { header: 'عدد العمليات', key: 'count', width: 16 },
            { header: 'إجمالي المصروفات (ر.س)', key: 'totalAmount', width: 22, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'الإجمالي العام',
            spanCount: 2,
            values: { count: totalCount, totalAmount },
          },
        },
        res,
        'Expenses_By_Project'
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportExpensesByProjectPDF(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      const data = await ReportService.getExpensesByProject(projectId);
      const totalAmount = data.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
      const totalCount = data.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

      const rows = data.map((item: any, idx: number) => ({
        index: idx + 1,
        projectName: item.projectName || 'غير مربوط بمشروع',
        count: item.count || 0,
        totalAmount: Number(item.totalAmount) || 0,
      }));

      await ExportService.generateGenericPDF(
        {
          title: 'تقرير المصروفات حسب المشروع',
          subtitle: 'ملخص وتفاصيل التكاليف المنصرفة لكل مشروع مقاولات/عقارات',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'اسم المشروع', key: 'projectName', width: 35, align: 'right' },
            { header: 'عدد العمليات', key: 'count', width: 16 },
            { header: 'إجمالي المصروفات (ر.س)', key: 'totalAmount', width: 22, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'الإجمالي العام',
            spanCount: 2,
            values: { count: totalCount, totalAmount },
          },
        },
        res,
        'Expenses_By_Project'
      );
    } catch (error) {
      next(error);
    }
  }

  // 3. Manual Vouchers Report
  static async getManualVouchers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getManualVouchersReport();
      return sendSuccess(res, data, 'تم جلب تقرير السندات اليدوية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async exportManualVouchersExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getManualVouchersReport();
      const totalAmount = data.reduce((sum: number, v: any) => sum + (Number(v.amount) || 0), 0);

      const rows = data.map((v: any, idx: number) => ({
        index: idx + 1,
        manualVoucherNumber: v.manualVoucherNumber || '-',
        voucherBookNumber: v.voucherBookNumber || 'بدون دفتر',
        systemReference: v.systemReference || '-',
        date: v.voucherDate ? new Date(v.voucherDate).toISOString().slice(0, 10) : '-',
        beneficiary: v.beneficiary?.name || '-',
        project: v.project?.projectName || 'غير مربوط',
        amount: Number(v.amount) || 0,
      }));

      await ExportService.generateGenericExcel(
        {
          title: 'تقرير السندات اليدوية',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'رقم السند اليدوي', key: 'manualVoucherNumber', width: 18 },
            { header: 'دفتر السندات', key: 'voucherBookNumber', width: 16 },
            { header: 'الرقم الداخلي', key: 'systemReference', width: 18 },
            { header: 'التاريخ', key: 'date', width: 14 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'المشروع', key: 'project', width: 24, align: 'right' },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي السندات اليدوية',
            spanCount: 7,
            values: { amount: totalAmount },
          },
        },
        res,
        'Manual_Vouchers_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportManualVouchersPDF(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getManualVouchersReport();
      const totalAmount = data.reduce((sum: number, v: any) => sum + (Number(v.amount) || 0), 0);

      const rows = data.map((v: any, idx: number) => ({
        index: idx + 1,
        manualVoucherNumber: v.manualVoucherNumber || '-',
        voucherBookNumber: v.voucherBookNumber || 'بدون دفتر',
        systemReference: v.systemReference || '-',
        date: v.voucherDate ? new Date(v.voucherDate).toISOString().slice(0, 10) : '-',
        beneficiary: v.beneficiary?.name || '-',
        project: v.project?.projectName || 'غير مربوط',
        amount: Number(v.amount) || 0,
      }));

      await ExportService.generateGenericPDF(
        {
          title: 'تقرير السندات اليدوية',
          subtitle: 'حصر السندات الورقية اليدوية وأرقام دفاتر السندات',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'رقم السند اليدوي', key: 'manualVoucherNumber', width: 18 },
            { header: 'دفتر السندات', key: 'voucherBookNumber', width: 16 },
            { header: 'الرقم الداخلي', key: 'systemReference', width: 18 },
            { header: 'التاريخ', key: 'date', width: 14 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'المشروع', key: 'project', width: 24, align: 'right' },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي السندات اليدوية',
            spanCount: 7,
            values: { amount: totalAmount },
          },
        },
        res,
        'Manual_Vouchers_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  // 4. Pending Invoices Report
  static async getPendingInvoices(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getPendingInvoicesReport();
      return sendSuccess(res, data, 'تم جلب تقرير الفواتير المعلقة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async exportPendingInvoicesExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getPendingInvoicesReport();
      const totalAmount = data.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

      const rows = data.map((item: any, idx: number) => ({
        index: idx + 1,
        systemReference: item.systemReference || '-',
        beneficiary: item.beneficiary?.name || '-',
        description: item.description || '-',
        project: item.project?.projectName || 'غير مربوط',
        invoiceStatus: 'ستقدم لاحقاً',
        amount: Number(item.amount) || 0,
      }));

      await ExportService.generateGenericExcel(
        {
          title: 'تقرير الفواتير المعلقة',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'الرقم الداخلي', key: 'systemReference', width: 18 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'الوصف والبيان', key: 'description', width: 32, align: 'right' },
            { header: 'المشروع', key: 'project', width: 24, align: 'right' },
            { header: 'حالة الفاتورة', key: 'invoiceStatus', width: 16 },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي الفواتير المعلقة',
            spanCount: 6,
            values: { amount: totalAmount },
          },
        },
        res,
        'Pending_Invoices_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportPendingInvoicesPDF(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getPendingInvoicesReport();
      const totalAmount = data.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

      const rows = data.map((item: any, idx: number) => ({
        index: idx + 1,
        systemReference: item.systemReference || '-',
        beneficiary: item.beneficiary?.name || '-',
        description: item.description || '-',
        project: item.project?.projectName || 'غير مربوط',
        invoiceStatus: 'ستقدم لاحقاً',
        amount: Number(item.amount) || 0,
      }));

      await ExportService.generateGenericPDF(
        {
          title: 'تقرير الفواتير المعلقة',
          subtitle: 'سندات الصرف التي حدد فيها أن الفاتورة ستقدم لاحقاً',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'الرقم الداخلي', key: 'systemReference', width: 18 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'الوصف والبيان', key: 'description', width: 32, align: 'right' },
            { header: 'المشروع', key: 'project', width: 24, align: 'right' },
            { header: 'حالة الفاتورة', key: 'invoiceStatus', width: 16 },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي الفواتير المعلقة',
            spanCount: 6,
            values: { amount: totalAmount },
          },
        },
        res,
        'Pending_Invoices_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  // 5. Unassigned Project Transactions Report
  static async getUnassignedProjectTransactions(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getUnassignedProjectTransactions();
      return sendSuccess(res, data, 'تم جلب السندات غير المرتبطة بمشاريع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async exportUnassignedTransactionsExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getUnassignedProjectTransactions();
      const totalAmount = data.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

      const rows = data.map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : '-',
        beneficiary: tx.beneficiary?.name || '-',
        description: tx.description || '-',
        paymentMethod: tx.paymentMethod?.name || '-',
        amount: Number(tx.amount) || 0,
      }));

      await ExportService.generateGenericExcel(
        {
          title: 'تقرير السندات غير المرتبطة بمشاريع',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'الرقم المرجعي', key: 'systemReference', width: 18 },
            { header: 'التاريخ', key: 'date', width: 14 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'البيان', key: 'description', width: 34, align: 'right' },
            { header: 'طريقة الدفع', key: 'paymentMethod', width: 16 },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي السندات غير المربوطة',
            spanCount: 6,
            values: { amount: totalAmount },
          },
        },
        res,
        'Unassigned_Transactions_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportUnassignedTransactionsPDF(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getUnassignedProjectTransactions();
      const totalAmount = data.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

      const rows = data.map((tx: any, idx: number) => ({
        index: idx + 1,
        systemReference: tx.systemReference || '-',
        date: tx.voucherDate ? new Date(tx.voucherDate).toISOString().slice(0, 10) : '-',
        beneficiary: tx.beneficiary?.name || '-',
        description: tx.description || '-',
        paymentMethod: tx.paymentMethod?.name || '-',
        amount: Number(tx.amount) || 0,
      }));

      await ExportService.generateGenericPDF(
        {
          title: 'تقرير السندات غير المرتبطة بمشاريع',
          subtitle: 'حصر المصروفات المعلقة التي تتطلب تحديد مشروع ومراجعة محاسبية',
          columns: [
            { header: 'م', key: 'index', width: 8 },
            { header: 'الرقم المرجعي', key: 'systemReference', width: 18 },
            { header: 'التاريخ', key: 'date', width: 14 },
            { header: 'المستفيد', key: 'beneficiary', width: 28, align: 'right' },
            { header: 'البيان', key: 'description', width: 34, align: 'right' },
            { header: 'طريقة الدفع', key: 'paymentMethod', width: 16 },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 18, isNumeric: true },
          ],
          rows,
          totalRow: {
            label: 'إجمالي السندات غير المربوطة',
            spanCount: 6,
            values: { amount: totalAmount },
          },
        },
        res,
        'Unassigned_Transactions_Report'
      );
    } catch (error) {
      next(error);
    }
  }

  // 6. Beneficiary Expenses
  static async getExpensesByBeneficiary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getExpensesByBeneficiary();
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب المستفيد بنجاح');
    } catch (error) {
      next(error);
    }
  }

  // 7. Category Expenses
  static async getExpensesByCategory(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getExpensesByCategory();
      return sendSuccess(res, data, 'تم جلب تقرير المصروفات حسب التصنيف بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
