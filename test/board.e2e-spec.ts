import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Board (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let workspaceId: string;
  let projectId: string;
  let boardId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Board Admin',
    email: `brd-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Board Member',
    email: `brd-member-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Signup & login Admin User
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminUser);

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Signup & login Member User
    const memberSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(memberUser);

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberUser.email, password: memberUser.password });
    memberToken = memberLogin.body.accessToken;

    // Create Workspace
    const wsRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Board Test Workspace' });
    workspaceId = wsRes.body.id;

    // Add Member
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberSignup.body.id, role: 'member' });

    // Create Project
    const prjRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sprint Project' });
    projectId = prjRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards', () => {
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .send({ name: 'Unauth Board' });

      expect(res.status).toBe(401);
    });

    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Board' });

      expect(res.status).toBe(403);
    });

    it('rejects creation with missing required name field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects creation with malformed project UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/invalid-uuid/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Board' });

      expect(res.status).toBe(400);
    });

    it('returns 404 when parent project does not exist', async () => {
      const nonexistentProjectUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${nonexistentProjectUuid}/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Board' });

      expect(res.status).toBe(404);
    });

    it('creates a new board as workspace admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sprint 1 Kanban' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Sprint 1 Kanban');

      boardId = res.body.id;
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId/boards', () => {
    it('returns boards list on open route without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((b: any) => b.name);
      expect(names).toContain('Sprint 1 Kanban');
    });

    it('returns 400 for malformed project UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/invalid-uuid/boards`);

      expect(res.status).toBe(400);
    });

    it('returns 404 when parent project does not exist', async () => {
      const nonexistentProjectUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${nonexistentProjectUuid}/boards`);

      expect(res.status).toBe(404);
    });
  });
});
