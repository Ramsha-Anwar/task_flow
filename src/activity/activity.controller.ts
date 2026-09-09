import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';
import { Roles } from '../workspace/roles.decorator';
import { ActivityService } from './activity.service';

@Controller('workspaces/:workspaceId/activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin', 'member')
  findForWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.activityService.findAllForWorkspace(workspaceId);
  }
}