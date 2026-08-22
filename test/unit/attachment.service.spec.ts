/**
 * @fileoverview Unit test suite for AttachmentService.
 * Isolates MongoDB Attachment schema operations, TypeORM Task existence checks,
 * and ATTACHMENT_UPLOADED event emissions.
 *
 * @module test/unit/attachment.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { AttachmentService } from '../../src/attachment/attachment.service';
import { Attachment } from '../../src/attachment/schema/attachment.schema';
import { Task } from '../../src/task/entity/task.entity';
import { Events } from '../../src/common/event';
import { TaskPriority } from '../../src/task/entity/task-priority.enum';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockAttachmentModel: any;

  /**
   * Mock instance of a Task entity.
   */
  const mockTask: Task = {
    id: 'task-uuid-1',
    title: 'Attachment Test Task',
    description: 'Desc',
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    columnId: 'col-uuid-1',
    assigneeId: 'assignee-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    column: {} as any,
    assignee: {} as any,
  };

  /**
   * Mock instance of a persisted Mongo Attachment document.
   */
  const mockSavedAttachment = {
    _id: { toString: () => 'attachment-mongo-id-1' },
    taskId: 'task-uuid-1',
    uploaderId: 'uploader-uuid-1',
    originalName: 'report.pdf',
    storedFileName: 'stored-123.pdf',
    filePath: 'uploads/stored-123.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockAttachmentModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: { toString: () => 'attachment-mongo-id-1' },
      save: jest.fn().mockResolvedValue(mockSavedAttachment),
    }));

    mockAttachmentModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockSavedAttachment]),
      }),
    });

    mockAttachmentModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSavedAttachment),
    });

    const mockTaskRepo = {
      findOne: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        {
          provide: getModelToken(Attachment.name),
          useValue: mockAttachmentModel,
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

    service = module.get<AttachmentService>(AttachmentService);
    taskRepo = module.get(getRepositoryToken(Task));
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createAttachment', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      destination: './uploads',
      filename: 'stored-123.pdf',
      path: 'uploads/stored-123.pdf',
      buffer: Buffer.from('test'),
      stream: null as any,
    };

    /**
     * @test Verifies that an uploaded file is persisted in MongoDB and triggers
     * the ATTACHMENT_UPLOADED domain event with accurate payload metadata.
     */
    it('should create attachment and emit ATTACHMENT_UPLOADED event', async () => {
      taskRepo.findOne.mockResolvedValue(mockTask);

      const result = await service.createAttachment(
        'task-uuid-1',
        'ws-uuid-1',
        'uploader-uuid-1',
        mockFile,
      );

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.ATTACHMENT_UPLOADED,
        {
          attachmentId: 'attachment-mongo-id-1',
          taskId: mockTask.id,
          taskTitle: mockTask.title,
          workspaceId: 'ws-uuid-1',
          assigneeId: mockTask.assigneeId,
          actorId: 'uploader-uuid-1',
        },
      );
      expect(result).toEqual(mockSavedAttachment);
    });

    /**
     * @test Verifies that attempting to attach a file to a non-existent task throws NotFoundException.
     */
    it('should throw NotFoundException if task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createAttachment(
          'unknown-task',
          'ws-uuid-1',
          'uploader-uuid-1',
          mockFile,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findAttachmentsByTaskId', () => {
    /**
     * @test Verifies retrieving all attachments associated with a given task ID.
     */
    it('should return attachments for task', async () => {
      const result = await service.findAttachmentsByTaskId('task-uuid-1');

      expect(mockAttachmentModel.find).toHaveBeenCalledWith({
        taskId: 'task-uuid-1',
      });
      expect(result).toEqual([mockSavedAttachment]);
    });
  });

  describe('findAttachmentById', () => {
    /**
     * @test Verifies fetching a single attachment document by its MongoDB ObjectId.
     */
    it('should return attachment when found', async () => {
      const result = await service.findAttachmentById('attachment-mongo-id-1');

      expect(mockAttachmentModel.findById).toHaveBeenCalledWith(
        'attachment-mongo-id-1',
      );
      expect(result).toEqual(mockSavedAttachment);
    });

    /**
     * @test Verifies throwing NotFoundException when document is not found.
     */
    it('should throw NotFoundException if attachment not found', async () => {
      mockAttachmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findAttachmentById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    /**
     * @test Verifies throwing NotFoundException if MongoDB throws an error (e.g. invalid ObjectId format).
     */
    it('should throw NotFoundException on findById error', async () => {
      mockAttachmentModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('CastError')),
      });

      await expect(service.findAttachmentById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
