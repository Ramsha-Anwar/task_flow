import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Comment, CommentDocument } from './schema/comment.schema';
import { Task } from '../task/entity/task.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Events } from '../common/event';

/**
 * Handles comment creation and lookup for tasks. Comments live in Mongo
 * (see CommentDocument) while the Task they belong to lives in Postgres,
 * so creation cross-checks the task's existence before writing. Emits a
 * COMMENT_CREATED event after saving so Notification and ActivityLog
 * listeners (see NotificationListener, ActivityListener) can react.
 */
@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new comment on the given task. Emits a COMMENT_CREATED
   * event after saving.
   * @param taskId - The task's UUID (Postgres).
   * @param workspaceId - The workspace this task belongs to (needed for the event payload).
   * @param authorId - The ID of the user posting the comment (the event's actor).
   * @param dto - Contains the comment's text.
   * @returns The newly created Comment document.
   * @throws {NotFoundException} If the task doesn't exist.
   */
  async createComment(
    taskId: string,
    workspaceId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    // check the task actually exists in Postgres before saving into Mongo
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comment = new this.commentModel({
      taskId,
      authorId,
      text: dto.text,
    });
    const savedComment = await comment.save();

    this.eventEmitter.emit(Events.COMMENT_CREATED, {
      commentId: savedComment._id.toString(),
      taskId: task.id,
      taskTitle: task.title,
      workspaceId,
      assigneeId: task.assigneeId,
      actorId: authorId,
    });

    return savedComment;
  }

  /**
   * Lists all comments on a given task, oldest first.
   * @param taskId - The task's UUID.
   * @returns An array of Comment documents, sorted by createdAt ascending.
   */
  async findCommentsByTaskId(taskId: string): Promise<Comment[]> {
    return this.commentModel.find({ taskId }).sort({ createdAt: 1 }).exec();
  }
}