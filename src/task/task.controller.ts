import { Get, Post, Patch, Body, Controller, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

/**
 * Exposes routes for listing tasks in a column, creating a task,
 * and moving a task to a different column.
 */
@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId')
export class TaskController {
  constructor(private taskService: TaskService) {}

  /**
   * Lists all tasks in the given column. Open route, no auth required.
   * @param columnId - The parent column's UUID.
   * @returns An array of Task entities.
   * @throws {NotFoundException} If the column doesn't exist.
   */
  @Get('tasks')
  async getTasksByColumnId(@Param('columnId', ParseUUIDPipe) columnId: string) {
    return this.taskService.findTasksByColumnId(columnId);
  }

  /**
   * Creates a new task in the given column. Admin-only.
   * @param columnId - The parent column's UUID.
   * @param workspaceId - The parent workspace's UUID.
   * @param dto - Task details: title, description, priority, dueDate, assigneeId.
   * @param req - The incoming request; req.user.id identifies the creator (event actor).
   * @returns The newly created Task entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member, or isn't an admin.
   * @throws {NotFoundException} If the column doesn't exist.
   * @throws {BadRequestException} If the assignee isn't a member of this workspace.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('tasks')
  async createTask(
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateTaskDto,
    @Req() req,
  ) {
    return this.taskService.createTask(columnId, workspaceId, dto, req.user.id);
  }

  /**
   * Moves a task to a different column on the same board. Admin-only.
   * @param taskId - The task to move.
   * @param workspaceId - The parent workspace's UUID.
   * @param dto - Contains the targetColumnId to move the task into.
   * @param req - The incoming request; req.user.id identifies who moved it (event actor).
   * @returns The updated Task entity.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member/admin, or the target column is on a different board.
   * @throws {NotFoundException} If the task, current column, or target column doesn't exist.
   */
  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Patch('tasks/:taskId/move')
  async moveTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: MoveTaskDto,
    @Req() req,
  ) {
    return this.taskService.moveTask(taskId, workspaceId, dto, req.user.id);
  }
}