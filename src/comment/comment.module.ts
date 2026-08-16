import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment, CommentSchema } from './schema/comment.schema';
import { Task } from '../task/entity/task.entity';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    TypeOrmModule.forFeature([Task]),
    WorkspaceModule, // required directly — Nest module imports aren't transitive, per your PR2 notes
  ],
  providers: [CommentService],
  controllers: [CommentController],
})
export class CommentModule {}