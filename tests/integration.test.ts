import { describe, it, expect } from 'vitest';
import request from 'request';
import supertest from 'supertest';
import app from '../src/app';

describe('Streamlined Daily Expenses System Integration Test Suite', () => {
  let adminToken = '';
  let createdTxId = 0;
  let testProjectId = 0;

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
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.journalNumber).toMatch(/^JRN-\d{8}$/);
  });

  it('3. POST /api/v1/today/transactions adds transaction to today auto journal', async () => {
    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '101',
        beneficiaryId: 1,
        categoryId: 1,
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
    // 1. Deactivate project
    await supertest(app)
      .patch(`/api/v1/projects/${testProjectId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED', isActive: false });

    // 2. Try adding transaction to suspended project
    const res = await supertest(app)
      .post('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        manualVoucherNumber: '102',
        beneficiaryId: 1,
        categoryId: 1,
        projectId: testProjectId,
        amount: 150.00,
        description: 'اختبار مشروع متوقف',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('8. DELETE /api/v1/today/transactions/:id deletes transaction', async () => {
    const res = await supertest(app)
      .delete(`/api/v1/today/transactions/${createdTxId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
