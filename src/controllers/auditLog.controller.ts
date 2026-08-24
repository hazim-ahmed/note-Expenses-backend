import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuditLogController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { entityType, action, userId, page = '1', limit = '50' } = req.query;

      const where: any = {};
      if (entityType) where.entityType = entityType as string;
      if (action) where.action = action as string;
      if (userId) where.userId = BigInt(userId as string);

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, username: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.auditLog.count({ where }),
      ]);

      const mapped = logs.map((log) => ({
        ...log,
        id: Number(log.id),
        userId: Number(log.userId),
        entityId: Number(log.entityId),
        user: log.user ? { ...log.user, id: Number(log.user.id) } : null,
      }));

      return sendSuccess(
        res,
        mapped,
        'تم جلب سجل التعديلات بنجاح',
        200,
        { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
      );
    } catch (error) {
      next(error);
    }
  }
}
