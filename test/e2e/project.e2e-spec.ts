import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app.util';
import {
  signupAndLogin,
  createWorkspaceSeed,
  addWorkspaceMemberSeed,
} from '../utils/seed-helpers';

/**
 * End-to-end tests for Project creation, listing, and workspace permission validation.
 */
describe('Project (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let workspaceId: string;
  let projectId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Project Admin',
    email: `prj-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Project Member',
    email: `prj-member-${timestamp}@test.com`,
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
      'Project Test Workspace',
    );
    await addWorkspaceMemberSeed(
      app,
      adminToken,
      workspaceId,
      member.userId,
      'member',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects', () => {
    /**
     * Rejects request when JWT is missing.
     */
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .send({ name: 'Unauth Project' });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects project creation by non-admin workspace member.
     */
    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Project' });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects project creation when required name is missing.
     */
    it('rejects creation with missing required name field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    /**
     * Rejects project creation if workspace ID is not a valid UUID.
     */
    it('rejects creation with malformed workspace UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces/invalid-uuid/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Project' });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects creation when target workspace does not exist.
     */
    it('returns 403 or 404 for nonexistent workspace UUID', async () => {
      const nonexistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${nonexistentUuid}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Project' });

      expect([403, 404]).toContain(res.status);
    });

    /**
     * Successfully creates a project under a workspace as an admin.
     */
    it('creates a new project as workspace admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Backend Revamp' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Backend Revamp');

      projectId = res.body.id;
    });
  });

  describe('GET /workspaces/:workspaceId/projects', () => {
    /**
     * Verifies that projects can be retrieved on open route.
     */
    it('returns projects list on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((p: any) => p.name);
      expect(names).toContain('Backend Revamp');
    });

    /**
     * Validates that malformed workspace UUID results in 400.
     */
    it('returns 400 for malformed workspace UUID', async () => {
      const res = await request(app.getHttpServer()).get(
        '/workspaces/not-a-uuid/projects',
      );

      expect(res.status).toBe(400);
    });

    /**
     * Validates that querying a nonexistent workspace returns 404.
     */
    it('returns 404 for nonexistent workspace UUID', async () => {
      const nonexistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${nonexistentUuid}/projects`,
      );

      expect(res.status).toBe(404);
    });
  });
});
