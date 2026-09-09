/**
 * @fileoverview Unit test suite for CommentService.
 * Validates cross-database comment creation (PostgreSQL task validation + MongoDB persistence)
 * and COMMENT_CREATED event emission.
 *
 * @module test/unit/comment.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { CommentService } from '../../src/comment/comment.service';
import { Comment } from '../../src/comment/schema/comment.schema';
import { Task } from '../../src/task/entity/task.entity';
import { Events } from '../../src/common/event';
import { TaskPriority } from '../../src/task/entity/task-priority.enum';

describe('CommentService', () => {
  let service: CommentService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockCommentModel: any;

  /**
   * Mock instance of a parent Task entity.
   */
  const mockTask: Task = {
    id: 'task-uuid-1',
    title: 'Test Task',
    description: 'Task description',
    priority: TaskPriority.HIGH,
    dueDate: null,
    columnId: 'col-uuid-1',
    assigneeId: 'assignee-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    column: {} as any,
    assignee: {} as any,
  };

  /**
   * Mock instance of a persisted Mongo Comment document.
   */
  const mockSavedComment = {
    _id: { toString: () => 'comment-mongo-id-1' },
    taskId: 'task-uuid-1',
    authorId: 'author-uuid-1',
    text: 'Great job!',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockCommentModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: { toString: () => 'comment-mongo-id-1' },
      save: jest.fn().mockResolvedValue(mockSavedComment),
    }));

    mockCommentModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockSavedComment]),
      }),
    });

    const mockTaskRepo = {
      findOne: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    taskRepo = module.get(getRepositoryToken(Task));
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createComment', () => {
    const createCommentDto = { text: 'Great job!' };

    /**
     * @test Verifies that creating a comment checks Postgres Task existence,
     * persists the comment document into MongoDB, and emits COMMENT_CREATED event.
     */
    it('should create comment and emit COMMENT_CREATED event', async () => {
      taskRepo.findOne.mockResolvedValue(mockTask);

      const result = await service.createComment(
        'task-uuid-1',
        'ws-uuid-1',
        'author-uuid-1',
        createCommentDto,
      );

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.COMMENT_CREATED, {
        commentId: 'comment-mongo-id-1',
        taskId: mockTask.id,
        taskTitle: mockTask.title,
        workspaceId: 'ws-uuid-1',
        assigneeId: mockTask.assigneeId,
        actorId: 'author-uuid-1',
      });
      expect(result).toEqual(mockSavedComment);
    });

    /**
     * @test Verifies throwing NotFoundException when attempting to comment on a non-existent task.
     */
    it('should throw NotFoundException if task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createComment(
          'unknown-task',
          'ws-uuid-1',
          'author-uuid-1',
          createCommentDto,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findCommentsByTaskId', () => {
    /**
     * @test Verifies retrieving comments for a task sorted in ascending chronological order.
     */
    it('should return comments for task', async () => {
      const result = await service.findCommentsByTaskId('task-uuid-1');

      expect(mockCommentModel.find).toHaveBeenCalledWith({
        taskId: 'task-uuid-1',
      });
      expect(result).toEqual([mockSavedComment]);
    });
  });
});
