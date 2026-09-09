import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Workspace (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;
  let memberUserId: string;
  let createdWorkspaceId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Admin User',
    email: `ws-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Member User',
    email: `ws-member-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Signup & login Admin User
    const adminSignupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminUser);
    adminUserId = adminSignupRes.body.id;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLoginRes.body.accessToken;

    // Signup & login Member User
    const memberSignupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(memberUser);
    memberUserId = memberSignupRes.body.id;

    const memberLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberUser.email, password: memberUser.password });
    memberToken = memberLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces', () => {
    it('rejects creation without JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .send({ name: 'Unauth Workspace' });

      expect(res.status).toBe(401);
    });

    it('rejects creation with missing name field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('creates a new workspace (201) with logged-in user as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Acme Corp' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Acme Corp');
      expect(res.body.ownerId).toBe(adminUserId);

      createdWorkspaceId = res.body.id;
    });
  });

  describe('GET /workspaces', () => {
    it('rejects listing without auth token', async () => {
      const res = await request(app.getHttpServer()).get('/workspaces');
      expect(res.status).toBe(401);
    });

    it('lists workspaces the logged-in user belongs to', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((w: any) => w.id);
      expect(ids).toContain(createdWorkspaceId);
    });
  });

  describe('GET /workspaces/:workspaceId', () => {
    it('returns 400 for malformed workspace UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspaces/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('returns 403 when user is not a member of the workspace', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${createdWorkspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 or 404 for a nonexistent workspace UUID', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${randomUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('fetches single workspace for admin member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${createdWorkspaceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdWorkspaceId);
    });
  });

  describe('POST /workspaces/:workspaceId/members', () => {
    it('rejects adding a member without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(401);
    });

    it('rejects non-admin attempt to add a member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(403);
    });

    it('returns 403 or 404 when adding member to nonexistent workspace', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${randomUuid}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect([403, 404]).toContain(res.status);
    });

    it('allows admin to add a new member (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.role).toBe('member');
    });

    it('rejects duplicate member addition (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already a member');
    });
  });
});
