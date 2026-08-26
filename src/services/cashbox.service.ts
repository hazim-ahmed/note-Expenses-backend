import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class CashboxService {
  static async getAll() {
    const items = await prisma.cashbox.findMany({
      include: { custodian: true },
      orderBy: { code: 'asc' },
    });
    return items;
  }

  static async create(data: any, userId?: number) {
    const existing = await prisma.cashbox.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new AppError('كود الصندوق مستخدم بالفعل', 400, 'CASHBOX_CODE_EXISTS');
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.cashbox.create({
        data: {
          code: data.code,
          name: data.name,
          branchName: data.branchName,
          custodianUserId: data.custodianUserId ? BigInt(data.custodianUserId) : null,
          isActive: true,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'CASHBOX',
            entityId: created.id,
            action: 'CREATE_CASHBOX',
            newValues: { code: created.code, name: created.name },
            reason: `إضافة صندوق جديد: ${created.name} (${created.code})`,
          },
        });
      }

      return created;
    });

    return item;
  }

  static async update(id: number, data: any, userId?: number) {
    const existing = await prisma.cashbox.findUnique({ where: { id: BigInt(id) } });
    if (!existing) {
      throw new AppError('الصندوق غير موجود', 404, 'CASHBOX_NOT_FOUND');
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.cashbox.update({
        where: { id: BigInt(id) },
        data: {
          ...data,
          custodianUserId: data.custodianUserId ? BigInt(data.custodianUserId) : undefined,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'CASHBOX',
            entityId: BigInt(id),
            action: 'UPDATE_CASHBOX',
            oldValues: { name: existing.name, code: existing.code },
            newValues: { name: updated.name, code: updated.code },
            reason: `تحديث بيانات الصندوق: ${updated.name}`,
          },
        });
      }

      return updated;
    });

    return item;
  }
}
