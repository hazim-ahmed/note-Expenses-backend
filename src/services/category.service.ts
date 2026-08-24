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

  static async create(data: any) {
    const existing = await prisma.expenseCategory.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new AppError('كود التصنيف مستخدم بالفعل', 400, 'CATEGORY_CODE_EXISTS');
    }

    const item = await prisma.expenseCategory.create({
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
    return item;
  }

  static async update(id: number, data: any) {
    const item = await prisma.expenseCategory.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        parentId: data.parentId ? BigInt(data.parentId) : undefined,
      },
    });
    return item;
  }
}
