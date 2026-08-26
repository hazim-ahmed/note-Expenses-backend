import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class BeneficiaryService {
  static async getAll(search?: string) {
    const where: any = {};
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { commercialName: { contains: q } },
        { taxNumber: { contains: q } },
        { commercialRegistration: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const items = await prisma.beneficiary.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return items;
  }

  static async getById(id: number) {
    const item = await prisma.beneficiary.findUnique({ where: { id: BigInt(id) } });
    if (!item) {
      throw new AppError('المستفيد غير موجود', 404, 'BENEFICIARY_NOT_FOUND');
    }
    return item;
  }

  static async create(data: any, userId?: number) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new AppError('اسم المستفيد إجباري ولا يمكن أن يكون فارغاً', 400, 'BENEFICIARY_NAME_REQUIRED');
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.beneficiary.create({
        data: {
          beneficiaryType: data.beneficiaryType || 'PERSON',
          name: data.name.trim(),
          commercialName: data.commercialName ? data.commercialName.trim() : null,
          taxNumber: data.taxNumber ? data.taxNumber.trim() : null,
          commercialRegistration: data.commercialRegistration ? data.commercialRegistration.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          email: data.email ? data.email.trim() : null,
          iban: data.iban ? data.iban.trim() : null,
          bankName: data.bankName ? data.bankName.trim() : null,
          notes: data.notes ? data.notes.trim() : null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'BENEFICIARY',
            entityId: created.id,
            action: 'CREATE_BENEFICIARY',
            newValues: { name: created.name, beneficiaryType: created.beneficiaryType },
            reason: `إضافة مستفيد جديد: ${created.name}`,
          },
        });
      }

      return created;
    });

    return item;
  }

  static async update(id: number, data: any, userId?: number) {
    const existing = await prisma.beneficiary.findUnique({ where: { id: BigInt(id) } });
    if (!existing) {
      throw new AppError('المستفيد غير موجود', 404, 'BENEFICIARY_NOT_FOUND');
    }

    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
      throw new AppError('اسم المستفيد لا يمكن أن يكون فارغاً', 400, 'BENEFICIARY_NAME_REQUIRED');
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.beneficiary.update({
        where: { id: BigInt(id) },
        data: {
          ...data,
          name: data.name ? data.name.trim() : undefined,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId: BigInt(userId),
            entityType: 'BENEFICIARY',
            entityId: BigInt(id),
            action: 'UPDATE_BENEFICIARY',
            oldValues: { name: existing.name, isActive: existing.isActive },
            newValues: { name: updated.name, isActive: updated.isActive },
            reason: `تحديث بيانات المستفيد: ${updated.name}`,
          },
        });
      }

      return updated;
    });

    return item;
  }
}
