/**
 * @fileoverview Unit test suite for ActivityListener.
 * Validates domain event consumption and subsequent creation of audit log entries
 * within the ActivityService.
 *
 * @module test/unit/activity.listener.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActivityListener } from '../../src/activity/activity.listener';
import { ActivityService } from '../../src/activity/activity.service';
import { Events } from '../../src/common/event';
import {
  TaskCreatedEvent,
  TaskMovedEvent,
  CommentCreatedEvent,
  AttachmentUploadedEvent,
} from '../../src/common/event';

describe('ActivityListener', () => {
  let listener: ActivityListener;
  let activityService: jest.Mocked<ActivityService>;

  beforeEach(async () => {
    const mockActivityService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityListener,
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    listener = module.get<ActivityListener>(ActivityListener);
    activityService = module.get(ActivityService);
  });

  describe('handleTaskCreated', () => {
    const eventPayload: TaskCreatedEvent = {
      taskId: 'task-1',
      taskTitle: 'Build Feature',
      workspaceId: 'ws-1',
      boardId: 'brd-1',
      columnId: 'col-1',
      assigneeId: 'user-b',
      actorId: 'user-a',
    };

    /**
     * @test Verifies that the task.created domain event creates a corresponding
     * activity log record specifying the workspace, actor, entity details, and human-readable description.
     */
    it('should log task.created activity', async () => {
      await listener.handleTaskCreated(eventPayload);

      expect(activityService.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-a',
        action: Events.TASK_CREATED,
        entityType: 'task',
        entityId: 'task-1',
        description: 'created task "Build Feature"',
      });
    });
  });

  describe('handleTaskMoved', () => {
    const eventPayload: TaskMovedEvent = {
      taskId: 'task-1',
      taskTitle: 'Build Feature',
      workspaceId: 'ws-1',
      boardId: 'brd-1',
      fromColumnId: 'col-1',
      toColumnId: 'col-2',
      assigneeId: 'user-b',
      actorId: 'user-a',
    };

    /**
     * @test Verifies that the task.moved domain event creates an audit record
     * tracking column transitions.
     */
    it('should log task.moved activity', async () => {
      await listener.handleTaskMoved(eventPayload);

      expect(activityService.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-a',
        action: Events.TASK_MOVED,
        entityType: 'task',
        entityId: 'task-1',
        description: 'moved task "Build Feature"',
      });
    });
  });

  describe('handleCommentCreated', () => {
    const eventPayload: CommentCreatedEvent = {
      commentId: 'cmt-1',
      taskId: 'task-1',
      taskTitle: 'Build Feature',
      workspaceId: 'ws-1',
      assigneeId: 'user-b',
      actorId: 'user-a',
    };

    /**
     * @test Verifies that the comment.created domain event produces an activity log entry
     * for newly posted comments.
     */
    it('should log comment.created activity', async () => {
      await listener.handleCommentCreated(eventPayload);

      expect(activityService.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-a',
        action: Events.COMMENT_CREATED,
        entityType: 'comment',
        entityId: 'cmt-1',
        description: 'commented on task "Build Feature"',
      });
    });
  });

  describe('handleAttachmentUploaded', () => {
    const eventPayload: AttachmentUploadedEvent = {
      attachmentId: 'att-1',
      taskId: 'task-1',
      taskTitle: 'Build Feature',
      workspaceId: 'ws-1',
      assigneeId: 'user-b',
      actorId: 'user-a',
    };

    /**
     * @test Verifies that the attachment.uploaded domain event records file upload activity
     * linked to the parent task.
     */
    it('should log attachment.uploaded activity', async () => {
      await listener.handleAttachmentUploaded(eventPayload);

      expect(activityService.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-a',
        action: Events.ATTACHMENT_UPLOADED,
        entityType: 'attachment',
        entityId: 'att-1',
        description: 'uploaded an attachment on task "Build Feature"',
      });
    });
  });
});
