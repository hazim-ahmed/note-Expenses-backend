import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service';
import { sendSuccess } from '../utils/response';

export class BackupController {
  /**
   * Trigger manual instant database backup
   */
  static async createBackup(_req: Request, res: Response, next: NextFunction) {
    try {
      const backup = await BackupService.createDatabaseBackup();
      return sendSuccess(
        res,
        {
          fileName: backup.fileName,
          fileSizeKb: (backup.fileSize / 1024).toFixed(2),
          createdAt: backup.createdAt,
        },
        'تم إنشاء النسخة الاحتياطية لقاعدة البيانات بنجاح'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * List available database backups
   */
  static async listBackups(_req: Request, res: Response, next: NextFunction) {
    try {
      const backups = await BackupService.listBackups();
      const formatted = backups.map((b) => ({
        fileName: b.fileName,
        fileSizeKb: (b.fileSize / 1024).toFixed(2),
        createdAt: b.createdAt,
      }));
      return sendSuccess(res, formatted, 'تم جلب قائمة النسخ الاحتياطية بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
