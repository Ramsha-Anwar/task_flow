import { Controller, Post, Body, UseGuards, Req, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspaceRolesGuard } from './workspace-roles.guard';
import { Roles } from './roles.decorator';

/**
 * Exposes routes for creating workspaces, listing a user's own workspaces,
 * fetching a single workspace, and adding members to it.
 */
@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  /**
   * Creates a new workspace with the logged-in user as its first admin.
   * @param dto - Contains the new workspace's name.
   * @param req - The incoming request; req.user.id identifies the creator.
   * @returns The newly created Workspace.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  createWorkspace(@Body() dto: CreateWorkspaceDto, @Req() req) {
    return this.workspaceService.createWorkspace(dto.name, req.user.id);
  }

  /**
   * Lists every workspace the logged-in user belongs to.
   * @param req - The incoming request; req.user.id identifies the requester.
   * @returns An array of Workspace entities.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMyWorkspaces(@Req() req) {
    return this.workspaceService.findWorkspacesByUserId(req.user.id);
  }

  /**
   * Fetches a single workspace by ID. Admin-only.
   * @param workspaceId - The workspace's UUID.
   * @returns The matching Workspace entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Get(':workspaceId')
  getWorkspace(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.workspaceService.findWorkspaceById(workspaceId);
  }

  /**
   * Adds a new member to a workspace. Admin-only.
   * @param workspaceId - The workspace to add the member to.
   * @param dto - Contains the userId to add and the role to assign.
   * @returns The newly created WorkspaceMember record.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   * @throws {NotFoundException} If the workspace doesn't exist.
   * @throws {BadRequestException} If the target user is already a member.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post(':workspaceId/members')
  addMember(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(workspaceId, dto);
  }
}