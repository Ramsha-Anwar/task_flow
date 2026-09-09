import { Get, Post, Body, Controller, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

@Controller('workspaces/:workspaceId')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Get('projects')
  async getProjectsByWorkspaceId(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.projectService.findProjectsByWorkspaceById(workspaceId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('projects')
  async createProject(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(dto.name, workspaceId);
  }
}