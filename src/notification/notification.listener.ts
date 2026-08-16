import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { Events } from '../common/event';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  CommentCreatedEvent,
  AttachmentUploadedEvent,
} from '../common/event';

/**
 * Listens for domain events emitted by Task, Comment, and Attachment
 * services and turns them into Notification documents for the task's
 * assignee. Each handler skips notifying a user about their own action.
 */
@Injectable()
export class NotificationListener {
  constructor(private notificationService: NotificationService) {}

  /**
   * Notifies the assignee when they're assigned to a newly created task.
   * @param payload - Event data emitted by TaskService.createTask.
   */
  @OnEvent(Events.TASK_CREATED)
  async handleTaskCreated(payload: TaskCreatedEvent) {
    // don't notify someone for assigning themselves
    if (payload.actorId === payload.assigneeId) return;

    await this.notificationService.create({
      recipientId: payload.assigneeId,
      actorId: payload.actorId,
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      type: 'TASK_ASSIGNED',
      message: `You were assigned to "${payload.taskTitle}"`,
    });
  }

  /**
   * Notifies the assignee when their task is moved to a different column.
   * @param payload - Event data emitted by TaskService.moveTask.
   */
  @OnEvent(Events.TASK_MOVED)
  async handleTaskMoved(payload: TaskMovedEvent) {
    if (payload.actorId === payload.assigneeId) return;

    await this.notificationService.create({
      recipientId: payload.assigneeId,
      actorId: payload.actorId,
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      type: 'TASK_MOVED',
      message: `"${payload.taskTitle}" was moved`,
    });
  }

  /**
   * Notifies the assignee when a new comment is added to their task.
   * @param payload - Event data emitted by CommentService.createComment.
   */
  @OnEvent(Events.COMMENT_CREATED)
  async handleCommentCreated(payload: CommentCreatedEvent) {
    if (payload.actorId === payload.assigneeId) return;

    await this.notificationService.create({
      recipientId: payload.assigneeId,
      actorId: payload.actorId,
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      type: 'COMMENT_ADDED',
      message: `New comment on "${payload.taskTitle}"`,
    });
  }

  /**
   * Notifies the assignee when a new attachment is uploaded to their task.
   * @param payload - Event data emitted by AttachmentService.createAttachment.
   */
  @OnEvent(Events.ATTACHMENT_UPLOADED)
  async handleAttachmentUploaded(payload: AttachmentUploadedEvent) {
    if (payload.actorId === payload.assigneeId) return;

    await this.notificationService.create({
      recipientId: payload.assigneeId,
      actorId: payload.actorId,
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      type: 'ATTACHMENT_ADDED',
      message: `New attachment on "${payload.taskTitle}"`,
    });
  }
}