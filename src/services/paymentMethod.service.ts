import { prisma } from '../utils/prisma';

export class PaymentMethodService {
  static async getAll() {
    const items = await prisma.paymentMethod.findMany({
      orderBy: { code: 'asc' },
    });
    return items;
  }
}
