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

  static async create(data: any) {
    const existing = await prisma.cashbox.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new AppError('كود الصندوق مستخدم بالفعل', 400, 'CASHBOX_CODE_EXISTS');
    }

    const item = await prisma.cashbox.create({
      data: {
        code: data.code,
        name: data.name,
        branchName: data.branchName,
        custodianUserId: data.custodianUserId ? BigInt(data.custodianUserId) : null,
        isActive: true,
      },
    });
    return item;
  }

  static async update(id: number, data: any) {
    const item = await prisma.cashbox.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        custodianUserId: data.custodianUserId ? BigInt(data.custodianUserId) : undefined,
      },
    });
    return item;
  }
}
