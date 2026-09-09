import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './entity/notification.entity';

/**
 * Handles notification creation and per-user lookup/read-state updates.
 * Notifications are created internally by NotificationListener in
 * response to domain events; there's no public create route.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Creates a new notification document. Intended to be called by
   * NotificationListener, not exposed directly via a controller route.
   * @param data - Partial notification fields (recipientId, actorId, workspaceId, taskId, type, message).
   * @returns The newly created Notification document.
   */
  async create(data: Partial<Notification>) {
    return this.notificationModel.create(data);
  }

  /**
   * Lists all notifications for a given user, newest first.
   * @param userId - The recipient's user ID.
   * @returns An array of Notification documents belonging to that user.
   */
  async findAllForUser(userId: string) {
    return this.notificationModel
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Marks a notification as read, verifying it belongs to the caller.
   * @param notificationId - The notification's Mongo ObjectId (as a string).
   * @param userId - The ID of the user attempting to mark it read.
   * @returns The updated Notification document.
   * @throws {NotFoundException} If no notification with that ID exists, or the ID is malformed.
   * @throws {ForbiddenException} If the notification's recipient isn't the calling user.
   */
  async markAsRead(notificationId: string, userId: string) {
    let notification: NotificationDocument | null;

    try {
      notification = await this.notificationModel.findById(notificationId);
    } catch (err) {
      // malformed Mongo ObjectId throws a CastError — treat it the same as "not found"
      throw new NotFoundException('Notification not found');
    }

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException('This notification does not belong to you');
    }

    notification.isRead = true;
    return notification.save();
  }
}