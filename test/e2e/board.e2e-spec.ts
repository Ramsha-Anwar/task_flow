import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app.util';
import {
  signupAndLogin,
  createWorkspaceSeed,
  addWorkspaceMemberSeed,
  createProjectSeed,
} from '../utils/seed-helpers';

/**
 * End-to-end tests for Board creation, listing, and validation within projects.
 */
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

    const admin = await signupAndLogin(app, adminUser);
    adminToken = admin.token;

    const member = await signupAndLogin(app, memberUser);
    memberToken = member.token;

    workspaceId = await createWorkspaceSeed(
      app,
      adminToken,
      'Board Test Workspace',
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
      'Sprint Project',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards', () => {
    /**
     * Rejects request when unauthenticated.
     */
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .send({ name: 'Unauth Board' });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects board creation if caller is a regular member instead of admin.
     */
    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Board' });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects creation when required name field is missing.
     */
    it('rejects creation with missing required name field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    /**
     * Validates project UUID format in URL path.
     */
    it('rejects creation with malformed project UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/invalid-uuid/boards`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Board' });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects creation when parent project does not exist.
     */
    it('returns 404 when parent project does not exist', async () => {
      const nonexistentProjectUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${nonexistentProjectUuid}/boards`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Board' });

      expect(res.status).toBe(404);
    });

    /**
     * Successfully creates board under a project.
     */
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
    /**
     * Verifies board listing on open route.
     */
    it('returns boards list on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((b: any) => b.name);
      expect(names).toContain('Sprint 1 Kanban');
    });

    /**
     * Validates malformed project UUID.
     */
    it('returns 400 for malformed project UUID', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/invalid-uuid/boards`,
      );

      expect(res.status).toBe(400);
    });

    /**
     * Returns 404 for nonexistent parent project.
     */
    it('returns 404 when parent project does not exist', async () => {
      const nonexistentProjectUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${nonexistentProjectUuid}/boards`,
      );

      expect(res.status).toBe(404);
    });
  });
});
