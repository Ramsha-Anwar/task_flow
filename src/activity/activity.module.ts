import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from './entity/activity-log.entity';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityListener } from './activity.listener';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ActivityLog.name, schema: ActivityLogSchema }]),
    WorkspaceModule, // needed because ActivityController uses WorkspaceRolesGuard — remember the PR2 DI bug
  ],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityListener],
})
export class ActivityModule {}