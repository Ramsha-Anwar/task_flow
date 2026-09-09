export const Events = {
  TASK_CREATED: 'task.created',
  TASK_MOVED: 'task.moved',
  COMMENT_CREATED: 'comment.created',
  ATTACHMENT_UPLOADED: 'attachment.uploaded',
} as const;

export interface TaskCreatedEvent {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  boardId: string;
  columnId: string;
  assigneeId: string;
  actorId: string; // who created it
}

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

export interface CommentCreatedEvent {
  commentId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  assigneeId: string;
  actorId: string; 
}

export interface AttachmentUploadedEvent {
  attachmentId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  assigneeId: string;
  actorId: string; 
}