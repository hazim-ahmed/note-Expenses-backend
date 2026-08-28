import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: Date;
}

export class BackupService {
  private static backupDir = path.resolve(process.cwd(), 'backups');
  private static retentionLimit = 15; // Keep last 15 backups

  private static ensureBackupDirectoryExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a full JSON snapshot backup of core master data and financial tables
   */
  static async createDatabaseBackup(): Promise<BackupFileInfo> {
    this.ensureBackupDirectoryExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_expense_db_${timestamp}.json`;
    const filePath = path.join(this.backupDir, fileName);

    logger.info(`📦 [Backup Engine] Starting automated database snapshot...`);

    try {
      // Export all key tables using Prisma
      const [
        users,
        roles,
        permissions,
        cashboxes,
        categories,
        paymentMethods,
        beneficiaries,
        projects,
        projectUnits,
        journals,
        transactions,
        systemSettings,
      ] = await Promise.all([
        prisma.user.findMany(),
        prisma.role.findMany(),
        prisma.permission.findMany(),
        prisma.cashbox.findMany(),
        prisma.expenseCategory.findMany(),
        prisma.paymentMethod.findMany(),
        prisma.beneficiary.findMany(),
        prisma.project.findMany(),
        prisma.projectUnit.findMany(),
        prisma.expenseJournal.findMany(),
        prisma.expenseTransaction.findMany({ where: { deletedAt: null } }),
        prisma.systemSetting.findMany(),
      ]);

      const backupData = {
        metadata: {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          system: 'Expense Management System',
          recordCounts: {
            users: users.length,
            cashboxes: cashboxes.length,
            categories: categories.length,
            beneficiaries: beneficiaries.length,
            projects: projects.length,
            journals: journals.length,
            transactions: transactions.length,
          },
        },
        data: {
          users,
          roles,
          permissions,
          cashboxes,
          categories,
          paymentMethods,
          beneficiaries,
          projects,
          projectUnits,
          journals,
          transactions,
          systemSettings,
        },
      };

      // Stringify with BigInt support
      const jsonContent = JSON.stringify(
        backupData,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      );

      fs.writeFileSync(filePath, jsonContent, 'utf8');
      const stats = fs.statSync(filePath);

      logger.info(`✅ [Backup Engine] Backup completed successfully: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);

      // Clean up old backups exceeding retention limit
      this.cleanupOldBackups();

      return {
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(`❌ [Backup Engine Error] Failed to generate backup:`, error);
      throw error;
    }
  }

  /**
   * List all stored backup files
   */
  static async listBackups(): Promise<BackupFileInfo[]> {
    this.ensureBackupDirectoryExists();

    const files = fs.readdirSync(this.backupDir);
    const backups: BackupFileInfo[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        backups.push({
          fileName: file,
          filePath,
          fileSize: stats.size,
          createdAt: stats.birthtime,
        });
      }
    }

    // Sort by creation date descending
    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Purge old backup files exceeding retention limit
   */
  private static cleanupOldBackups() {
    try {
      const backups = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const fp = path.join(this.backupDir, f);
          return { name: f, path: fp, time: fs.statSync(fp).birthtime.getTime() };
        })
        .sort((a, b) => b.time - a.time);

      if (backups.length > this.retentionLimit) {
        const toDelete = backups.slice(this.retentionLimit);
        for (const item of toDelete) {
          fs.unlinkSync(item.path);
          logger.info(`🧹 [Backup Engine] Cleaned up old backup: ${item.name}`);
        }
      }
    } catch (err) {
      logger.error(`❌ [Backup Engine Cleanup Error]:`, err);
    }
  }

  /**
   * Schedule automatic daily backup cron/interval
   */
  static initializeScheduledBackup() {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      this.createDatabaseBackup().catch((err) => {
        logger.error(`❌ Scheduled backup failed:`, err);
      });
    }, TWENTY_FOUR_HOURS);

    logger.info(`⏰ [Backup Engine] Automated daily backup timer initialized.`);
  }
}
