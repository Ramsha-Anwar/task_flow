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
 * End-to-end tests for Task lifecycle, validation, permissions, and moving between columns.
 */
describe('Task (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
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

    const admin = await signupAndLogin(app, adminUser);
    adminToken = admin.token;

    const member = await signupAndLogin(app, memberUser);
    memberToken = member.token;
    memberUserId = member.userId;

    const outsider = await signupAndLogin(app, outsiderUser);
    nonMemberUserId = outsider.userId;

    workspaceId = await createWorkspaceSeed(app, adminToken, 'Task Workspace');
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
      'Task Project',
    );
    boardId = await createBoardSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      'Main Board',
    );
    secondBoardId = await createBoardSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      'Secondary Board',
    );

    columnId = await createColumnSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      boardId,
      'To Do',
      1,
    );
    secondColumnId = await createColumnSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      boardId,
      'In Progress',
      2,
    );
    otherBoardColumnId = await createColumnSeed(
      app,
      adminToken,
      workspaceId,
      projectId,
      secondBoardId,
      'Other Board Column',
      1,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks', () => {
    /**
     * Rejects request when JWT is missing.
     */
    it('rejects creation without JWT token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .send({ title: 'Unauth Task', assigneeId: memberUserId });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects task creation by non-admin member.
     */
    it('rejects creation by non-admin workspace member (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Member Task', assigneeId: memberUserId });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects task creation when title is missing.
     */
    it('rejects missing required title field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: memberUserId });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects task creation when assigneeId is missing.
     */
    it('rejects missing required assigneeId field (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Assignee Task' });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects invalid priority values.
     */
    it('rejects invalid priority enum value (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad Priority',
          assigneeId: memberUserId,
          priority: 'URGENT',
        });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects malformed assigneeId UUID.
     */
    it('rejects malformed assigneeId UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad UUID', assigneeId: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    /**
     * Rejects assignees who do not belong to the workspace.
     */
    it('rejects assignee who is not a member of the workspace (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Outsider Task', assigneeId: nonMemberUserId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'Assignee must be a member of this workspace',
      );
    });

    /**
     * Returns 404 when column does not exist.
     */
    it('returns 404 when column does not exist', async () => {
      const nonexistentColumnUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${nonexistentColumnUuid}/tasks`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Lost Task', assigneeId: memberUserId });

      expect(res.status).toBe(404);
    });

    /**
     * Successfully creates task with minimal payload.
     */
    it('creates a task with minimal body (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
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

    /**
     * Successfully creates task with full metadata.
     */
    it('creates a task with full body (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
        )
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
    /**
     * Lists tasks in a column without authentication.
     */
    it('lists tasks in a column on open route without auth token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const titles = res.body.map((t: any) => t.title);
      expect(titles).toContain('Full Task');
    });

    /**
     * Returns 400 for malformed column UUID.
     */
    it('returns 400 for malformed column UUID', async () => {
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/not-a-uuid/tasks`,
      );

      expect(res.status).toBe(400);
    });

    /**
     * Returns 404 for nonexistent column UUID.
     */
    it('returns 404 for nonexistent column UUID', async () => {
      const nonexistentColumnUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer()).get(
        `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${nonexistentColumnUuid}/tasks`,
      );

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/move', () => {
    /**
     * Rejects moving task without JWT.
     */
    it('rejects move without auth token (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`,
        )
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(401);
    });

    /**
     * Rejects move if caller is not an admin.
     */
    it('rejects move by non-admin member (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(403);
    });

    /**
     * Rejects cross-board moves.
     */
    it('rejects cross-board move attempt (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: otherBoardColumnId });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('different board');
    });

    /**
     * Returns 404 when moving a nonexistent task.
     */
    it('returns 404 when moving nonexistent task', async () => {
      const nonexistentTaskUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${nonexistentTaskUuid}/move`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(404);
    });

    /**
     * Successfully moves task to another column on the same board.
     */
    it('moves task to target column on same board successfully (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetColumnId: secondColumnId });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.columnId).toBe(secondColumnId);
    });
  });
});
