import { Get, Post, Body, Controller, Param, UseGuards } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

@Controller('workspaces/:workspaceId/projects/:projectId')
export class BoardController {
  constructor(private boardService: BoardService) {}

  @Get('boards')
  async getBoardsByProjectId(@Param('projectId') projectId: string) {
    return this.boardService.findBoardsByProjectId(projectId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('boards')
  async createBoard(@Param('projectId') projectId: string, @Body() dto: CreateBoardDto) {
    return this.boardService.createBoard(dto.name, projectId);
  }
}