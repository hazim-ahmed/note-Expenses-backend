import { PrismaClient } from '@prisma/client';

// Configure BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

export const prisma = new PrismaClient();
