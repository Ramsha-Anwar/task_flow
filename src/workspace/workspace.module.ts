import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Workspace} from './entity/workspace.entity';
import {WorkspaceMember} from './entity/workspace-member.entity';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceRolesGuard } from './workspace-roles.guard';
@Module({
  imports: [TypeOrmModule.forFeature([Workspace, WorkspaceMember])],
  providers: [WorkspaceService, WorkspaceRolesGuard],
  exports: [WorkspaceService, WorkspaceRolesGuard, TypeOrmModule],
  controllers: [WorkspaceController]
})
export class WorkspaceModule {}