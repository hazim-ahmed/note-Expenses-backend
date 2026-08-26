import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';
import { getRiyadhDate, getRiyadhDateString } from '../utils/date';

export class JournalService {
  /**
   * Auto-closes any journal that is still OPEN with a date prior to today.
   */
  static async autoClosePastJournals() {
    const todayStr = getRiyadhDateString();
    const todayDate = getRiyadhDate();

    // Find all OPEN journals with date less than today
    const pastOpenJournals = await prisma.expenseJournal.findMany({
      where: {
        status: 'OPEN',
        journalDate: { lt: todayDate },
      },
    });

    for (const journal of pastOpenJournals) {
      await prisma.expenseJournal.update({
        where: { id: journal.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'EXPENSE_JOURNAL',
          entityId: journal.id,
          action: 'AUTO_CLOSE_JOURNAL',
          reason: `إغلاق تلقائي لليومية السابقة بتاريخ ${journal.journalNumber} عند حلول تاريخ جديد`,
        },
      });
    }
  }

  /**
   * Finds or automatically creates today's OPEN journal (Asia/Riyadh timezone).
   */
  static async getOrCreateTodayJournal(userId: number) {
    // 1. Auto-close past open journals first
    await this.autoClosePastJournals();

    const todayDate = getRiyadhDate();
    const todayStr = getRiyadhDateString();
    const cleanDateCode = todayStr.replace(/-/g, '');

    // Get main cashbox
    let cashbox = await prisma.cashbox.findFirst({ where: { isActive: true } });
    if (!cashbox) {
      cashbox = await prisma.cashbox.create({
        data: { code: 'CASH-001', name: 'الصندوق الرئيسي', isActive: true },
      });
    }

    const journalNumber = `JRN-${cleanDateCode}-${cashbox.code}`;

    // Find existing journal for today date & cashbox
    let journal = await prisma.expenseJournal.findFirst({
      where: {
        cashboxId: cashbox.id,
        journalDate: todayDate,
      },
      include: {
        transactions: {
          where: { deletedAt: null },
          include: {
            beneficiary: true,
            category: true,
            project: true,
            paymentMethod: true,
            creator: { select: { id: true, username: true, fullName: true } },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!journal) {
      journal = await prisma.expenseJournal.create({
        data: {
          journalNumber,
          journalDate: todayDate,
          cashboxId: cashbox.id,
          status: 'OPEN',
          preparedBy: BigInt(userId),
          notes: `يومية اليوم التلقائية بتاريخ ${todayStr}`,
        },
        include: {
          transactions: {
            where: { deletedAt: null },
            include: {
              beneficiary: true,
              category: true,
              project: true,
              paymentMethod: true,
              creator: { select: { id: true, username: true, fullName: true } },
            },
            orderBy: { id: 'desc' },
          },
        },
      });
    }

    const totalAmount = journal.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      ...journal,
      id: Number(journal.id),
      cashboxId: Number(journal.cashboxId),
      journalDateStr: todayStr,
      totalAmount,
      transactionsCount: journal.transactions.length,
      transactions: journal.transactions.map((tx) => ({
        ...tx,
        id: Number(tx.id),
        journalId: Number(tx.journalId),
        beneficiaryId: Number(tx.beneficiaryId),
        categoryId: Number(tx.categoryId),
        projectId: tx.projectId ? Number(tx.projectId) : null,
        amount: Number(tx.amount),
      })),
    };
  }

  static async getAllJournals() {
    await this.autoClosePastJournals();

    const journals = await prisma.expenseJournal.findMany({
      include: {
        cashbox: true,
        preparer: { select: { id: true, username: true, fullName: true } },
        _count: { select: { transactions: true } },
        transactions: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
      orderBy: { journalDate: 'desc' },
    });

    return journals.map((j) => {
      const totalAmount = j.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      return {
        ...j,
        id: Number(j.id),
        cashboxId: Number(j.cashboxId),
        totalAmount,
        transactionsCount: j._count.transactions,
      };
    });
  }

  static async getJournalById(id: number) {
    const journal = await prisma.expenseJournal.findUnique({
      where: { id: BigInt(id) },
      include: {
        cashbox: true,
        preparer: { select: { id: true, username: true, fullName: true } },
        transactions: {
          where: { deletedAt: null },
          include: {
            beneficiary: true,
            category: true,
            project: true,
            paymentMethod: true,
            creator: { select: { id: true, username: true, fullName: true } },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!journal) throw new AppError('اليومية غير موجودة', 404, 'JOURNAL_NOT_FOUND');

    const totalAmount = journal.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      ...journal,
      id: Number(journal.id),
      totalAmount,
      transactionsCount: journal.transactions.length,
      transactions: journal.transactions.map((tx) => ({
        ...tx,
        id: Number(tx.id),
        amount: Number(tx.amount),
      })),
    };
  }

  static async closeJournal(id: number, userId: number) {
    const journal = await prisma.expenseJournal.findUnique({ where: { id: BigInt(id) } });
    if (!journal) throw new AppError('اليومية غير موجودة', 404, 'NOT_FOUND');

    const updated = await prisma.expenseJournal.update({
      where: { id: BigInt(id) },
      data: {
        status: 'CLOSED',
        closedBy: BigInt(userId),
        closedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: BigInt(userId),
        entityType: 'EXPENSE_JOURNAL',
        entityId: BigInt(id),
        action: 'MANUAL_CLOSE_JOURNAL',
        reason: 'إغلاق اليومية يدوياً بواسطة مسؤول النظام',
      },
    });

    return { id: Number(updated.id), status: updated.status };
  }

  static async reopenJournal(id: number, userId: number) {
    const journal = await prisma.expenseJournal.findUnique({ where: { id: BigInt(id) } });
    if (!journal) throw new AppError('اليومية غير موجودة', 404, 'NOT_FOUND');

    const updated = await prisma.expenseJournal.update({
      where: { id: BigInt(id) },
      data: {
        status: 'OPEN',
        closedBy: null,
        closedAt: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: BigInt(userId),
        entityType: 'EXPENSE_JOURNAL',
        entityId: BigInt(id),
        action: 'REOPEN_JOURNAL',
        reason: 'إعادة فتح اليومية المغلقة بواسطة مسؤول النظام لتصحيح أو تعديل القيود',
      },
    });

    return { id: Number(updated.id), status: updated.status };
  }

  static async approveJournal(id: number, userId: number) {
    const journal = await prisma.expenseJournal.findUnique({ where: { id: BigInt(id) } });
    if (!journal) throw new AppError('اليومية غير موجودة', 404, 'NOT_FOUND');

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.expenseJournal.update({
        where: { id: BigInt(id) },
        data: {
          status: 'APPROVED',
          approvedBy: BigInt(userId),
          approvedAt: new Date(),
        },
      });

      // Auto-approve all unapproved transactions inside this journal
      await tx.expenseTransaction.updateMany({
        where: {
          journalId: BigInt(id),
          status: { in: ['DRAFT', 'PENDING_REVIEW'] },
          deletedAt: null,
        },
        data: {
          status: 'APPROVED',
          approvedBy: BigInt(userId),
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_JOURNAL',
          entityId: BigInt(id),
          action: 'APPROVE_JOURNAL',
          reason: 'اعتماد اليومية بالكامل وسنداتها بواسطة المحاسب/المسؤول',
        },
      });

      return res;
    });

    return { id: Number(updated.id), status: updated.status, approvedAt: updated.approvedAt };
  }
}
