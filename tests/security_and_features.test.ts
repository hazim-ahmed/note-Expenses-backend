import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { BackupService } from '../src/services/backup.service';
import { TokenBlacklistService } from '../src/services/tokenBlacklist.service';

describe('Stage 6: Security, Notification & Backup Test Suite', () => {
  let adminToken = '';

  it('1. Login Admin to obtain Token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminToken = res.body.data.tokens.accessToken;
  });

  it('2. Token Revocation Engine Test', () => {
    const testToken = 'sample.revoked.jwt.token';
    expect(TokenBlacklistService.isBlacklisted(testToken)).toBe(false);

    TokenBlacklistService.revokeToken(testToken);
    expect(TokenBlacklistService.isBlacklisted(testToken)).toBe(true);
  });

  it('3. Database Backup Service Test (Direct Service Invocation)', async () => {
    const backup = await BackupService.createDatabaseBackup();

    expect(backup.fileName).toBeDefined();
    expect(backup.fileName).toContain('backup_expense_db_');
    expect(backup.fileSize).toBeGreaterThan(0);

    const backupsList = await BackupService.listBackups();
    expect(backupsList.length).toBeGreaterThan(0);
  });

  it('4. Admin Backup Endpoints Test (POST & GET /api/v1/system/backups)', async () => {
    const postRes = await request(app)
      .post('/api/v1/system/backups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.data.fileName).toBeDefined();

    const getRes = await request(app)
      .get('/api/v1/system/backups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(Array.isArray(getRes.body.data)).toBe(true);
  });

  it('5. Reports Endpoints Structural Test', async () => {
    const dailyRep = await request(app)
      .get('/api/v1/reports/daily-expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    const projectRep = await request(app)
      .get('/api/v1/reports/by-project')
      .set('Authorization', `Bearer ${adminToken}`);

    const unassignedRep = await request(app)
      .get('/api/v1/reports/unassigned-project-transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dailyRep.status).toBe(200);
    expect(projectRep.status).toBe(200);
    expect(unassignedRep.status).toBe(200);
  });
});
