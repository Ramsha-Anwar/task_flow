import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.util';

describe('Full Flow Regression (e2e)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  let workspaceId: string;
  let projectId: string;
  let boardId: string;
  let column1Id: string;
  let column2Id: string;
  let taskId: string;
  let commentId: string;
  let attachmentId: string;
  let notificationId: string;

  const timestamp = Date.now();
  const user1 = {
    name: 'Lead Admin User',
    email: `flow-user1-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
  const user2 = {
    name: 'Team Member User',
    email: `flow-user2-${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Signs up User 1 (Admin) and User 2 (Member)', async () => {
    const signup1 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user1);
    expect(signup1.status).toBe(201);
    user1Id = signup1.body.id;

    const signup2 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user2);
    expect(signup2.status).toBe(201);
    user2Id = signup2.body.id;
  });

  it('2. Logs in User 1 and User 2 to obtain JWT tokens', async () => {
    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user1.email, password: user1.password });
    expect(login1.status).toBe(201);
    expect(login1.body).toHaveProperty('accessToken');
    user1Token = login1.body.accessToken;

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user2.email, password: user2.password });
    expect(login2.status).toBe(201);
    expect(login2.body).toHaveProperty('accessToken');
    user2Token = login2.body.accessToken;
  });

  it('3. User 1 creates a new Workspace and lists own workspaces', async () => {
    const createWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Postman Pass Workspace' });
    expect(createWs.status).toBe(201);
    workspaceId = createWs.body.id;

    const listWs = await request(app.getHttpServer())
      .get('/workspaces')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(listWs.status).toBe(200);
    const ids = listWs.body.map((w: any) => w.id);
    expect(ids).toContain(workspaceId);
  });

  it('4. User 1 adds User 2 to the workspace as a Member', async () => {
    const addMem = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ userId: user2Id, role: 'member' });
    expect(addMem.status).toBe(201);
  });

  it('5. User 1 creates a Project and lists workspace projects', async () => {
    const createPrj = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Engineering Roadmap' });
    expect(createPrj.status).toBe(201);
    projectId = createPrj.body.id;

    const listPrj = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects`);
    expect(listPrj.status).toBe(200);
    expect(listPrj.body.map((p: any) => p.name)).toContain('Engineering Roadmap');
  });

  it('6. User 1 creates a Board and lists project boards', async () => {
    const createBrd = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Sprint Board 2026' });
    expect(createBrd.status).toBe(201);
    boardId = createBrd.body.id;

    const listBrd = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/${projectId}/boards`);
    expect(listBrd.status).toBe(200);
    expect(listBrd.body.map((b: any) => b.name)).toContain('Sprint Board 2026');
  });

  it('7. User 1 creates Column 1 (Backlog) and Column 2 (Done)', async () => {
    const col1 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Backlog', position: 1 });
    expect(col1.status).toBe(201);
    column1Id = col1.body.id;

    const col2 = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Done', position: 2 });
    expect(col2.status).toBe(201);
    column2Id = col2.body.id;

    const listCols = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`);
    expect(listCols.status).toBe(200);
    expect(listCols.body).toHaveLength(2);
  });

  it('8. User 1 creates Task assigned to User 2 in Column 1', async () => {
    const createTsk = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column1Id}/tasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Complete E2E Tests Pass',
        description: 'Ensure regression pass is fully automated',
        priority: 'high',
        assigneeId: user2Id,
      });
    expect(createTsk.status).toBe(201);
    taskId = createTsk.body.id;

    const listTsks = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column1Id}/tasks`);
    expect(listTsks.status).toBe(200);
    expect(listTsks.body.map((t: any) => t.title)).toContain('Complete E2E Tests Pass');
  });

  it('9. User 1 moves Task to Column 2 (Done)', async () => {
    const moveRes = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column1Id}/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ targetColumnId: column2Id });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.columnId).toBe(column2Id);
  });

  it('10. User 2 posts a Comment on the Task', async () => {
    const cmtRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column2Id}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ text: 'All regression tests passed successfully!' });
    expect(cmtRes.status).toBe(201);
    commentId = cmtRes.body._id;

    const listCmts = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column2Id}/tasks/${taskId}/comments`);
    expect(listCmts.status).toBe(200);
    expect(listCmts.body.map((c: any) => c.text)).toContain('All regression tests passed successfully!');
  });

  it('11. User 2 uploads an Attachment to the Task', async () => {
    const attRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column2Id}/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${user2Token}`)
      .attach('file', Buffer.from('test suite summary report'), 'summary-report.txt');
    expect(attRes.status).toBe(201);
    attachmentId = attRes.body._id;

    const listAtts = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${column2Id}/tasks/${taskId}/attachments`);
    expect(listAtts.status).toBe(200);
    expect(listAtts.body.map((a: any) => a.originalName)).toContain('summary-report.txt');
  });

  it('12. User 2 receives Notifications for assigned task actions and marks one as read', async () => {
    const notifsRes = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user2Token}`);
    expect(notifsRes.status).toBe(200);
    expect(notifsRes.body.length).toBeGreaterThanOrEqual(1);

    notificationId = notifsRes.body[0]._id;

    const readRes = await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.isRead).toBe(true);
  });

  it('13. Verifies workspace Activity Log records all actions', async () => {
    const actRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/activity`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(actRes.status).toBe(200);
    const actions = actRes.body.map((a: any) => a.action);
    expect(actions).toContain('task.created');
    expect(actions).toContain('task.moved');
    expect(actions).toContain('comment.created');
    expect(actions).toContain('attachment.uploaded');
  });
});
