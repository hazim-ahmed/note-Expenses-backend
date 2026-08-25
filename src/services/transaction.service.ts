import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';
import { JournalService } from './journal.service';
import { getRiyadhDate, getRiyadhDateString } from '../utils/date';

export class TransactionService {
  static async createTodayTransaction(data: any, userId: number, userRole: string) {
    // 1. Resolve or Auto-Create Today's Open Journal
    const todayJournal = await JournalService.getOrCreateTodayJournal(userId);

    // 2. Check System Setting for Project Requirement
    const projectSetting = await prisma.systemSetting.findUnique({
      where: { key: 'expenses.project_requirement_mode' },
    });
    const projectMode = projectSetting?.value || 'OPTIONAL';

    if (projectMode === 'REQUIRED_ON_CREATE' && !data.projectId) {
      throw new AppError('ربط المصروف بمشروع إجباري حسب إعدادات النظام الحالية', 400, 'PROJECT_REQUIRED');
    }

    // 3. If Project is selected, verify project is active
    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: BigInt(data.projectId) } });
      if (!project) throw new AppError('المشروع المحدد غير موجود', 404, 'PROJECT_NOT_FOUND');
      if (!project.isActive || project.status === 'SUSPENDED' || project.status === 'ARCHIVED') {
        throw new AppError(`المشروع (${project.projectName}) متوقف أو مؤرشف ولا يمكن إدراج مصروفات جديدة عليه`, 400, 'PROJECT_INACTIVE');
      }
    }

    // 4. Generate system reference
    const fiscalYear = new Date().getFullYear();
    const count = await prisma.expenseTransaction.count();
    const nextSeq = (count + 1).toString().padStart(6, '0');
    const systemReference = `EXP-${fiscalYear}-${nextSeq}`;

    let paymentMethod;
    if (data.paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: BigInt(data.paymentMethodId) },
      });
      if (!paymentMethod || !paymentMethod.isActive) {
        throw new AppError('طريقة الدفع المحددة غير موجودة أو غير مفعلة', 400, 'PAYMENT_METHOD_INVALID');
      }
    } else {
      throw new AppError('يرجى تحديد طريقة دفع المصروف: كاش أو بنك', 400, 'PAYMENT_METHOD_REQUIRED');
    }

    if (paymentMethod.requiresReference && !data.paymentReference?.trim()) {
      throw new AppError('مرجع الدفع أو رقم التحويل مطلوب لطريقة الدفع المحددة', 400, 'PAYMENT_REFERENCE_REQUIRED');
    }

    const todayDate = getRiyadhDate();

    // Resolve or auto-create beneficiary by name or ID
    let resolvedBeneficiaryId: bigint;
    if (data.beneficiaryId) {
      resolvedBeneficiaryId = BigInt(data.beneficiaryId);
    } else if (data.beneficiaryName && data.beneficiaryName.trim()) {
      const bName = data.beneficiaryName.trim();
      let b = await prisma.beneficiary.findFirst({ where: { name: bName } });
      if (!b) {
        b = await prisma.beneficiary.create({
          data: { name: bName, beneficiaryType: 'COMPANY', isActive: true },
        });
      }
      resolvedBeneficiaryId = b.id;
    } else {
      throw new AppError('يرجى اختيار أو كتابة اسم المستفيد', 400, 'BENEFICIARY_REQUIRED');
    }

    // 5. Create transaction attached to today's auto journal
    const created = await prisma.$transaction(async (tx) => {
      const transaction = await tx.expenseTransaction.create({
        data: {
          journalId: BigInt(todayJournal.id),
          systemReference,
          voucherSource: 'MANUAL',
          manualVoucherNumber: data.manualVoucherNumber || null,
          voucherDate: todayDate,
          transactionType: data.invoiceNumber ? 'PURCHASE' : 'GENERAL_EXPENSE',
          beneficiaryId: resolvedBeneficiaryId,
          categoryId: BigInt(data.categoryId),
          projectId: data.projectId ? BigInt(data.projectId) : null,
          paymentMethodId: paymentMethod.id,
          amount: data.amount,
          description: data.description,
          invoiceNumber: data.invoiceNumber || null,
          paymentReference: data.paymentReference?.trim() || null,
          fiscalYear,
          status: 'APPROVED',
          notes: data.notes || null,
          createdBy: BigInt(userId),
        },
        include: {
          beneficiary: true,
          category: true,
          project: true,
          paymentMethod: true,
          creator: { select: { id: true, username: true, fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_TRANSACTION',
          entityId: transaction.id,
          action: 'CREATE_TRANSACTION',
          newValues: { systemReference, amount: data.amount, description: data.description },
          reason: 'تسجيل عملية مصروف جديدة في يومية اليوم التلقائية',
        },
      });

      return transaction;
    });

    return {
      ...created,
      id: Number(created.id),
      journalId: Number(created.journalId),
      beneficiaryId: Number(created.beneficiaryId),
      categoryId: Number(created.categoryId),
      projectId: created.projectId ? Number(created.projectId) : null,
      amount: Number(created.amount),
    };
  }

  static async updateTodayTransaction(id: number, data: any, userId: number, userRole: string) {
    const existing = await prisma.expenseTransaction.findUnique({
      where: { id: BigInt(id) },
      include: { journal: true },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError('عملية المصروف غير موجودة', 404, 'NOT_FOUND');
    }

    // Check if journal is OPEN or if User is ADMIN
    if (existing.journal.status === 'CLOSED' && userRole !== 'ADMIN') {
      throw new AppError('لا يمكنك تعديل العملية لأن يوميتها مغلقة. يتطلب ذلك إعادة فتح اليومية بواسطة مسؤول النظام (ADMIN)', 403, 'JOURNAL_CLOSED');
    }

    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: BigInt(data.projectId) } });
      if (!project || !project.isActive) {
        throw new AppError('المشروع المحدد متوقف أو غير موجود', 400, 'PROJECT_INACTIVE');
      }
    }

    let nextPaymentMethod = null;
    if (data.paymentMethodId) {
      nextPaymentMethod = await prisma.paymentMethod.findUnique({ where: { id: BigInt(data.paymentMethodId) } });
      if (!nextPaymentMethod || !nextPaymentMethod.isActive) {
        throw new AppError('طريقة الدفع المحددة غير موجودة أو غير مفعلة', 400, 'PAYMENT_METHOD_INVALID');
      }
    } else {
      nextPaymentMethod = await prisma.paymentMethod.findUnique({ where: { id: existing.paymentMethodId } });
    }

    const nextPaymentReference = data.paymentReference !== undefined
      ? data.paymentReference?.trim()
      : existing.paymentReference;

    if (nextPaymentMethod?.requiresReference && !nextPaymentReference) {
      throw new AppError('مرجع الدفع أو رقم التحويل مطلوب لطريقة الدفع المحددة', 400, 'PAYMENT_REFERENCE_REQUIRED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.expenseTransaction.update({
        where: { id: BigInt(id) },
        data: {
          manualVoucherNumber: data.manualVoucherNumber !== undefined ? data.manualVoucherNumber : existing.manualVoucherNumber,
          beneficiaryId: data.beneficiaryId ? BigInt(data.beneficiaryId) : existing.beneficiaryId,
          categoryId: data.categoryId ? BigInt(data.categoryId) : existing.categoryId,
          projectId: data.projectId !== undefined ? (data.projectId ? BigInt(data.projectId) : null) : existing.projectId,
          amount: data.amount !== undefined ? data.amount : existing.amount,
          description: data.description !== undefined ? data.description : existing.description,
          invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber : existing.invoiceNumber,
          paymentMethodId: data.paymentMethodId ? BigInt(data.paymentMethodId) : existing.paymentMethodId,
          paymentReference: data.paymentReference !== undefined ? (data.paymentReference?.trim() || null) : existing.paymentReference,
          notes: data.notes !== undefined ? data.notes : existing.notes,
        },
        include: {
          beneficiary: true,
          category: true,
          project: true,
          paymentMethod: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_TRANSACTION',
          entityId: BigInt(id),
          action: 'UPDATE_TRANSACTION',
          reason: 'تعديل بيانات عملية المصروف',
        },
      });

      return res;
    });

    return {
      ...updated,
      id: Number(updated.id),
      journalId: Number(updated.journalId),
      amount: Number(updated.amount),
    };
  }

  static async deleteTodayTransaction(id: number, userId: number, userRole: string) {
    const existing = await prisma.expenseTransaction.findUnique({
      where: { id: BigInt(id) },
      include: { journal: true },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError('العملية غير موجودة', 404, 'NOT_FOUND');
    }

    if (existing.journal.status === 'CLOSED' && userRole !== 'ADMIN') {
      throw new AppError('لا يمكنك حذف العملية لأن يوميتها مغلقة', 403, 'JOURNAL_CLOSED');
    }

    await prisma.$transaction(async (tx) => {
      await tx.expenseTransaction.update({
        where: { id: BigInt(id) },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_TRANSACTION',
          entityId: BigInt(id),
          action: 'DELETE_TRANSACTION',
          reason: 'إلغاء/حذف عملية المصروف',
        },
      });
    });

    return { success: true };
  }

  static async bulkAssignProject(transactionIds: number[], projectId: number, reason: string, userId: number) {
    // 1. التحقق من وجود المشروع وأنه نشط
    const project = await prisma.project.findUnique({ where: { id: BigInt(projectId) } });
    if (!project) {
      throw new AppError('المشروع المحدد غير موجود', 404, 'PROJECT_NOT_FOUND');
    }
    if (!project.isActive || project.status === 'SUSPENDED' || project.status === 'ARCHIVED') {
      throw new AppError(`المشروع (${project.projectName}) متوقف أو مؤرشف`, 400, 'PROJECT_INACTIVE');
    }

    if (!transactionIds || transactionIds.length === 0) {
      throw new AppError('يجب تحديد عملية واحدة على الأقل', 400, 'NO_TRANSACTIONS_SELECTED');
    }

    // 2. تحديث جماعي مع AuditLog لكل عملية
    await prisma.$transaction(async (tx) => {
      await tx.expenseTransaction.updateMany({
        where: {
          id: { in: transactionIds.map((id) => BigInt(id)) },
          deletedAt: null,
        },
        data: { projectId: BigInt(projectId) },
      });

      for (const txId of transactionIds) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'EXPENSE_TRANSACTION',
            entityId: BigInt(txId),
            action: 'ASSIGN_PROJECT',
            newValues: { projectId, projectName: project.projectName },
            reason: reason || `تم ربط السند بالمشروع: ${project.projectName}`,
          },
        });
      }
    });

    return {
      assigned: transactionIds.length,
      projectId,
      projectName: project.projectName,
    };
  }
}
