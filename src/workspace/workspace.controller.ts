import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  createWorkspace(@Body() dto: CreateWorkspaceDto, @Req() req) {
    return this.workspaceService.createWorkspace(dto.name, req.user.id);
  }
}