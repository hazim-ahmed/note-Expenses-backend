import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Daily Expenses System REST API Test Suite', () => {
  let authToken = '';

  it('1. User Login - Successful Credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    authToken = res.body.data.tokens.accessToken;
  });

  it('2. Fetch Current User Profile (/auth/me)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(process.env.DEFAULT_ADMIN_USERNAME || 'admin');
  });

  it('3. Fail Authentication on Incorrect Password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('4. Get System Settings', async () => {
    const res = await request(app)
      .get('/api/v1/system-settings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('5. Get Beneficiaries & Expense Categories', async () => {
    const benRes = await request(app)
      .get('/api/v1/beneficiaries')
      .set('Authorization', `Bearer ${authToken}`);

    const catRes = await request(app)
      .get('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${authToken}`);

    expect(benRes.status).toBe(200);
    expect(catRes.status).toBe(200);
  });

  it('6. Get Today Auto Journal Overview', async () => {
    const res = await request(app)
      .get('/api/v1/today')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('7. Get Today Expenses List', async () => {
    const res = await request(app)
      .get('/api/v1/today/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
