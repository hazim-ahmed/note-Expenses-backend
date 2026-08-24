import { Response, NextFunction } from 'express';
import { SystemSettingService } from '../services/systemSetting.service';
import { sendSuccess } from '../utils/response';
import { SystemSettingUpdateSchema, SYSTEM_SETTINGS_KEYS } from '../shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class SystemSettingController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await SystemSettingService.getAllSettings();
      return sendSuccess(res, settings, 'تم جلب إعدادات النظام بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateProjectRequirementMode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = SystemSettingUpdateSchema.parse(req.body);
      const userId = req.user!.id;
      const updated = await SystemSettingService.updateSetting(
        SYSTEM_SETTINGS_KEYS.PROJECT_REQUIREMENT_MODE,
        validated.value,
        userId,
        req.ip,
        req.get('user-agent')
      );

      return sendSuccess(res, updated, `تم تغيير وضع إلزامية المشروع إلى ${validated.value} بنجاح`);
    } catch (error) {
      next(error);
    }
  }
}
