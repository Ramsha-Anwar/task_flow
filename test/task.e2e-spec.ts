import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Task (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;
  let memberUserId: string;
  let nonMemberUserId: string;

  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let secondBoardId: string;
  let columnId: string;
  let secondColumnId: string;
  let otherBoardColumnId: string;
  let taskId: string;

  const timestamp = Date.now();
  const adminUser = {
    name: 'Task Admin',
    email: `task-admin-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const memberUser = {
    name: 'Task Member',
    email: `task-member-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const outsiderUser = {
    name: 'Task Outsider',
    email: `task-outsider-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Signup & login Admin User
    const adminSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminUser);
    adminUserId = adminSignup.body.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Signup & login Member User
    const memberSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(memberUser);
    memberUserId = memberSignup.body.id;

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberUser.email, password: memberUser.password });
    memberToken = memberLogin.body.accessToken;

    // Signup Outsider User (not added to workspace)
    const outsiderSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(outsiderUser);
    nonMemberUserId = outsiderSignup.body.id;

    // Setup Workspace
    const wsRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Task Workspace' });
    workspaceId = wsRes.body.id;

    // Add Member User to Workspace
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberUserId, role: 'member' });

    // Setup Project
    const prjRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Task Project' });
    projectId = prjRes.body.id;

    // Setup Board 1
    const brdRes1 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Main Board' });
    boardId = brdRes1.body.id;

    // Setup Board 2 (for cross-board move test)
    const brdRes2 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Secondary Board' });
    secondBoardId = brdRes2.body.id;

    // Setup Columns on Board 1
    const colRes1 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'To Do', position: 1 });
    columnId = colRes1.body.id;

    const colRes2 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'In Progress', position: 2 });
    secondColumnId = colRes2.body.id;

    // Setup Column on Board 2
    const colRes3 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${secondBoardId}/columns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Other Board Column', position: 1 });
    otherBoardColumnId = colRes3.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks', () => {
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .send({ title: 'Unauth Task', assigneeId: memberUserId });

      expect(res.status).toBe(401);
    });

    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Member Task', assigneeId: memberUserId });

      expect(res.status).toBe(403);
    });

    it('rejects missing required title field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: memberUserId });

      expect(res.status).toBe(400);
    });

    it('rejects missing required assigneeId field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Assignee Task' });

      expect(res.status).toBe(400);
    });

    it('rejects invalid priority enum value (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad Priority', assigneeId: memberUserId, priority: 'URGENT' });

      expect(res.status).toBe(400);
    });

    it('rejects malformed assigneeId UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad UUID', assigneeId: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    it('rejects assignee who is not a member of the workspace (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Outsider Task', assigneeId: nonMemberUserId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Assignee must be a member of this workspace');
    });

    it('returns 404 when column does not exist', async () => {
      const nonexistentColumnUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${nonexistentColumnUuid}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Lost Task', assigneeId: memberUserId });

      expect(res.status).toBe(404);
    });

    it('creates a task with minimal body (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Minimal Task',
          assigneeId: memberUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Minimal Task');
      expect(res.body.assigneeId).toBe(memberUserId);
    });

    it('creates a task with full body (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Full Task',
          description: 'Comprehensive task description',
          priority: 'high',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          assigneeId: memberUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Full Task');
      expect(res.body.description).toBe('Comprehensive task description');
      expect(res.body.priority).toBe('high');

      taskId = res.body.id;
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks', () => {
    it('lists tasks in a column on open route without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const titles = res.body.map((t: any) => t.title);
      expect(titles).toContain('Full Task');
    });

    it('returns 400 for malformed column UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/not-a-uuid/tasks`);

      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent column UUID', async () => {
      const nonexistentColumnUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${nonexistentColumnUuid}/tasks`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/move', () => {
    it('rejects move without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(401);
    });

    it('rejects move by non-admin member (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(403);
    });

    it('rejects cross-board move attempt (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: otherBoardColumnId });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('different board');
    });

    it('returns 404 when moving nonexistent task', async () => {
      const nonexistentTaskUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${nonexistentTaskUuid}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(404);
    });

    it('moves task to target column on same board successfully (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.columnId).toBe(secondColumnId);
    });
  });
});
