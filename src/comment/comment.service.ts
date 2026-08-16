import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentDocument } from './schema/comment.schema';
import { Task } from '../task/entity/task.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async createComment(taskId: string, authorId: string, dto: CreateCommentDto): Promise<Comment> {
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
    return comment.save();
  }

  async findCommentsByTaskId(taskId: string): Promise<Comment[]> {
    return this.commentModel.find({ taskId }).sort({ createdAt: 1 }).exec();
  }
}