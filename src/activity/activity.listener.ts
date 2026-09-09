import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityService } from './activity.service';
import {Events} from '../common/event';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  CommentCreatedEvent,
  AttachmentUploadedEvent,
} from '../common/event';

@Injectable()
export class ActivityListener {
  constructor(private activityService: ActivityService) {}

  @OnEvent(Events.TASK_CREATED)
  async handleTaskCreated(payload: TaskCreatedEvent) {
    await this.activityService.create({
      workspaceId: payload.workspaceId,
      actorId: payload.actorId,
      action: Events.TASK_CREATED,
      entityType: 'task',
      entityId: payload.taskId,
      description: `created task "${payload.taskTitle}"`,
    });
  }

  @OnEvent(Events.TASK_MOVED)
  async handleTaskMoved(payload: TaskMovedEvent) {
    await this.activityService.create({
      workspaceId: payload.workspaceId,
      actorId: payload.actorId,
      action: Events.TASK_MOVED,
      entityType: 'task',
      entityId: payload.taskId,
      description: `moved task "${payload.taskTitle}"`,
    });
  }

  @OnEvent(Events.COMMENT_CREATED)
  async handleCommentCreated(payload: CommentCreatedEvent) {
    await this.activityService.create({
      workspaceId: payload.workspaceId,
      actorId: payload.actorId,
      action: Events.COMMENT_CREATED,
      entityType: 'comment',
      entityId: payload.commentId,
      description: `commented on task "${payload.taskTitle}"`,
    });
  }

  @OnEvent(Events.ATTACHMENT_UPLOADED)
  async handleAttachmentUploaded(payload: AttachmentUploadedEvent) {
    await this.activityService.create({
      workspaceId: payload.workspaceId,
      actorId: payload.actorId,
      action: Events.ATTACHMENT_UPLOADED,
      entityType: 'attachment',
      entityId: payload.attachmentId,
      description: `uploaded an attachment on task "${payload.taskTitle}"`,
    });
  }
}