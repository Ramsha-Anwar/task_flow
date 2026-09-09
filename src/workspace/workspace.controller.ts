import { Controller, Post, Body, UseGuards, Req, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspaceRolesGuard } from './workspace-roles.guard';
import { Roles } from './roles.decorator';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  createWorkspace(@Body() dto: CreateWorkspaceDto, @Req() req) {
    return this.workspaceService.createWorkspace(dto.name, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMyWorkspaces(@Req() req) {
    return this.workspaceService.findWorkspacesByUserId(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Get(':workspaceId')
  getWorkspace(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.workspaceService.findWorkspaceById(workspaceId);
  }

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