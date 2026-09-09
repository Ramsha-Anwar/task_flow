/**
 * @fileoverview Unit test suite for NotificationService.
 * Validates document creation, per-user notification isolation, and authorization
 * on marking notifications as read.
 *
 * @module test/unit/notification.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from '../../src/notification/notification.service';
import { Notification } from '../../src/notification/entity/notification.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotificationModel: any;

  /**
   * Mock instance of a Notification MongoDB document.
   */
  const mockNotificationDoc = {
    _id: 'notif-mongo-id-1',
    recipientId: 'recipient-user-1',
    actorId: 'actor-user-1',
    workspaceId: 'ws-1',
    taskId: 'task-1',
    type: 'TASK_ASSIGNED',
    message: 'You were assigned',
    isRead: false,
    save: jest.fn().mockResolvedValue({
      _id: 'notif-mongo-id-1',
      recipientId: 'recipient-user-1',
      isRead: true,
    }),
  };

  beforeEach(async () => {
    mockNotificationModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockNotificationDoc]),
        }),
      }),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    /**
     * @test Verifies creating and returning a new Notification document.
     */
    it('should create a notification document', async () => {
      mockNotificationModel.create.mockResolvedValue(mockNotificationDoc);

      const payload = {
        recipientId: 'recipient-user-1',
        actorId: 'actor-user-1',
        type: 'TASK_ASSIGNED',
        message: 'You were assigned',
      };

      const result = await service.create(payload);

      expect(mockNotificationModel.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockNotificationDoc);
    });
  });

  describe('findAllForUser', () => {
    /**
     * @test Verifies fetching all notifications scoped to a specific recipient user ID.
     */
    it('should return all notifications for user', async () => {
      const result = await service.findAllForUser('recipient-user-1');

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        recipientId: 'recipient-user-1',
      });
      expect(result).toEqual([mockNotificationDoc]);
    });
  });

  describe('markAsRead', () => {
    /**
     * @test Verifies that the recipient can mark their own notification as read.
     */
    it('should mark notification as read for recipient', async () => {
      mockNotificationModel.findById.mockResolvedValue(mockNotificationDoc);

      const result = await service.markAsRead(
        'notif-mongo-id-1',
        'recipient-user-1',
      );

      expect(mockNotificationModel.findById).toHaveBeenCalledWith(
        'notif-mongo-id-1',
      );
      expect(mockNotificationDoc.save).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    /**
     * @test Verifies throwing NotFoundException when notification is not found.
     */
    it('should throw NotFoundException if notification does not exist', async () => {
      mockNotificationModel.findById.mockResolvedValue(null);

      await expect(
        service.markAsRead('unknown-id', 'recipient-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Verifies throwing NotFoundException when findById fails with CastError.
     */
    it('should throw NotFoundException on invalid Mongo ID error', async () => {
      mockNotificationModel.findById.mockRejectedValue(
        new Error('Cast to ObjectId failed'),
      );

      await expect(
        service.markAsRead('invalid-id', 'recipient-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Verifies throwing ForbiddenException when caller is not the recipient of the notification.
     */
    it('should throw ForbiddenException if user is not the recipient', async () => {
      mockNotificationModel.findById.mockResolvedValue(mockNotificationDoc);

      await expect(
        service.markAsRead('notif-mongo-id-1', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
