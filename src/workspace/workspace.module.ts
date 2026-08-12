import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Workspace} from './entity/workspace.entity';
import {WorkspaceMember} from './entity/workspace-member.entity';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Workspace,WorkspaceMember])],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
  controllers: [WorkspaceController]
})
export class WorkspaceModule {}
