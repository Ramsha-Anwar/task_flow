/**
 * Central registry of domain event names, emitted by Task/Comment/Attachment
 * services via EventEmitter2 and consumed by NotificationListener and
 * ActivityListener. Adding a new event: add the name here, define its
 * payload interface below, emit it from the owning service, and add a
 * handler in each listener that should react to it.
 */
export const Events = {
  TASK_CREATED: 'task.created',
  TASK_MOVED: 'task.moved',
  COMMENT_CREATED: 'comment.created',
  ATTACHMENT_UPLOADED: 'attachment.uploaded',
} as const;

/** Payload for Events.TASK_CREATED, emitted by TaskService.createTask. */
export interface TaskCreatedEvent {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  boardId: string;
  columnId: string;
  assigneeId: string;
  actorId: string; // who created it
}

/** Payload for Events.TASK_MOVED, emitted by TaskService.moveTask. */
export interface TaskMovedEvent {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  assigneeId: string;
  actorId: string;
}

/** Payload for Events.COMMENT_CREATED, emitted by CommentService.createComment. */
export interface CommentCreatedEvent {
  commentId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  assigneeId: string;
  actorId: string;
}

/** Payload for Events.ATTACHMENT_UPLOADED, emitted by AttachmentService.createAttachment. */
export interface AttachmentUploadedEvent {
  attachmentId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  assigneeId: string;
  actorId: string;
}