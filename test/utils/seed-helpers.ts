import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * User signup payload interface for test seeding.
 */
export interface TestUserCredentials {
  name: string;
  email: string;
  password: string;
}

/**
 * Signs up and logs in a test user, returning their JWT access token and user ID.
 *
 * @param app - Initialized Nest application instance.
 * @param user - The user credentials to register and authenticate with.
 * @returns An object containing the accessToken and the user's UUID id.
 */
export async function signupAndLogin(
  app: INestApplication,
  user: TestUserCredentials,
): Promise<{ token: string; userId: string }> {
  const signupRes = await request(app.getHttpServer())
    .post('/auth/signup')
    .send(user);

  const userId = signupRes.body.id;

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: user.email, password: user.password });

  const token = loginRes.body.accessToken;

  return { token, userId };
}

/**
 * Creates a workspace for testing.
 *
 * @param app - Initialized Nest application instance.
 * @param token - Bearer JWT token of the workspace creator (becomes admin).
 * @param name - The workspace name.
 * @returns The created workspace UUID id.
 */
export async function createWorkspaceSeed(
  app: INestApplication,
  token: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });

  return res.body.id;
}

/**
 * Adds a user as a member to a specified workspace.
 *
 * @param app - Initialized Nest application instance.
 * @param adminToken - Bearer JWT token of an admin member.
 * @param workspaceId - Target workspace UUID.
 * @param userId - Target user UUID to add.
 * @param role - Role assigned to the user ('admin' | 'member'). Defaults to 'member'.
 */
export async function addWorkspaceMemberSeed(
  app: INestApplication,
  adminToken: string,
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member' = 'member',
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/workspaces/${workspaceId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId, role });
}

/**
 * Creates a project inside a workspace.
 *
 * @param app - Initialized Nest application instance.
 * @param adminToken - Bearer JWT token of a workspace admin.
 * @param workspaceId - Parent workspace UUID.
 * @param name - Name of the project.
 * @returns The created project UUID id.
 */
export async function createProjectSeed(
  app: INestApplication,
  adminToken: string,
  workspaceId: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`/workspaces/${workspaceId}/projects`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name });

  return res.body.id;
}

/**
 * Creates a board inside a project.
 *
 * @param app - Initialized Nest application instance.
 * @param adminToken - Bearer JWT token of a workspace admin.
 * @param workspaceId - Parent workspace UUID.
 * @param projectId - Parent project UUID.
 * @param name - Name of the board.
 * @returns The created board UUID id.
 */
export async function createBoardSeed(
  app: INestApplication,
  adminToken: string,
  workspaceId: string,
  projectId: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`/workspaces/${workspaceId}/projects/${projectId}/boards`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name });

  return res.body.id;
}

/**
 * Creates a column inside a board.
 *
 * @param app - Initialized Nest application instance.
 * @param adminToken - Bearer JWT token of a workspace admin.
 * @param workspaceId - Parent workspace UUID.
 * @param projectId - Parent project UUID.
 * @param boardId - Parent board UUID.
 * @param name - Name of the column.
 * @param position - Column position order number.
 * @returns The created column UUID id.
 */
export async function createColumnSeed(
  app: INestApplication,
  adminToken: string,
  workspaceId: string,
  projectId: string,
  boardId: string,
  name: string,
  position: number = 1,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(
      `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
    )
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name, position });

  return res.body.id;
}

/**
 * Creates a task inside a column.
 *
 * @param app - Initialized Nest application instance.
 * @param adminToken - Bearer JWT token of a workspace admin.
 * @param workspaceId - Parent workspace UUID.
 * @param projectId - Parent project UUID.
 * @param boardId - Parent board UUID.
 * @param columnId - Parent column UUID.
 * @param payload - Task creation payload (title, assigneeId, description, priority, etc.).
 * @returns The created task UUID id.
 */
export async function createTaskSeed(
  app: INestApplication,
  adminToken: string,
  workspaceId: string,
  projectId: string,
  boardId: string,
  columnId: string,
  payload: {
    title: string;
    assigneeId: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(
      `/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
    )
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  return res.body.id;
}
