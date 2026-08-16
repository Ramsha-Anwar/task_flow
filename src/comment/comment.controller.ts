import { Controller, Post, Get, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';
import { Roles } from '../workspace/roles.decorator';

/**
 * Exposes routes for listing and creating comments on a task.
 */
@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/comments')
export class CommentController {
  constructor(private commentService: CommentService) {}

  /**
   * Lists all comments on the given task, oldest first. Open route, no auth required.
   * @param taskId - The parent task's UUID.
   * @returns An array of Comment documents.
   */
  @Get()
  async getComments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.commentService.findCommentsByTaskId(taskId);
  }

  /**
   * Creates a new comment on the given task. Any workspace member or admin may comment.
   * @param taskId - The parent task's UUID.
   * @param workspaceId - The parent workspace's UUID.
   * @param dto - Contains the comment's text.
   * @param req - The incoming request; req.user.id identifies the comment's author.
   * @returns The newly created Comment document.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member of the workspace.
   * @throws {NotFoundException} If the task doesn't exist.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin', 'member')
  @Post()
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateCommentDto,
    @Req() req,
  ) {
    return this.commentService.createComment(taskId, workspaceId, req.user.id, dto);
  }
}