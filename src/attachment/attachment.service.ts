import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Attachment, AttachmentDocument } from './schema/attachment.schema';
import { Task } from '../task/entity/task.entity';
import { Events } from '../common/event';

/**
 * Handles attachment creation and lookup for tasks. Attachment metadata
 * lives in Mongo (see AttachmentDocument) while the underlying file lives
 * on disk (see multer.config.ts) and the parent Task lives in Postgres.
 */
@Injectable()
export class AttachmentService {
  constructor(
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Records a newly uploaded file against a task. Emits an
   * ATTACHMENT_UPLOADED event after saving.
   * @param taskId - The task's UUID (Postgres).
   * @param workspaceId - The workspace this task belongs to (needed for the event payload).
   * @param uploaderId - The ID of the user uploading the file (the event's actor).
   * @param file - The file as written to disk by Multer.
   * @returns The newly created Attachment document.
   * @throws {NotFoundException} If the task doesn't exist.
   */
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

  /**
   * Lists all attachments on a given task, oldest first.
   * @param taskId - The task's UUID.
   * @returns An array of Attachment documents, sorted by createdAt ascending.
   */
  async findAttachmentsByTaskId(taskId: string): Promise<Attachment[]> {
    return this.attachmentModel.find({ taskId }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Looks up a single attachment by its Mongo document ID.
   * @param attachmentId - The attachment's Mongo ObjectId (as a string).
   * @returns The matching Attachment document.
   * @throws {NotFoundException} If no attachment with that ID exists.
   */
  async findAttachmentById(attachmentId: string): Promise<Attachment> {
    let attachment: AttachmentDocument | null;
    try {
      attachment = await this.attachmentModel.findById(attachmentId).exec();
    } catch (err) {
      throw new NotFoundException('Attachment not found');
    }
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }
}