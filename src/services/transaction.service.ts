import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';
import { JournalService } from './journal.service';
import { getRiyadhDate, getRiyadhDateString } from '../utils/date';
import { NotificationService } from './notification.service';

export class TransactionService {
  static async createTodayTransaction(data: any, userId: number, userRole: string) {
    // 1. Resolve or Auto-Create Today's Open Journal
    const todayJournal = await JournalService.getOrCreateTodayJournal(userId);

    // 1.1 Idempotency & De-duplication Check (Prevent duplicate submissions)
    if (data.idempotencyKey || data.manualVoucherNumber) {
      const idempotencySearch = data.idempotencyKey ? `[IDEM:${data.idempotencyKey}]` : null;
      const existing = await prisma.expenseTransaction.findFirst({
        where: {
          journalId: BigInt(todayJournal.id),
          createdBy: BigInt(userId),
          deletedAt: null,
          OR: [
            ...(data.manualVoucherNumber ? [{ manualVoucherNumber: data.manualVoucherNumber.trim() }] : []),
            ...(idempotencySearch ? [{ notes: { contains: idempotencySearch } }] : []),
          ],
        },
        include: {
          beneficiary: true,
          category: true,
          project: true,
          projectUnit: true,
          paymentMethod: true,
          creator: { select: { id: true, username: true, fullName: true } },
        },
      });

      if (existing) {
        return existing; // Return duplicate transaction safely
      }
    }

    // Check user cashbox permission if non-admin
    if (userRole !== 'ADMIN') {
      const userCashbox = await prisma.userCashbox.findUnique({
        where: {
          userId_cashboxId: {
            userId: BigInt(userId),
            cashboxId: BigInt(todayJournal.cashboxId),
          },
        },
      });
      if (userCashbox && (!userCashbox.isActive || !userCashbox.canCreateTransaction)) {
        throw new AppError('ليس لديك صلاحية لإدراج مصروفات في هذا الصندوق', 403, 'CASHBOX_ACCESS_DENIED');
      }
    }

    // 2. Check System Setting for Project Requirement
    const projectSetting = await prisma.systemSetting.findUnique({
      where: { key: 'expenses.project_requirement_mode' },
    });
    const projectMode = projectSetting?.value || 'OPTIONAL';

    if (projectMode === 'REQUIRED_ON_CREATE' && !data.projectId) {
      throw new AppError('ربط المصروف بمشروع إجباري حسب إعدادات النظام الحالية', 400, 'PROJECT_REQUIRED');
    }

    // 3. If Project is selected, verify project is active & user authorization
    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: BigInt(data.projectId) } });
      if (!project) throw new AppError('المشروع المحدد غير موجود', 404, 'PROJECT_NOT_FOUND');
      if (!project.isActive || project.status === 'SUSPENDED' || project.status === 'ARCHIVED') {
        throw new AppError(`المشروع (${project.projectName}) متوقف أو مؤرشف ولا يمكن إدراج مصروفات جديدة عليه`, 400, 'PROJECT_INACTIVE');
      }

      if (userRole !== 'ADMIN') {
        const userProjectsCount = await prisma.userProject.count({
          where: { userId: BigInt(userId), isActive: true },
        });
        if (userProjectsCount > 0) {
          const userProject = await prisma.userProject.findUnique({
            where: {
              userId_projectId: {
                userId: BigInt(userId),
                projectId: BigInt(data.projectId),
              },
            },
          });
          if (!userProject || !userProject.isActive) {
            throw new AppError('ليس لديك صلاحية لتسجيل مصروف على هذا المشروع المحدد', 403, 'PROJECT_ACCESS_DENIED');
          }
        }
      }
    }

    // 3.1 Validate Unit belongs to Project
    if (data.projectUnitId) {
      if (!data.projectId) {
        throw new AppError('يجب تحديد المشروع التابع له الوحدة العقارية', 400, 'PROJECT_REQUIRED_FOR_UNIT');
      }
      const unit = await prisma.projectUnit.findUnique({
        where: { id: BigInt(data.projectUnitId) },
      });
      if (!unit || unit.projectId !== BigInt(data.projectId)) {
        throw new AppError('الوحدة العقارية المحددة غير موجودة أو لا تتبع هذا المشروع', 400, 'UNIT_MISMATCH');
      }
    }

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

    const invoiceStatus = data.invoiceStatus || (data.invoiceNumber ? 'PROVIDED' : 'NOT_REQUIRED');
    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    const invoiceAmount = data.invoiceAmount !== undefined && data.invoiceAmount !== null ? data.invoiceAmount : null;
    const projectUnitId = data.projectUnitId ? BigInt(data.projectUnitId) : null;

    // 4. Create transaction attached to today's auto journal with concurrency-safe sequence retry
    let attempts = 0;
    let created: any = null;

    while (attempts < 5) {
      attempts++;
      try {
        const fiscalYear = new Date().getFullYear();
        const lastTx = await prisma.expenseTransaction.findFirst({
          where: { fiscalYear },
          orderBy: { id: 'desc' },
          select: { systemReference: true },
        });

        let nextSeqNum = 1;
        if (lastTx?.systemReference) {
          const match = lastTx.systemReference.match(/EXP-\d{4}-(\d+)/);
          if (match && match[1]) {
            nextSeqNum = parseInt(match[1], 10) + attempts;
          }
        }
        const nextSeq = nextSeqNum.toString().padStart(6, '0');
        const systemReference = `EXP-${fiscalYear}-${nextSeq}`;

        created = await prisma.$transaction(async (tx) => {
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
              projectUnitId,
              paymentMethodId: paymentMethod.id,
              amount: data.amount,
              description: data.description,
              invoiceStatus,
              invoiceNumber: data.invoiceNumber || null,
              invoiceDate,
              invoiceAmount,
              paymentReference: data.paymentReference?.trim() || null,
              fiscalYear,
              status: 'SUBMITTED',
              submittedBy: BigInt(userId),
              submittedAt: new Date(),
              notes: data.idempotencyKey 
                ? `${data.notes || ''} [IDEM:${data.idempotencyKey}]`.trim() 
                : (data.notes || null),
              createdBy: BigInt(userId),
            },
            include: {
              beneficiary: true,
              category: true,
              project: true,
              projectUnit: true,
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

        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempts < 5) {
          continue;
        }
        throw err;
      }
    }

    return {
      ...created,
      id: Number(created.id),
      journalId: Number(created.journalId),
      beneficiaryId: Number(created.beneficiaryId),
      categoryId: Number(created.categoryId),
      projectId: created.projectId ? Number(created.projectId) : null,
      projectUnitId: created.projectUnitId ? Number(created.projectUnitId) : null,
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

    const effectiveProjectId = data.projectId !== undefined ? (data.projectId ? BigInt(data.projectId) : null) : existing.projectId;
    const effectiveUnitId = data.projectUnitId !== undefined ? (data.projectUnitId ? BigInt(data.projectUnitId) : null) : existing.projectUnitId;

    if (effectiveProjectId) {
      const project = await prisma.project.findUnique({ where: { id: effectiveProjectId } });
      if (!project || !project.isActive) {
        throw new AppError('المشروع المحدد متوقف أو غير موجود', 400, 'PROJECT_INACTIVE');
      }
    }

    if (effectiveUnitId) {
      if (!effectiveProjectId) {
        throw new AppError('يجب تحديد المشروع التابع له الوحدة العقارية', 400, 'PROJECT_REQUIRED_FOR_UNIT');
      }
      const unit = await prisma.projectUnit.findUnique({ where: { id: effectiveUnitId } });
      if (!unit || unit.projectId !== effectiveProjectId) {
        throw new AppError('الوحدة العقارية المحددة غير موجودة أو لا تتبع هذا المشروع', 400, 'UNIT_MISMATCH');
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
          projectId: effectiveProjectId,
          projectUnitId: effectiveUnitId,
          amount: data.amount !== undefined ? data.amount : existing.amount,
          description: data.description !== undefined ? data.description : existing.description,
          invoiceStatus: data.invoiceStatus !== undefined ? data.invoiceStatus : existing.invoiceStatus,
          invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber : existing.invoiceNumber,
          invoiceDate: data.invoiceDate !== undefined ? (data.invoiceDate ? new Date(data.invoiceDate) : null) : existing.invoiceDate,
          invoiceAmount: data.invoiceAmount !== undefined ? data.invoiceAmount : existing.invoiceAmount,
          paymentMethodId: data.paymentMethodId ? BigInt(data.paymentMethodId) : existing.paymentMethodId,
          paymentReference: data.paymentReference !== undefined ? (data.paymentReference?.trim() || null) : existing.paymentReference,
          notes: data.notes !== undefined ? data.notes : existing.notes,
        },
        include: {
          beneficiary: true,
          category: true,
          project: true,
          projectUnit: true,
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

  static async approveTransaction(id: number, userId: number, userRole: string, comments?: string) {
    const existing = await prisma.expenseTransaction.findUnique({
      where: { id: BigInt(id) },
      include: { journal: true },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError('عملية المصروف غير موجودة', 404, 'NOT_FOUND');
    }

    if (existing.journal.status === 'CLOSED' && userRole !== 'ADMIN') {
      throw new AppError('لا يمكن اعتماد العملية لأن اليومية التابعة لها مغلقة', 400, 'JOURNAL_CLOSED');
    }

    if (existing.status === 'APPROVED') {
      throw new AppError('سند الصرف معتمد بالفعل', 400, 'ALREADY_APPROVED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.expenseTransaction.update({
        where: { id: BigInt(id) },
        data: {
          status: 'APPROVED',
          approvedBy: BigInt(userId),
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.expenseApproval.create({
        data: {
          transactionId: BigInt(id),
          approvalLevel: 'LEVEL_1',
          action: 'APPROVED',
          actionBy: BigInt(userId),
          comments: comments || 'تم اعتماد سند الصرف',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_TRANSACTION',
          entityId: BigInt(id),
          action: 'APPROVE_TRANSACTION',
          reason: comments || 'اعتماد سند الصرف',
        },
      });

      return res;
    });

    NotificationService.notifyTransactionApproved({
      transactionId: id,
      systemReference: existing.systemReference,
      amount: existing.amount.toString(),
      approvedByUserId: userId,
      createdByUserId: existing.createdBy,
    });

    return {
      id: Number(updated.id),
      status: updated.status,
      approvedAt: updated.approvedAt,
    };
  }

  static async rejectTransaction(id: number, userId: number, userRole: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new AppError('سبب الرفض مطلوب', 400, 'REASON_REQUIRED');
    }

    const existing = await prisma.expenseTransaction.findUnique({
      where: { id: BigInt(id) },
      include: { journal: true },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError('عملية المصروف غير موجودة', 404, 'NOT_FOUND');
    }

    if (existing.journal.status === 'CLOSED' && userRole !== 'ADMIN') {
      throw new AppError('لا يمكن رفض العملية لأن اليومية التابعة لها مغلقة', 400, 'JOURNAL_CLOSED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.expenseTransaction.update({
        where: { id: BigInt(id) },
        data: {
          status: 'REJECTED',
          rejectionReason: reason.trim(),
        },
      });

      await tx.expenseApproval.create({
        data: {
          transactionId: BigInt(id),
          approvalLevel: 'LEVEL_1',
          action: 'REJECTED',
          actionBy: BigInt(userId),
          comments: reason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'EXPENSE_TRANSACTION',
          entityId: BigInt(id),
          action: 'REJECT_TRANSACTION',
          reason: `رفض سند الصرف: ${reason.trim()}`,
        },
      });

      return res;
    });

    NotificationService.notifyTransactionRejected({
      transactionId: id,
      systemReference: existing.systemReference,
      amount: existing.amount.toString(),
      reason: reason.trim(),
      rejectedByUserId: userId,
      createdByUserId: existing.createdBy,
    });

    return {
      id: Number(updated.id),
      status: updated.status,
      rejectionReason: updated.rejectionReason,
    };
  }
}
