import { prisma } from '../utils/prisma';
import { SYSTEM_SETTINGS_KEYS, ProjectRequirementMode } from '@expense-system/shared';
import { AppError } from '../middleware/error.middleware';

export class SystemSettingService {
  static async getSettingByKey(key: string) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting;
  }

  static async getAllSettings() {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return settings;
  }

  static async getProjectRequirementMode(): Promise<ProjectRequirementMode> {
    const setting = await this.getSettingByKey(SYSTEM_SETTINGS_KEYS.PROJECT_REQUIREMENT_MODE);
    if (!setting) {
      return ProjectRequirementMode.OPTIONAL;
    }
    return setting.value as ProjectRequirementMode;
  }

  static async updateSetting(key: string, value: string, userId: number, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) {
      throw new AppError('الإعداد غير موجود في النظام', 404, 'NOT_FOUND');
    }

    const oldValues = { key: existing.key, value: existing.value };

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.systemSetting.update({
        where: { key },
        data: { value },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'SYSTEM_SETTING',
          entityId: item.id,
          action: 'UPDATE_SETTING',
          oldValues,
          newValues: { key: item.key, value: item.value },
          reason: `تغيير قيمة الإعداد ${key} إلى ${value}`,
          ipAddress,
          userAgent,
        },
      });

      return item;
    });

    return updated;
  }
}
