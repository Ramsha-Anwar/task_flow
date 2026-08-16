import { Get, Post, Body, Controller, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

/**
 * Exposes routes for listing and creating boards within a project.
 */
@Controller('workspaces/:workspaceId/projects/:projectId')
export class BoardController {
  constructor(private boardService: BoardService) {}

  /**
   * Lists all boards under the given project. Open route, no auth required.
   * @param projectId - The parent project's UUID.
   * @returns An array of Board entities.
   * @throws {NotFoundException} If the project doesn't exist.
   */
  @Get('boards')
  async getBoardsByProjectId(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.boardService.findBoardsByProjectId(projectId);
  }

  /**
   * Creates a new board under the given project. Admin-only.
   * @param projectId - The parent project's UUID.
   * @param dto - Contains the new board's name.
   * @returns The newly created Board entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   * @throws {NotFoundException} If the project doesn't exist.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('boards')
  async createBoard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardService.createBoard(dto.name, projectId);
  }
}