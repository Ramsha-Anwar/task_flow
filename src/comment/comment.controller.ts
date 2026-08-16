import { Controller, Post, Get, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';
import { Roles } from '../workspace/roles.decorator';

@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/comments')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Get()
  async getComments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.commentService.findCommentsByTaskId(taskId);
  }

@UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
@Roles('admin', 'member')
@Post()
async createComment(
  @Param('taskId', ParseUUIDPipe) taskId: string,
  @Body() dto: CreateCommentDto,
  @Req() req,
) {
  return this.commentService.createComment(taskId, req.user.id, dto);
}
}