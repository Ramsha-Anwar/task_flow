import { Get, Post, Body, Controller, Param, UseGuards } from '@nestjs/common';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId')
export class ColumnController {
  constructor(private columnService: ColumnService) {}

  @Get('columns')
  async getColumnsByBoardId(@Param('boardId') boardId: string) {
    return this.columnService.findColumnsByBoardId(boardId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('columns')
  async createColumn(@Param('boardId') boardId: string, @Body() dto: CreateColumnDto) {
    return this.columnService.createColumn(dto.name, dto.position, boardId);
  }
}