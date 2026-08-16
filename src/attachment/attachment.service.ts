import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment, AttachmentDocument } from './schema/attachment.schema';
import { Task } from '../task/entity/task.entity';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async createAttachment(
    taskId: string,
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
    return attachment.save();
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