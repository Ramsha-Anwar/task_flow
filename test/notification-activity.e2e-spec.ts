import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Notification & Activity (e2e)', () => {
  let app: INestApplication;
  let actorToken: string;     // User A (Admin)
  let assigneeToken: string;  // User B (Member)
  let outsiderToken: string;  // User C (Outsider)

  let actorUserId: string;
  let assigneeUserId: string;
  let outsiderUserId: string;

  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let columnId1: string;
  let columnId2: string;
  let taskId: string;
  let selfAssignedTaskId: string;

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

    // Signup & login User A (Actor)
    const actorSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(actorUser);
    actorUserId = actorSignup.body.id;

    const actorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: actorUser.email, password: actorUser.password });
    actorToken = actorLogin.body.accessToken;

    // Signup & login User B (Assignee)
    const assigneeSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(assigneeUser);
    assigneeUserId = assigneeSignup.body.id;

    const assigneeLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: assigneeUser.email, password: assigneeUser.password });
    assigneeToken = assigneeLogin.body.accessToken;

    // Signup & login User C (Outsider)
    const outsiderSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(outsiderUser);
    outsiderUserId = outsiderSignup.body.id;

    const outsiderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: outsiderUser.email, password: outsiderUser.password });
    outsiderToken = outsiderLogin.body.accessToken;

    // Create Workspace by User A
    const wsRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ name: 'Notif/Activity Workspace' });
    workspaceId = wsRes.body.id;

    // Add User B as Member
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ userId: assigneeUserId, role: 'member' });

    // Create Project
    const prjRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ name: 'Notif/Activity Project' });
    projectId = prjRes.body.id;

    // Create Board
    const brdRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ name: 'Notif/Activity Board' });
    boardId = brdRes.body.id;

    // Create Columns
    const colRes1 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ name: 'To Do', position: 1 });
    columnId1 = colRes1.body.id;

    const colRes2 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ name: 'Done', position: 2 });
    columnId2 = colRes2.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Self-notification Suppression', () => {
    it('does not create a notification when actor assigns task to self', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks`)
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ title: 'Self Assigned Task', assigneeId: actorUserId });

      expect(res.status).toBe(201);
      selfAssignedTaskId = res.body.id;

      // Check User A's notifications - should be empty
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body).toHaveLength(0);
    });
  });

  describe('Event-driven Notifications & Activity Log', () => {
    it('triggers task.created event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks`)
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ title: 'Feature Task for Assignee', assigneeId: assigneeUserId });

      expect(res.status).toBe(201);
      taskId = res.body.id;

      // Check User B's notifications
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.length).toBeGreaterThanOrEqual(1);
      const createdNotif = notifRes.body.find((n: any) => n.type === 'TASK_ASSIGNED');
      expect(createdNotif).toBeDefined();
      expect(createdNotif.message).toContain('Feature Task for Assignee');

      notificationId = createdNotif._id;
    });

    it('triggers task.moved event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId1}/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ targetColumnId: columnId2 });

      expect(res.status).toBe(200);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const movedNotif = notifRes.body.find((n: any) => n.type === 'TASK_MOVED');
      expect(movedNotif).toBeDefined();
    });

    it('triggers comment.created event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId2}/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${actorToken}`)
        .send({ text: 'Please review the updates.' });

      expect(res.status).toBe(201);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const cmtNotif = notifRes.body.find((n: any) => n.type === 'COMMENT_ADDED');
      expect(cmtNotif).toBeDefined();
    });

    it('triggers attachment.uploaded event and generates notification for assignee', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId2}/tasks/${taskId}/attachments`)
        .set('Authorization', `Bearer ${actorToken}`)
        .attach('file', Buffer.from('mock file data'), 'design.png');

      expect(res.status).toBe(201);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(notifRes.status).toBe(200);
      const attNotif = notifRes.body.find((n: any) => n.type === 'ATTACHMENT_ADDED');
      expect(attNotif).toBeDefined();
    });
  });

  describe('GET /notifications', () => {
    it('rejects listing notifications without auth token (401)', async () => {
      const res = await request(app.getHttpServer()).get('/notifications');
      expect(res.status).toBe(401);
    });

    it('ensures per-user notification scoping (actor User A sees 0 notifications for User B)', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('PATCH /notifications/:notificationId/read', () => {
    it('rejects mark-as-read without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`);

      expect(res.status).toBe(401);
    });

    it('rejects mark-as-read if caller is not the recipient (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${actorToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for nonexistent notification ID', async () => {
      const fakeObjectId = '507f1f77bcf86cd799439011';
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${fakeObjectId}/read`)
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for malformed Mongo notification ID', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/invalid-mongo-id/read')
        .set('Authorization', `Bearer ${assigneeToken}`);

      expect(res.status).toBe(404);
    });

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
    it('rejects activity lookup without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity`);

      expect(res.status).toBe(401);
    });

    it('rejects activity lookup by non-workspace-member (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

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
