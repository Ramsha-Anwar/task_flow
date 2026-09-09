import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Columns } from '../column/entity/column.entity';
import { WorkspaceMember } from '../workspace/entity/workspace-member.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Columns, WorkspaceMember]),
    WorkspaceModule, 
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}