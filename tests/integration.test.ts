import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import app from '../src/app';

describe('Streamlined Daily Expenses System Integration Test Suite', () => {
  let adminToken = '';
  let createdTxId = 0;
  let testProjectId = 0;
  let todayJournalId = 0;

  it('1. Login with Admin', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminToken = res.body.data.tokens.accessToken;
  });

  it('2. GET /api/v1/today returns auto-resolved daily journal status', async () => {
    const res = await supertest(app)
      .get('/api/v1/today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.journalNumber).toMatch(/^JRN-\d{8}/);
    todayJournalId = res.body.data.journalId;
  });

  it('3. POST /api/v1/today/transactions adds transaction to today auto journal', async () => {
    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '101',
        beneficiaryId: 1,
        categoryId: 1,
        paymentMethodId: 1,
        amount: 250.00,
        description: 'شراء مواد اختبار عامة',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(250.00);
    createdTxId = res.body.data.id;
  });

  it('4. GET /api/v1/today/transactions returns today expenses list', async () => {
    const res = await supertest(app)
      .get('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('5. PATCH /api/v1/today/transactions/:id updates transaction', async () => {
    const res = await supertest(app)
      .patch(`/api/v1/today/transactions/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 300.00,
        description: 'شراء مواد اختبار معدلة',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(300.00);
  });

  it('6. Create project and check project validation', async () => {
    const projectCode = `PRJ-${Date.now()}`;
    const res = await supertest(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectCode,
        projectName: 'مشروع مجمع النخلة',
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.projectCode).toBe(projectCode);
    testProjectId = res.body.data.id;
  });

  it('7. Deactivate project and prevent selecting it for new transaction', async () => {
    await supertest(app)
      .patch(`/api/v1/projects/${testProjectId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED', isActive: false });

    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '102',
        beneficiaryId: 1,
        categoryId: 1,
        projectId: testProjectId,
        paymentMethodId: 1,
        amount: 150.00,
        description: 'اختبار مشروع متوقف',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('8. POST /api/v1/expense-transactions/:id/reject rejects transaction', async () => {
    const res = await supertest(app)
      .post(`/api/v1/expense-transactions/${createdTxId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'بيانات الفاتورة غير مطابقة' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('9. POST /api/v1/expense-transactions/:id/approve approves transaction', async () => {
    const res = await supertest(app)
      .post(`/api/v1/expense-transactions/${createdTxId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comments: 'تمت المراجعة والتصحيح والاعتماد' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('10. POST /api/v1/journals/:id/approve approves the journal', async () => {
    const res = await supertest(app)
      .post(`/api/v1/journals/${todayJournalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('11. RBAC: Deny request when missing Authorization header', async () => {
    const res = await supertest(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('12. DELETE /api/v1/today/transactions/:id deletes transaction', async () => {
    const res = await supertest(app)
      .delete(`/api/v1/today/transactions/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('13. Relational validation: Fail when unit does not belong to the specified project', async () => {
    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '109',
        beneficiaryId: 1,
        categoryId: 1,
        projectId: 1, // Project 112
        projectUnitId: 1, // Unit belonging to Project 113
        paymentMethodId: 1,
        amount: 500.00,
        description: 'اختبار ربط وحدة بمشروع خاطئ',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('14. Full invoice and project unit fields persistence in today transaction', async () => {
    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '110',
        beneficiaryId: 1,
        categoryId: 1,
        projectId: 2, // Project 113
        projectUnitId: 1, // Unit 27 in Project 113
        paymentMethodId: 1,
        amount: 750.00,
        description: 'شراء مواد مع فاتورة كاملة',
        invoiceStatus: 'PROVIDED',
        invoiceNumber: 'INV-2026-99',
        invoiceDate: '2026-08-26',
        invoiceAmount: 750.00,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projectUnitId).toBe(1);
    expect(res.body.data.invoiceNumber).toBe('INV-2026-99');
    expect(res.body.data.invoiceStatus).toBe('PROVIDED');
  });

  it('15. Zod Validation: Reject invalid master data input for Beneficiary', async () => {
    const res = await supertest(app)
      .post('/api/v1/beneficiaries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'A', // Less than 2 chars
        email: 'not-a-valid-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('16. Daily report query uses aligned timezone date format', async () => {
    const res = await supertest(app)
      .get('/api/v1/reports/daily-expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof res.body.data.totalAmount).toBe('number');
  });

  it('17. Attachments API: Upload, List, and Delete transaction attachment', async () => {
    // 1. Upload
    const uploadRes = await supertest(app)
      .post('/api/v1/expense-transactions/1/attachments')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('%PDF-1.4 test invoice pdf content'), 'invoice.pdf');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.originalFileName).toBe('invoice.pdf');
    const attachmentId = uploadRes.body.data.id;

    // 2. List
    const listRes = await supertest(app)
      .get('/api/v1/expense-transactions/1/attachments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((a: any) => a.id === attachmentId)).toBe(true);

    // 2.1 Download attachment
    const downloadRes = await supertest(app)
      .get(`/api/v1/expense-transactions/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-disposition']).toContain('attachment');

    // 3. Delete
    const deleteRes = await supertest(app)
      .delete(`/api/v1/expense-transactions/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('18. Master Data Audit Logging: Beneficiary creation logs audit action', async () => {
    const uniqueName = `مؤسسة الأفق ${Date.now()}`;
    const res = await supertest(app)
      .post('/api/v1/beneficiaries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueName,
        beneficiaryType: 'COMPANY',
        isActive: true,
      });

    expect(res.status).toBe(201);

    const auditRes = await supertest(app)
      .get('/api/v1/audit-logs?entityType=BENEFICIARY')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.data)).toBe(true);
    expect(auditRes.body.data.some((log: any) => log.action === 'CREATE_BENEFICIARY')).toBe(true);
  });

  it('19. Route Order Check: PATCH /api/v1/expense-transactions/bulk-assign-project executes correctly', async () => {
    const res = await supertest(app)
      .patch('/api/v1/expense-transactions/bulk-assign-project')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionIds: [1],
        projectId: 2,
        reason: 'إعادة ربط المشروع لاختبار المسار الجماعي',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('20. Security: Reject removing ADMIN role from the only active ADMIN user', async () => {
    const cashierRole = 2; // CASHIER role ID
    const res = await supertest(app)
      .patch('/api/v1/users/1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roleIds: [cashierRole], // Trying to remove ADMIN role from user 1
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
