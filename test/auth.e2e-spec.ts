import { INestApplication } from '@nestjs/common';
import request from 'supertest';import { createTestApp } from './utils/test-app.util';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const testUser = {
    name: 'Test User',
    email: `e2e-${Date.now()}@test.com`,
    password: 'TestPass123!',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
  });

  it('rejects duplicate signup', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser);

    expect([400, 409]).toContain(res.status);
  });

  it('logs in with correct credentials and returns a JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects login with wrong password (enumeration-safe)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('rejects login for nonexistent email with the same error shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});