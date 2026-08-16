# TaskFlow

A multi-tenant project/task management API — a mini Trello/Jira — built as a learning project to practice NestJS, TypeORM, Mongoose, and event-driven backend design.

## Stack

- **NestJS** — application framework
- **PostgreSQL (via Supabase)** + **TypeORM** — structural, relational data: users, workspaces, projects, boards, columns, tasks
- **MongoDB (via Atlas)** + **Mongoose** — flexible, high-write data: comments, attachments, notifications, activity logs
- **Passport + JWT** — authentication
- **@nestjs/event-emitter** — decouples core actions (task/comment/attachment creation) from notification and activity-logging side effects

## Why two databases

Postgres holds the data with real structural integrity requirements — foreign keys, cascading deletes, enums, transactional workspace creation. Mongo holds the data that's high-volume, loosely structured, and doesn't need relational guarantees — comments, attachments, notifications, and activity logs reference Postgres IDs as plain strings, with existence validated manually in the service layer rather than enforced by a foreign key. This is a deliberate polyglot-persistence choice, not an accident of convenience.

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```

2. Create a Supabase project (Postgres) and a MongoDB Atlas cluster if you don't already have them.

3. Copy the example env file and fill in your own credentials:
   ```
   cp .env.example .env
   ```

4. Run the app in development mode:
   ```
   npm run start:dev
   ```

   The API will be available at `http://localhost:3000` by default (see `PORT` below).

5. TypeORM's `synchronize` option is used to auto-create the Postgres schema in development — no manual migrations needed to get started. Mongoose collections are created automatically on first write.

## Environment Variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | TypeORM | Postgres connection string (Supabase) |
| `MONGO_URI` | Mongoose | MongoDB connection string (Atlas) |
| `JWT_SECRET` | Passport/JWT | Secret used to sign and verify access tokens |
| `PORT` | Nest bootstrap | Port the app listens on |

## Testing

The e2e suite runs against **separate databases from development**, not the same ones the app uses day-to-day:

- **Postgres**: a second, dedicated Supabase project (free tier allows two), so tests never touch dev data or risk leaving it in a bad state after a failed run.
- **Mongo**: the same Atlas cluster as dev, but a different database name (`taskflow_test` instead of the dev database) — no new cluster needed, just a different connection string.

Test credentials live in `.env.test` (gitignored, not committed), loaded automatically before the test app boots.

Run the full e2e suite:
```
npm run test:e2e
```

Run unit tests:
```
npm run test
```

**Why not sqlite or an in-memory Mongo for tests?** The schema relies on real Postgres-specific behavior — enum types (`priority`, `notification.type`), UUID primary keys, and `CASCADE`/`RESTRICT` behavior on foreign keys. In-memory substitutes don't reliably reproduce that behavior, so tests would pass without proving anything about how the app behaves against real Postgres.

## Architecture Overview

```
Workspace
  └── Project
        └── Board
              └── Column
                    └── Task ──┬── Comment (Mongo)
                                └── Attachment (Mongo)

Task/Comment/Attachment events → EventEmitter2 → Notification (Mongo) + ActivityLog (Mongo)
```

- **Auth**: signup/login issue JWTs; login errors are enumeration-safe (wrong password and nonexistent email return identical 401 responses).
- **Workspace**: the top-level tenant boundary. Membership is tracked via a `WorkspaceMember` join entity (relation-based, not flat foreign key columns), so a user's role is scoped per-workspace.
- **Project → Board → Column → Task**: a strict nesting hierarchy. Every route reflects the full parent chain in its URL rather than shortening the path and resolving ancestry in the guard.
- **Comment / Attachment**: live in Mongo, reference `taskId`/`authorId`/`uploaderId` as plain strings validated against Postgres in the service layer. Attachments are stored on local disk (`uploads/attachments`) — a known limitation that won't persist on ephemeral hosting and would need object storage (e.g. S3) for production.
- **Notification / ActivityLog**: created reactively via event listeners (`NotificationListener`, `ActivityListener`) that react to `task.created`, `task.moved`, `comment.created`, and `attachment.uploaded` events, rather than being called directly from the services that trigger them. Notifications suppress self-notification (an actor doesn't get notified about their own action).

## Authorization Pattern

- Every route includes the full parent chain in its path, e.g.:
  `/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks`
- Guards are applied per-route, not at the controller level.
- `GET` routes on workspace-scoped resources are open (no auth required).
- `POST`/`PATCH` routes require `AuthGuard('jwt')` + `WorkspaceRolesGuard`, generally restricted to `@Roles('admin')`, except Comment/Attachment writes and the Activity log read, which allow any real member (`@Roles('admin', 'member')`).
- Per-user (not per-workspace) reads — like `GET /notifications` — require `AuthGuard('jwt')` alone, without the workspace role guard, since they aren't scoped to a workspace membership check.

## API Route Summary

### Auth
| Method | Route | Auth |
|---|---|---|
| POST | `/auth/signup` | none |
| POST | `/auth/login` | none |

### Workspace
| Method | Route | Auth |
|---|---|---|
| POST | `/workspaces` | JWT |
| GET | `/workspaces` | JWT |
| POST | `/workspaces/:workspaceId/members` | JWT + admin |

### Project / Board / Column
| Method | Route | Auth |
|---|---|---|
| POST | `/workspaces/:workspaceId/projects` | JWT + admin |
| GET | `/workspaces/:workspaceId/projects` | open |
| POST | `.../projects/:projectId/boards` | JWT + admin |
| GET | `.../projects/:projectId/boards` | open |
| POST | `.../boards/:boardId/columns` | JWT + admin |
| GET | `.../boards/:boardId/columns` | open |

### Task
| Method | Route | Auth |
|---|---|---|
| POST | `.../columns/:columnId/tasks` | JWT + admin |
| GET | `.../columns/:columnId/tasks` | open |
| PATCH | `.../tasks/:taskId/move` | JWT + admin |

### Comment / Attachment
| Method | Route | Auth |
|---|---|---|
| POST | `.../tasks/:taskId/comments` | JWT + admin/member |
| GET | `.../tasks/:taskId/comments` | open |
| POST | `.../tasks/:taskId/attachments` | JWT + admin/member (multipart, field `file`) |
| GET | `.../tasks/:taskId/attachments` | open |
| GET | `.../tasks/:taskId/attachments/:attachmentId/download` | open |

### Notification / Activity
| Method | Route | Auth |
|---|---|---|
| GET | `/notifications` | JWT |
| PATCH | `/notifications/:notificationId/read` | JWT (owner only) |
| GET | `/workspaces/:workspaceId/activity` | JWT + admin/member |

## License
 
MIT