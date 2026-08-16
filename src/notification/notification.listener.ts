import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import {Events} from '../common/event';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  CommentCreatedEvent,
  AttachmentUploadedEvent,
} from '../common/event';

@Injectable()
export class NotificationListener {
  constructor(private notificationService: NotificationService) {}

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