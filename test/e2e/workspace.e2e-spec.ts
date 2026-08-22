import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app.util';
import { signupAndLogin } from '../utils/seed-helpers';

/**
 * End-to-end tests for Workspace creation, listing, role enforcement, and member management.
 */
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

    const admin = await signupAndLogin(app, adminUser);
    adminToken = admin.token;
    adminUserId = admin.userId;

    const member = await signupAndLogin(app, memberUser);
    memberToken = member.token;
    memberUserId = member.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces', () => {
    /**
     * Rejects request when Authorization header is missing.
     */
    it('rejects creation without JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .send({ name: 'Unauth Workspace' });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects request when workspace name is omitted.
     */
    it('rejects creation with missing name field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    /**
     * Successfully creates workspace and sets the creator as owner/admin.
     */
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
    /**
     * Rejects request without authentication.
     */
    it('rejects listing without auth token', async () => {
      const res = await request(app.getHttpServer()).get('/workspaces');
      expect(res.status).toBe(401);
    });

    /**
     * Lists all workspaces to which the authenticated user belongs.
     */
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
    /**
     * Validates UUID format on path parameters.
     */
    it('returns 400 for malformed workspace UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspaces/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    /**
     * Enforces that non-members cannot read workspace details.
     */
    it('returns 403 when user is not a member of the workspace', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${createdWorkspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    /**
     * Returns 403 or 404 for a nonexistent workspace UUID.
     */
    it('returns 403 or 404 for a nonexistent workspace UUID', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${randomUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    /**
     * Allows a member/admin to fetch the workspace details.
     */
    it('fetches single workspace for admin member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${createdWorkspaceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdWorkspaceId);
    });
  });

  describe('POST /workspaces/:workspaceId/members', () => {
    /**
     * Rejects unauthorized member addition.
     */
    it('rejects adding a member without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(401);
    });

    /**
     * Forbids non-admin members from adding other members.
     */
    it('rejects non-admin attempt to add a member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(403);
    });

    /**
     * Returns error when adding a member to a nonexistent workspace.
     */
    it('returns 403 or 404 when adding member to nonexistent workspace', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${randomUuid}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect([403, 404]).toContain(res.status);
    });

    /**
     * Successfully adds a member when invoked by the workspace admin.
     */
    it('allows admin to add a new member (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${createdWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, role: 'member' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.role).toBe('member');
    });

    /**
     * Rejects duplicate member addition (400).
     */
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
