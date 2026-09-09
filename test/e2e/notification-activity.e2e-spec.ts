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
} from '../utils/seed-helpers';

/**
 * End-to-end tests for asynchronous domain events, Notifications delivery, read state, and Activity log.
 */
describe('Notification & Activity (e2e)', () => {
  let app: INestApplication;
  let actorToken: string; // User A (Admin)
  let assigneeToken: string; // User B (Member)
  let outsiderToken: string; // User C (Outsider)

  let actorUserId: string;
  let assigneeUserId: string;

  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let columnId1: string;
  let columnId2: string;
  let taskId: string;

  let notificationId: string;

  const timestamp = Date.now();
  const actorUser = {
    name: 'Actor User A',
    email: `actor-a-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const assigneeUser = {
    name: 'Assignee User B',
    email: `assignee-b-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const outsiderUser = {
    name: 'Outsider User C',
    email: `outsider-c-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = await createTestApp();

    const actor = await signupAndLogin(app, actorUser);
    actorToken = actor.token;
    actorUserId = actor.userId;

    const assignee = await signupAndLogin(app, assigneeUser);
    assigneeToken = assignee.token;
    assigneeUserId = assignee.userId;

    const outsider = await signupAndLogin(app, outsiderUser);
    outsiderToken = outsider.token;

    workspaceId = await createWorkspaceSeed(
      app,
      actorToken,
      'Notif/Activity Workspace',
    );
    await addWorkspaceMemberSeed(
      app,
      actorToken,
      workspaceId,
      assigneeUserId,
      'member',
    );

    projectId = await createProjectSeed(
      app,
      actorToken,
      workspaceId,
      'Notif/Activity Project',
    );
    boardId = await createBoardSeed(
      app,
      actorToken,
      workspaceId,
      projectId,
      'Notif/Activity Board',
    );

    columnId1 = await createColumnSeed(
      app,
      actorToken,
      workspaceId,
      projectId,
      boardId,
      'To Do',
      1,
    );
    columnId2 = await createColumnSeed(
      app,
      actorToken,
      workspaceId,
      projectId,
      boardId,
      'Done',
      2,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Self-notification Suppression', () => {
    /**
     * Verifies that actors do not get notified when assigning tasks to themselves.
     */
    it('does not create a notification when actor assigns task to self', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks`,
        )
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ title: 'Self Assigned Task', assigneeId: actorUserId });

      expect(res.status).toBe(201);

      // Check User A's notifications - should be empty
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body).toHaveLength(0);
    });
  });

  describe('Event-driven Notifications & Activity Log', () => {
    /**
     * Verifies task.created event emits and creates TASK_ASSIGNED notification for assignee.
     */
    it('triggers task.created event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks`,
        )
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          title: 'Feature Task for Assignee',
          assigneeId: assigneeUserId,
        });

      expect(res.status).toBe(201);
      taskId = res.body.id;

      // Check User B's notifications
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.length).toBeGreaterThanOrEqual(1);
      const createdNotif = notifRes.body.find(
        (n: any) => n.type === 'TASK_ASSIGNED',
      );
      expect(createdNotif).toBeDefined();
      expect(createdNotif.message).toContain('Feature Task for Assignee');

      notificationId = createdNotif._id;
    });

    /**
     * Verifies task.moved event emits and creates TASK_MOVED notification for assignee.
     */
    it('triggers task.moved event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks/${taskId}/move`,
        )
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ targetColumnId: columnId2 });

      expect(res.status).toBe(200);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const movedNotif = notifRes.body.find(
        (n: any) => n.type === 'TASK_MOVED',
      );
      expect(movedNotif).toBeDefined();
    });

    /**
     * Verifies comment.created event emits and creates COMMENT_ADDED notification.
     */
    it('triggers comment.created event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId2}/tasks/${taskId}/comments`,
        )
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ text: 'Please review the updates.' });

      expect(res.status).toBe(201);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const cmtNotif = notifRes.body.find(
        (n: any) => n.type === 'COMMENT_ADDED',
      );
      expect(cmtNotif).toBeDefined();
    });

    /**
     * Verifies attachment.uploaded event emits and creates ATTACHMENT_ADDED notification.
     */
    it('triggers attachment.uploaded event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId2}/tasks/${taskId}/attachments`,
        )
        .set('Authorization', `Bearer ${actorToken}`)
        .attach('file', Buffer.from('mock file data'), 'design.png');

      expect(res.status).toBe(201);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const attNotif = notifRes.body.find(
        (n: any) => n.type === 'ATTACHMENT_ADDED',
      );
      expect(attNotif).toBeDefined();
    });
  });

  describe('GET /notifications', () => {
    /**
     * Rejects notifications listing without JWT.
     */
    it('rejects listing notifications without auth token (401)', async () => {
      const res = await request(app.getHttpServer()).get('/notifications');
      expect(res.status).toBe(401);
    });

    /**
     * Verifies notification isolation between users.
     */
    it('ensures per-user notification scoping (actor User A sees 0 notifications for User B)', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('PATCH /notifications/:notificationId/read', () => {
    /**
     * Rejects mark-as-read without JWT.
     */
    it('rejects mark-as-read without auth token (401)', async () => {
      const res = await request(app.getHttpServer()).patch(
        `/notifications/${notificationId}/read`,
      );

      expect(res.status).toBe(401);
    });

    /**
     * Forbids marking another user's notification as read.
     */
    it('rejects mark-as-read if caller is not the recipient (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${actorToken}`);

      expect(res.status).toBe(403);
    });

    /**
     * Returns 404 for nonexistent notification ID.
     */
    it('returns 404 for nonexistent notification ID', async () => {
      const fakeObjectId = '507f1f77bcf86cd799439011';
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${fakeObjectId}/read`)
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(404);
    });

    /**
     * Returns 404 for malformed Mongo notification ID.
     */
    it('returns 404 for malformed Mongo notification ID', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/invalid-mongo-id/read')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(404);
    });

    /**
     * Successfully marks notification as read.
     */
    it('marks notification as read successfully for recipient (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(notificationId);
      expect(res.body.isRead).toBe(true);
    });
  });

  describe('GET /workspaces/:workspaceId/activity', () => {
    /**
     * Rejects activity lookup without auth token.
     */
    it('rejects activity lookup without auth token (401)', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/activity`,
      );

      expect(res.status).toBe(401);
    });

    /**
     * Rejects activity lookup by non-members.
     */
    it('rejects activity lookup by non-workspace-member (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    /**
     * Returns activity entries for members.
     */
    it('returns activity log entries for workspace members (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity`)
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      const actions = res.body.map((a: any) => a.action);
      expect(actions).toContain('task.created');
      expect(actions).toContain('task.moved');
      expect(actions).toContain('comment.created');
      expect(actions).toContain('attachment.uploaded');
    });
  });
});
