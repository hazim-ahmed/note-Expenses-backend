import { prisma } from '../utils/prisma';
import { getRiyadhDate, getRiyadhDateString } from '../utils/date';

export class ReportService {
  static async getDailyExpensesReport(dateStr?: string) {
    const targetDateStr = dateStr || getRiyadhDateString();
    const [year, month, day] = targetDateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const transactions = await prisma.expenseTransaction.findMany({
      where: {
        deletedAt: null,
        voucherDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        journal: { select: { journalNumber: true, cashbox: true } },
        beneficiary: true,
        category: true,
        project: true,
        paymentMethod: true,
      },
      orderBy: { id: 'desc' },
    });

    const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const approvedAmount = transactions
      .filter((tx) => tx.status === 'APPROVED' || tx.status === 'POSTED')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      date: targetDateStr,
      totalCount: transactions.length,
      totalAmount,
      approvedAmount,
      transactions,
    };
  }

  static async getExpensesByProject(projectId?: number) {
    const where: any = { deletedAt: null };
    if (projectId) where.projectId = BigInt(projectId);

    const transactions = await prisma.expenseTransaction.findMany({
      where,
      include: {
        project: true,
        category: true,
        beneficiary: true,
      },
    });

    const projectSummary: Record<string, { projectId: number; projectName: string; totalAmount: number; count: number }> = {};

    for (const tx of transactions) {
      const pId = tx.projectId ? Number(tx.projectId) : 0;
      const pName = tx.project ? tx.project.projectName : 'غير مربوط بمشروع';
      const key = `${pId}`;

      if (!projectSummary[key]) {
        projectSummary[key] = { projectId: pId, projectName: pName, totalAmount: 0, count: 0 };
      }
      projectSummary[key].totalAmount += Number(tx.amount);
      projectSummary[key].count += 1;
    }

    return Object.values(projectSummary);
  }

  static async getExpensesByBeneficiary() {
    const transactions = await prisma.expenseTransaction.findMany({
      where: { deletedAt: null },
      include: { beneficiary: true },
    });

    const summary: Record<string, { beneficiaryId: number; name: string; totalAmount: number; count: number }> = {};
    for (const tx of transactions) {
      const bId = Number(tx.beneficiaryId);
      const bName = tx.beneficiary.name;
      if (!summary[bId]) {
        summary[bId] = { beneficiaryId: bId, name: bName, totalAmount: 0, count: 0 };
      }
      summary[bId].totalAmount += Number(tx.amount);
      summary[bId].count += 1;
    }

    return Object.values(summary);
  }

  static async getExpensesByCategory() {
    const transactions = await prisma.expenseTransaction.findMany({
      where: { deletedAt: null },
      include: { category: true },
    });

    const summary: Record<string, { categoryId: number; name: string; totalAmount: number; count: number }> = {};
    for (const tx of transactions) {
      const cId = Number(tx.categoryId);
      const cName = tx.category.name;
      if (!summary[cId]) {
        summary[cId] = { categoryId: cId, name: cName, totalAmount: 0, count: 0 };
      }
      summary[cId].totalAmount += Number(tx.amount);
      summary[cId].count += 1;
    }

    return Object.values(summary);
  }

  static async getUnassignedProjectTransactions() {
    const transactions = await prisma.expenseTransaction.findMany({
      where: {
        deletedAt: null,
        projectId: null,
      },
      include: {
        journal: { include: { cashbox: true } },
        beneficiary: true,
        category: true,
        paymentMethod: true,
      },
      orderBy: { id: 'desc' },
    });

    return transactions;
  }

  static async getPendingInvoicesReport() {
    const transactions = await prisma.expenseTransaction.findMany({
      where: {
        deletedAt: null,
        invoiceStatus: 'PENDING',
      },
      include: {
        beneficiary: true,
        category: true,
        project: true,
        journal: true,
      },
      orderBy: { id: 'desc' },
    });

    return transactions;
  }

  static async getManualVouchersReport() {
    const transactions = await prisma.expenseTransaction.findMany({
      where: {
        deletedAt: null,
        voucherSource: 'MANUAL',
      },
      include: {
        journal: { include: { cashbox: true } },
        beneficiary: true,
        category: true,
        project: true,
      },
      orderBy: { id: 'desc' },
    });

    return transactions;
  }
}
