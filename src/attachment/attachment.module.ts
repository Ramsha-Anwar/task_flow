import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment, AttachmentSchema } from './schema/attachment.schema';
import { Task } from '../task/entity/task.entity';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Attachment.name, schema: AttachmentSchema }]),
    TypeOrmModule.forFeature([Task]),
    WorkspaceModule,
  ],
  providers: [AttachmentService],
  controllers: [AttachmentController],
})
export class AttachmentModule {}