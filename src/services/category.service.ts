import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class CategoryService {
  static async getAll() {
    const items = await prisma.expenseCategory.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: { code: 'asc' },
    });
    return items;
  }

  static async create(data: any, userId?: number) {
    const existing = await prisma.expenseCategory.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new AppError('كود التصنيف مستخدم بالفعل', 400, 'CATEGORY_CODE_EXISTS');
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.expenseCategory.create({
        data: {
          code: data.code,
          name: data.name,
          parentId: data.parentId ? BigInt(data.parentId) : null,
          accountingAccountCode: data.accountingAccountCode,
          requiresProject: Boolean(data.requiresProject),
          requiresInvoice: Boolean(data.requiresInvoice),
          isActive: true,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'EXPENSE_CATEGORY',
            entityId: created.id,
            action: 'CREATE_CATEGORY',
            newValues: { code: created.code, name: created.name },
            reason: `إضافة تصنيف مصروف جديد: ${created.name} (${created.code})`,
          },
        });
      }

      return created;
    });

    return item;
  }

  static async update(id: number, data: any, userId?: number) {
    const existing = await prisma.expenseCategory.findUnique({ where: { id: BigInt(id) } });
    if (!existing) {
      throw new AppError('تصنيف المصروف غير موجود', 404, 'CATEGORY_NOT_FOUND');
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseCategory.update({
        where: { id: BigInt(id) },
        data: {
          ...data,
          parentId: data.parentId ? BigInt(data.parentId) : undefined,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'EXPENSE_CATEGORY',
            entityId: BigInt(id),
            action: 'UPDATE_CATEGORY',
            oldValues: { name: existing.name, code: existing.code },
            newValues: { name: updated.name, code: updated.code },
            reason: `تعديل بيانات تصنيف المصروف: ${updated.name}`,
          },
        });
      }

      return updated;
    });

    return item;
  }
}
