/**
 * @fileoverview Unit test suite for NotificationListener.
 * Tests handling of domain events (task.created, task.moved, comment.created, attachment.uploaded)
 * and verifies self-notification suppression logic.
 *
 * @module test/unit/notification.listener.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationListener } from '../../src/notification/notification.listener';
import { NotificationService } from '../../src/notification/notification.service';
import {
  TaskCreatedEvent,
  TaskMovedEvent,
  CommentCreatedEvent,
  AttachmentUploadedEvent,
} from '../../src/common/event';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockNotificationService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    listener = module.get<NotificationListener>(NotificationListener);
    notificationService = module.get(NotificationService);
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
     * @test Verifies that assigning a task to another user creates a TASK_ASSIGNED notification.
     */
    it('should create notification for assignee', async () => {
      await listener.handleTaskCreated(eventPayload);

      expect(notificationService.create).toHaveBeenCalledWith({
        recipientId: 'user-b',
        actorId: 'user-a',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        type: 'TASK_ASSIGNED',
        message: 'You were assigned to "Build Feature"',
      });
    });

    /**
     * @test Verifies self-notification suppression when actor assigns a task to themselves.
     */
    it('should skip notification when actor is assignee', async () => {
      await listener.handleTaskCreated({
        ...eventPayload,
        actorId: 'user-b',
      });

      expect(notificationService.create).not.toHaveBeenCalled();
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
     * @test Verifies creating a TASK_MOVED notification for the assignee when another user moves their task.
     */
    it('should create notification for assignee on move', async () => {
      await listener.handleTaskMoved(eventPayload);

      expect(notificationService.create).toHaveBeenCalledWith({
        recipientId: 'user-b',
        actorId: 'user-a',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        type: 'TASK_MOVED',
        message: '"Build Feature" was moved',
      });
    });

    /**
     * @test Verifies self-notification suppression when the assignee moves their own task.
     */
    it('should skip notification when actor is assignee on move', async () => {
      await listener.handleTaskMoved({
        ...eventPayload,
        actorId: 'user-b',
      });

      expect(notificationService.create).not.toHaveBeenCalled();
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
     * @test Verifies creating a COMMENT_ADDED notification for the task assignee.
     */
    it('should create notification for assignee on new comment', async () => {
      await listener.handleCommentCreated(eventPayload);

      expect(notificationService.create).toHaveBeenCalledWith({
        recipientId: 'user-b',
        actorId: 'user-a',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        type: 'COMMENT_ADDED',
        message: 'New comment on "Build Feature"',
      });
    });

    /**
     * @test Verifies self-notification suppression when commenting on own task.
     */
    it('should skip notification when actor is assignee on comment', async () => {
      await listener.handleCommentCreated({
        ...eventPayload,
        actorId: 'user-b',
      });

      expect(notificationService.create).not.toHaveBeenCalled();
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
     * @test Verifies creating an ATTACHMENT_ADDED notification for the task assignee.
     */
    it('should create notification for assignee on new attachment', async () => {
      await listener.handleAttachmentUploaded(eventPayload);

      expect(notificationService.create).toHaveBeenCalledWith({
        recipientId: 'user-b',
        actorId: 'user-a',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        type: 'ATTACHMENT_ADDED',
        message: 'New attachment on "Build Feature"',
      });
    });

    /**
     * @test Verifies self-notification suppression when uploader is assignee.
     */
    it('should skip notification when actor is assignee on attachment upload', async () => {
      await listener.handleAttachmentUploaded({
        ...eventPayload,
        actorId: 'user-b',
      });

      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });
});
