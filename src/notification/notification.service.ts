import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './entity/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: Partial<Notification>) {
    return this.notificationModel.create(data);
  }

  async findAllForUser(userId: string) {
    return this.notificationModel
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

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