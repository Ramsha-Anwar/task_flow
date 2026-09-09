import { Get, Post, Body, Controller, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

/**
 * Exposes routes for listing and creating columns within a board.
 */
@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId')
export class ColumnController {
  constructor(private columnService: ColumnService) {}

  /**
   * Lists all columns under the given board. Open route, no auth required.
   * @param boardId - The parent board's UUID.
   * @returns An array of Columns entities.
   * @throws {NotFoundException} If the board doesn't exist.
   */
  @Get('columns')
  async getColumnsByBoardId(@Param('boardId', ParseUUIDPipe) boardId: string) {
    return this.columnService.findColumnsByBoardId(boardId);
  }

  /**
   * Creates a new column under the given board. Admin-only.
   * @param boardId - The parent board's UUID.
   * @param dto - Contains the new column's name and position.
   * @returns The newly created Columns entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   * @throws {NotFoundException} If the board doesn't exist.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('columns')
  async createColumn(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnService.createColumn(dto.name, dto.position, boardId);
  }
}