import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

export class HealthController {
  /**
   * Deep diagnostic health check endpoint (/health/deep)
   */
  static async getDeepHealth(_req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    try {
      // 1. Check Database connection latency
      let dbStatus = 'DISCONNECTED';
      let dbLatencyMs = -1;

      try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
        dbStatus = 'HEALTHY';
      } catch (dbErr) {
        dbStatus = 'FAILED';
      }

      // 2. Memory & System metrics
      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = process.uptime();

      const metrics = {
        status: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(uptimeSeconds),
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memoryUsage: {
          rssMb: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
          heapTotalMb: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
          heapUsedMb: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
        },
      };

      if (dbStatus !== 'HEALTHY') {
        return sendError(res, 'فشل في الاتصال بقاعدة البيانات عند إجراء الفحص التشغيلي', 'HEALTH_CHECK_FAILED', 503, metrics);
      }

      return sendSuccess(res, metrics, 'الفحص التشغيلي الشمولي يعمل بكفاءة وتكامل تام');
    } catch (error) {
      next(error);
    }
  }
}
