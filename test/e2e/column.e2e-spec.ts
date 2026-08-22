import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app.util';
import {
  signupAndLogin,
  createWorkspaceSeed,
  addWorkspaceMemberSeed,
  createProjectSeed,
  createBoardSeed,
} from '../utils/seed-helpers';

/**
 * End-to-end tests for Column creation, listing, and board association.
 */
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

    const admin = await signupAndLogin(app, adminUser);
    adminToken = admin.token;

    const member = await signupAndLogin(app, memberUser);
    memberToken = member.token;

    workspaceId = await createWorkspaceSeed(
      app,
      adminToken,
      'Column Test Workspace',
    );
    await addWorkspaceMemberSeed(
      app,
      adminToken,
      workspaceId,
      member.userId,
      'member',
    );
    projectId = await createProjectSeed(
      app,
      adminToken,
      workspaceId,
      'Column Test Project',
    );
    boardId = await createBoardSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      'Column Test Board',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns', () => {
    /**
     * Rejects request without authentication.
     */
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
        )
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects column creation by regular workspace member.
     */
    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects creation when required fields are missing.
     */
    it('rejects creation with missing required fields (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    /**
     * Validates board UUID in URL path.
     */
    it('rejects creation with malformed board UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/invalid-uuid/columns`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(400);
    });

    /**
     * Returns 404 when board does not exist.
     */
    it('returns 404 when parent board does not exist', async () => {
      const nonexistentBoardUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${nonexistentBoardUuid}/columns`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Do', position: 1 });

      expect(res.status).toBe(404);
    });

    /**
     * Successfully creates column on board.
     */
    it('creates a new column as workspace admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
        )
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
    /**
     * Verifies column retrieval on open route.
     */
    it('returns columns list on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((c: any) => c.name);
      expect(names).toContain('To Do');
    });

    /**
     * Validates malformed board UUID format.
     */
    it('returns 400 for malformed board UUID', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/invalid-uuid/columns`,
      );

      expect(res.status).toBe(400);
    });

    /**
     * Returns 404 for nonexistent board.
     */
    it('returns 404 when parent board does not exist', async () => {
      const nonexistentBoardUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${nonexistentBoardUuid}/columns`,
      );

      expect(res.status).toBe(404);
    });
  });
});
