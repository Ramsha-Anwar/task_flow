import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Attachment, AttachmentDocument } from './schema/attachment.schema';
import { Task } from '../task/entity/task.entity';
import { Events } from '../common/event';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createAttachment(
    taskId: string,
    workspaceId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ): Promise<Attachment> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const attachment = new this.attachmentModel({
      taskId,
      uploaderId,
      originalName: file.originalname,
      storedFileName: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
    });
    const savedAttachment = await attachment.save();

    this.eventEmitter.emit(Events.ATTACHMENT_UPLOADED, {
      attachmentId: savedAttachment._id.toString(),
      taskId: task.id,
      taskTitle: task.title,
      workspaceId,
      assigneeId: task.assigneeId,
      actorId: uploaderId,
    });

    return savedAttachment;
  }

  async findAttachmentsByTaskId(taskId: string): Promise<Attachment[]> {
    return this.attachmentModel.find({ taskId }).sort({ createdAt: 1 }).exec();
  }

  async findAttachmentById(attachmentId: string): Promise<Attachment> {
    const attachment = await this.attachmentModel.findById(attachmentId).exec();
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }
}