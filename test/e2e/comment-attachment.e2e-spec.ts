import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app.util';
import {
  signupAndLogin,
  createWorkspaceSeed,
  addWorkspaceMemberSeed,
  createProjectSeed,
  createBoardSeed,
  createColumnSeed,
  createTaskSeed,
} from '../utils/seed-helpers';

/**
 * End-to-end tests for Comment creation/listing and Attachment upload/download flows.
 */
describe('Comment & Attachment (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let adminUserId: string;
  let memberUserId: string;

  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let columnId: string;
  let taskId: string;
  let attachmentId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Comment Admin',
    email: `cmt-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Comment Member',
    email: `cmt-member-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const outsiderUser = {
    name: 'Comment Outsider',
    email: `cmt-outsider-${timestamp}@test.com`,
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

    const outsider = await signupAndLogin(app, outsiderUser);
    outsiderToken = outsider.token;

    workspaceId = await createWorkspaceSeed(
      app,
      adminToken,
      'Comment/Attachment Workspace',
    );
    await addWorkspaceMemberSeed(
      app,
      adminToken,
      workspaceId,
      memberUserId,
      'member',
    );
    projectId = await createProjectSeed(
      app,
      adminToken,
      workspaceId,
      'Comment/Attachment Project',
    );
    boardId = await createBoardSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      'Comment/Attachment Board',
    );
    columnId = await createColumnSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      boardId,
      'In Progress',
      1,
    );
    taskId = await createTaskSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      boardId,
      columnId,
      {
        title: 'Task For Comments',
        assigneeId: memberUserId,
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Comment Module', () => {
    const basePath = () =>
      `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments`;

    /**
     * Rejects comment creation without JWT.
     */
    it('rejects comment creation without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .send({ text: 'Unauth comment' });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects comments posted by non-workspace members.
     */
    it('rejects comment creation by non-workspace-member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ text: 'Outsider comment' });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects empty comment payloads.
     */
    it('rejects comment creation with empty body or text (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    /**
     * Rejects comment creation for nonexistent tasks.
     */
    it('rejects comment creation for nonexistent task (404)', async () => {
      const nonexistentTaskUuid = '00000000-0000-0000-0000-000000000000';
      const path = `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${nonexistentTaskUuid}/comments`;

      const res = await request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ text: 'Comment on ghost task' });

      expect(res.status).toBe(404);
    });

    /**
     * Successfully creates comment as a regular workspace member.
     */
    it('creates a comment successfully as a regular workspace member (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ text: 'Great progress on this task!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.text).toBe('Great progress on this task!');
      expect(res.body.authorId).toBe(memberUserId);
    });

    /**
     * Successfully creates comment as workspace admin.
     */
    it('creates a comment successfully as a workspace admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Admin note on this task.' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.text).toBe('Admin note on this task.');
      expect(res.body.authorId).toBe(adminUserId);
    });

    /**
     * Lists task comments on open route.
     */
    it('lists comments on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(basePath());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const texts = res.body.map((c: any) => c.text);
      expect(texts).toContain('Great progress on this task!');
      expect(texts).toContain('Admin note on this task.');
    });
  });

  describe('Attachment Module', () => {
    const basePath = () =>
      `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/attachments`;

    /**
     * Rejects attachment upload without auth token.
     */
    it('rejects attachment upload without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .attach('file', Buffer.from('hello world'), 'test.txt');

      expect(res.status).toBe(401);
    });

    /**
     * Rejects attachment upload by non-member.
     */
    it('rejects attachment upload by non-workspace-member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${outsiderToken}`)
        .attach('file', Buffer.from('hello world'), 'test.txt');

      expect(res.status).toBe(403);
    });

    /**
     * Rejects upload when no file is attached.
     */
    it('rejects attachment upload when no file is provided (400 or 404)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${memberToken}`);

      expect([400, 404]).toContain(res.status);
    });

    /**
     * Rejects upload for nonexistent tasks.
     */
    it('rejects attachment upload for nonexistent task (404)', async () => {
      const nonexistentTaskUuid = '00000000-0000-0000-0000-000000000000';
      const path = `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${nonexistentTaskUuid}/attachments`;

      const res = await request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('file', Buffer.from('dummy content'), 'ghost.txt');

      expect(res.status).toBe(404);
    });

    /**
     * Successfully uploads attachment multipart file.
     */
    it('uploads an attachment successfully via multipart file field (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(basePath())
        .set('Authorization', `Bearer ${memberToken}`)
        .attach(
          'file',
          Buffer.from('sample file content for test'),
          'spec-doc.txt',
        );

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.originalName).toBe('spec-doc.txt');
      expect(res.body.uploaderId).toBe(memberUserId);

      attachmentId = res.body._id;
    });

    /**
     * Lists attachments on open route.
     */
    it('lists attachments on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(basePath());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].originalName).toBe('spec-doc.txt');
    });

    /**
     * Downloads stored attachment file content.
     */
    it('downloads the attachment file on open route', async () => {
      const res = await request(app.getHttpServer()).get(
        `${basePath()}/${attachmentId}/download`,
      );

      expect(res.status).toBe(200);
      expect(res.text).toBe('sample file content for test');
    });

    /**
     * Returns 404 for downloading nonexistent attachment Mongo ID.
     */
    it('returns 404 for downloading nonexistent attachment Mongo ID', async () => {
      const fakeObjectId = '507f1f77bcf86cd799439011';
      const res = await request(app.getHttpServer()).get(
        `${basePath()}/${fakeObjectId}/download`,
      );

      expect(res.status).toBe(404);
    });

    /**
     * Returns 404 for downloading malformed attachment Mongo ID.
     */
    it('returns 404 for downloading malformed attachment Mongo ID', async () => {
      const res = await request(app.getHttpServer()).get(
        `${basePath()}/invalid-mongo-id/download`,
      );

      expect(res.status).toBe(404);
    });
  });
});
