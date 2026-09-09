import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Column (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let columnId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Column Admin',
    email: `col-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Column Member',
    email: `col-member-${timestamp}@test.com`,
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
      .send({ name: 'Column Test Workspace' });
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
      .send({ name: 'Column Test Project' });
    projectId = prjRes.body.id;

    // Create Board
    const brdRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Column Test Board' });
    boardId = brdRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns', () => {
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(401);
    });

    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(403);
    });

    it('rejects creation with missing required fields (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects creation with malformed board UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/invalid-uuid/columns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(400);
    });

    it('returns 404 when parent board does not exist', async () => {
      const nonexistentBoardUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${nonexistentBoardUuid}/columns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(404);
    });

    it('creates a new column as workspace admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('To Do');
      expect(res.body.position).toBe(1);

      columnId = res.body.id;
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns', () => {
    it('returns columns list on open route without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((c: any) => c.name);
      expect(names).toContain('To Do');
    });

    it('returns 400 for malformed board UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/invalid-uuid/columns`);

      expect(res.status).toBe(400);
    });

    it('returns 404 when parent board does not exist', async () => {
      const nonexistentBoardUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${nonexistentBoardUuid}/columns`);

      expect(res.status).toBe(404);
    });
  });
});
