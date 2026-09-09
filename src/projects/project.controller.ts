import { Get, Post, Body, Controller, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

/**
 * Exposes routes for listing and creating projects within a workspace.
 */
@Controller('workspaces/:workspaceId')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  /**
   * Lists all projects under the given workspace. Open route, no auth required.
   * @param workspaceId - The parent workspace's UUID.
   * @returns An array of Project entities.
   * @throws {NotFoundException} If the workspace doesn't exist.
   */
  @Get('projects')
  async getProjectsByWorkspaceId(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.projectService.findProjectsByWorkspaceById(workspaceId);
  }

  /**
   * Creates a new project under the given workspace. Admin-only.
   * @param workspaceId - The parent workspace's UUID.
   * @param dto - Contains the new project's name.
   * @returns The newly created Project entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   * @throws {NotFoundException} If the workspace doesn't exist.
   */
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